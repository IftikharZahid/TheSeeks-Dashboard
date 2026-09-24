import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: 'AIzaSyCT5NbWoisuNzpIAaPcK8dNOpCF9lPx31I',
    authDomain: 'theseeksacademy-66d12.firebaseapp.com',
    projectId: 'theseeksacademy-66d12',
    storageBucket: 'theseeksacademy-66d12.firebasestorage.app',
    messagingSenderId: '347515655236',
    appId: '1:347515655236:android:4b126cc598f047ed91d811',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const subjects = [
  { subject: 'Mathematics', instructor: 'Mr. Ali', room: 'Room 101' },
  { subject: 'Physics', instructor: 'Mr. Zahid', room: 'Lab 1' },
  { subject: 'Chemistry', instructor: 'Ms. Fatima', room: 'Lab 2' },
  { subject: 'English', instructor: 'Ms. Ayesha', room: 'Room 102' },
  { subject: 'Urdu', instructor: 'Mr. Tariq', room: 'Room 103' },
  { subject: 'Computer Science', instructor: 'Mr. Usman', room: 'Computer Lab' },
];

const timeSlots = [
  '08:00 - 08:45',
  '08:45 - 09:30',
  '09:30 - 10:15',
  '10:30 - 11:15', // after break
  '11:15 - 12:00',
  '12:00 - 12:45'
];

async function populate() {
    for (const day of days) {
        // Randomly shuffle subjects for this day
        const daySubjects = [...subjects].sort(() => 0.5 - Math.random());
        
        const classes = [];
        for (let i = 0; i < timeSlots.length; i++) {
            classes.push({
                id: `9th_${day}_${i}`,
                class: '9th',
                gender: 'All',
                type: 'LECTURE',
                time: timeSlots[i],
                subject: daySubjects[i].subject,
                instructor: daySubjects[i].instructor,
                room: daySubjects[i].room,
                lectureNo: i + 1,
            });
        }

        const docRef = doc(db, 'timetable', day);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            // remove existing 9th class classes to prevent duplicates
            const existingClasses = (data.classes || []).filter(c => c.class !== '9th');
            await updateDoc(docRef, { classes: [...existingClasses, ...classes] });
        } else {
            await setDoc(docRef, { classes });
        }
        console.log(`Updated timetable for ${day}`);
    }
    console.log("Done!");
    process.exit(0);
}

populate().catch(console.error);
