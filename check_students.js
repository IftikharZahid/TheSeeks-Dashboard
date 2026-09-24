import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: 'AIzaSyCT5NbWoisuNzpIAaPcK8dNOpCF9lPx31I',
    projectId: 'theseeksacademy-66d12',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
    console.log('Fetching students...');
    const snap = await getDocs(collection(db, 'users'));
    let hasShortIds = false;
    snap.docs.forEach(d => {
        if (d.id.length < 15 && d.data().role === 'student') {
            console.log(`Student ID: ${d.id}, Name: ${d.data().fullname || d.data().name}`);
            hasShortIds = true;
        }
    });
    if (!hasShortIds) {
        console.log("No students with short IDs found in 'users' collection.");
    }
    process.exit(0);
}

check().catch(console.error);
