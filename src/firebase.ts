import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const defaultConfig = {
    apiKey: 'AIzaSyCT5NbWoisuNzpIAaPcK8dNOpCF9lPx31I',
    authDomain: 'theseeksacademy-66d12.firebaseapp.com',
    projectId: 'theseeksacademy-66d12',
    storageBucket: 'theseeksacademy-66d12.firebasestorage.app',
    messagingSenderId: '347515655236',
    appId: '1:347515655236:android:4b126cc598f047ed91d811',
    measurementId: 'G-XXXXXXXXXX',
};

const getFirebaseConfig = () => {
    try {
        const stored = localStorage.getItem('custom_firebase_config');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.apiKey && parsed.projectId) {
                return parsed;
            }
        }
    } catch (e) {
        console.error("Failed to parse custom firebase config:", e);
    }
    return defaultConfig;
};

export const firebaseConfig = getFirebaseConfig();

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Explicitly set persistence to local to ensure offline authentication survival
setPersistence(auth, browserLocalPersistence).catch(console.error);
