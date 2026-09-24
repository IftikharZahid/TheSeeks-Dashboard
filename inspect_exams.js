import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: 'AIzaSyCT5NbWoisuNzpIAaPcK8dNOpCF9lPx31I',
    projectId: 'theseeksacademy-66d12',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
    console.log('Fetching exams...');
    const snap = await getDocs(collection(db, 'exams'));
    const exams = snap.docs.map(d => d.data());
    
    // Group by studentClass
    const classCount = {};
    exams.forEach(e => {
        const cls = e.studentClass || 'undefined';
        classCount[cls] = (classCount[cls] || 0) + 1;
    });
    
    console.log('Exams by class:');
    for (const [cls, count] of Object.entries(classCount)) {
        console.log(`- ${cls}: ${count} exams`);
    }
    
    process.exit(0);
}

check().catch(console.error);
