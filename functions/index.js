const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Triggered when a notification document is created or updated.
 * It checks if `published` is true. If so, it securely fetches
 * FCM tokens from the 'students' and 'teachers' collections
 * based on the target audience, and sends pushes via sendEachForMulticast.
 */
exports.processNotificationPush = functions.firestore
    .document("notifications/{notificationId}")
    .onWrite(async (change, context) => {
        const afterData = change.after.data();
        const beforeData = change.before.data();

        // If deleted, do nothing
        if (!afterData) return null;

        // Only send if it just became published, or if it was created as published
        const isNowPublished = afterData.published === true;
        const wasPublished = beforeData ? beforeData.published === true : false;

        if (!isNowPublished || wasPublished) {
            console.log("Notification not published or already published. Skipping.");
            return null;
        }

        const { title, description, audience, imageUrl } = afterData;

        // audience is expected to be an array (e.g. ['Teachers', 'Class 8th'])
        if (!audience || !Array.isArray(audience) || audience.length === 0) {
            console.log("No valid audience array found.");
            return null;
        }

        let targetTokens = new Set();

        const addTokensFromSnap = (snap) => {
            snap.forEach(doc => {
                const data = doc.data();
                if (data.fcmToken) targetTokens.add(data.fcmToken);
                if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
                    data.fcmTokens.forEach(t => targetTokens.add(t));
                }
            });
        };

        const studentsRef = db.collection('students');
        const teachersRef = db.collection('teachers');

        for (const aud of audience) {
            if (aud === 'All Users') {
                const sSnap = await studentsRef.get();
                const tSnap = await teachersRef.get();
                addTokensFromSnap(sSnap);
                addTokensFromSnap(tSnap);
                break; // Covers everyone
            } else if (aud === 'Students') {
                const sSnap = await studentsRef.get();
                addTokensFromSnap(sSnap);
            } else if (aud === 'Teachers') {
                const tSnap = await teachersRef.get();
                addTokensFromSnap(tSnap);
            } else if (aud.startsWith('Class ')) {
                // Check both potential field matches (grade vs class)
                const className = aud.replace('Class ', '');
                const snap1 = await studentsRef.where('grade', '==', className).get();
                const snap2 = await studentsRef.where('class', '==', className).get();
                const snap3 = await studentsRef.where('grade', '==', aud).get();
                addTokensFromSnap(snap1);
                addTokensFromSnap(snap2);
                addTokensFromSnap(snap3);
            } else if (aud === '1st Year' || aud === '2nd Year') {
                const snap1 = await studentsRef.where('grade', '==', aud).get();
                const snap2 = await studentsRef.where('class', '==', aud).get();
                addTokensFromSnap(snap1);
                addTokensFromSnap(snap2);
            }
        }

        const tokensArray = Array.from(targetTokens);

        if (tokensArray.length === 0) {
            console.log("No FCM tokens found for the selected audience.");
            await change.after.ref.update({
                'deliveryTracking.failed': 0,
                'deliveryTracking.delivered': 0,
            });
            return null;
        }

        // Strip HTML tags from description for the push notification body
        const plainBody = description ? description.replace(/(<([^>]+)>)/gi, "").substring(0, 150) + (description.length > 150 ? "..." : "") : "Tap to view details.";

        const messageTemplate = {
            notification: {
                title: title || "New Notification",
                body: plainBody,
            },
            data: {
                id: context.params.notificationId,
                ...(imageUrl && { imageUrl }),
            },
        };

        try {
            let successCount = 0;
            let failureCount = 0;

            const chunks = [];
            for (let i = 0; i < tokensArray.length; i += 500) {
                chunks.push(tokensArray.slice(i, i + 500));
            }

            for (const chunk of chunks) {
                const msgChunk = { ...messageTemplate, tokens: chunk };
                const response = await admin.messaging().sendEachForMulticast(msgChunk);
                successCount += response.successCount;
                failureCount += response.failureCount;
            }

            console.log(`Successfully sent to ${successCount} devices. Failed: ${failureCount}.`);

            await change.after.ref.update({
                'deliveryTracking.delivered': successCount,
                'deliveryTracking.failed': failureCount,
                'deliveryTracking.lastSentAt': admin.firestore.FieldValue.serverTimestamp()
            });

            // Update Analytics
            const analyticsRef = db.collection('analytics').doc('notifications');
            await db.runTransaction(async (transaction) => {
                const docSnap = await transaction.get(analyticsRef);
                if (!docSnap.exists) {
                    transaction.set(analyticsRef, { total: 1, delivered: successCount, failed: failureCount, read: 0, opened: 0 });
                } else {
                    const data = docSnap.data();
                    transaction.update(analyticsRef, {
                        total: (data.total || 0) + 1,
                        delivered: (data.delivered || 0) + successCount,
                        failed: (data.failed || 0) + failureCount
                    });
                }
            });

        } catch (error) {
            console.error("Error sending push notification:", error);
            await change.after.ref.update({
                'deliveryTracking.failed': tokensArray.length,
            });
        }

        return null;
    });
