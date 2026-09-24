import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: 'AIzaSyCT5NbWoisuNzpIAaPcK8dNOpCF9lPx31I',
    projectId: 'theseeksacademy-66d12',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanup() {
    console.log('Fetching all exams...');
    const snap = await getDocs(collection(db, 'exams'));
    
    // We filter out duplicates based on rollNo length.
    // Dashboard (Admin panel) uses Firebase Document IDs (20 chars) for rollNo in exams.
    // The duplicated ones created by the Teacher app bug have short roll numbers (like '208', '38').
    const duplicates = snap.docs.filter(d => {
        const data = d.data();
        const rollNo = data.rollNo ? String(data.rollNo).trim() : '';
        return rollNo.length > 0 && rollNo.length < 15;
    });

    console.log(`Found ${duplicates.length} duplicate/invalid records.`);
    
    let deletedCount = 0;
    for (const d of duplicates) {
        const data = d.data();
        console.log(`Deleting ID: ${d.id} | Name: ${data.studentName} | Class: ${data.studentClass} | RollNo: ${data.rollNo}`);
        await deleteDoc(doc(db, 'exams', d.id));
        deletedCount++;
    }
    
    console.log(`Successfully deleted ${deletedCount} duplicate records.`);
    process.exit(0);
}

cleanup().catch(err => {
    console.error('Error during cleanup:', err);
    process.exit(1);
});
