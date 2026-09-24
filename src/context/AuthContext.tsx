import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    fetchSignInMethodsForEmail,
    User,
} from 'firebase/auth';
import { collection, query, where, getDocs, limit, setDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const ADMIN_EMAILS = ['theseeksacademyfta@gmail.com', 'iftikharzahid@outlook.com', 'iftikharxahid@gmail.com'];

// ── Types ──────────────────────────────────────────────────────────────────────
export interface AdminProfile {
    fullname: string;
    email: string;
    image?: string;
    role?: string;
}

interface AuthCtx {
    user: User | null;
    profile: AdminProfile | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthCtx | null>(null);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<AdminProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Mirror the same profile-fetch logic as mobile authSlice.fetchUserProfile
    const fetchProfile = async (firebaseUser: User): Promise<boolean> => {
        const email = firebaseUser.email?.toLowerCase() || '';
        let isAdmin = ADMIN_EMAILS.includes(email);

        try {
            // 1️⃣ 'profile' collection by email (admin/teacher path used by mobile)
            if (email) {
                const q = query(collection(db, 'profile'), where('email', '==', email));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const data = snap.docs[0].data() as AdminProfile;
                    if (data.role?.toLowerCase() === 'admin') {
                        isAdmin = true;
                    }
                    if (isAdmin) {
                        setProfile(data);
                        return true;
                    }
                }
            }
            // Fallback: just use Firebase Auth display name if admin via email
            if (isAdmin) {
                setProfile({
                    fullname: firebaseUser.displayName || email || 'Admin',
                    email: email || '',
                });
                return true;
            }
        } catch {
            if (isAdmin) {
                setProfile({ fullname: email || 'Admin', email: email || '' });
                return true;
            }
        }
        return false;
    };

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const isAdmin = await fetchProfile(firebaseUser);
                if (isAdmin) {
                    setUser(firebaseUser);
                } else {
                    await signOut(auth);
                    setUser(null);
                    setProfile(null);
                }
            } else {
                setUser(null);
                setProfile(null);
            }
            setLoading(false);
        });
        return unsub;
    }, []);

    const login = async (email: string, password: string) => {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const userEmail = userCredential.user.email?.toLowerCase() || '';

        let isAdmin = ADMIN_EMAILS.includes(userEmail);

        if (!isAdmin) {
            try {
                const q = query(collection(db, 'profile'), where('email', '==', userEmail));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const data = snap.docs[0].data() as AdminProfile;
                    if (data.role?.toLowerCase() === 'admin') {
                        isAdmin = true;
                    }
                } else {
                    // Check if the database is completely empty (new Firebase project)
                    const checkEmptyQ = query(collection(db, 'profile'), limit(1));
                    const checkEmptySnap = await getDocs(checkEmptyQ);
                    
                    if (checkEmptySnap.empty) {
                        // Bootstrap mode: Make this first user an admin automatically
                        isAdmin = true;
                        try {
                            await setDoc(doc(db, 'profile', userCredential.user.uid), {
                                email: userEmail,
                                fullname: 'Super Admin',
                                role: 'admin',
                                createdAt: new Date()
                            });
                        } catch (err) {
                            console.error('Failed to bootstrap first admin:', err);
                        }
                    }
                }
            } catch (e: any) {
                console.error('Error verifying admin role:', e);
                // If Firestore throws an error (e.g. missing permissions, database doesn't exist), 
                // and it's a new setup, we might want to let them in so they can fix it.
                // We'll allow access if the database seems uninitialized.
                if (e.code === 'failed-precondition' || e.code === 'permission-denied' || e.message?.includes('database')) {
                    isAdmin = true;
                }
            }
        }

        if (!isAdmin) {
            await signOut(auth);
            throw { code: 'auth/not-admin', message: 'Access denied: This dashboard is for administrators only.' };
        }
    };

    const logout = async () => {
        await signOut(auth);
    };

    const resetPassword = async (email: string) => {
        const methods = await fetchSignInMethodsForEmail(auth, email.trim());
        if (methods.length === 0) {
            throw { code: 'auth/user-not-found' };
        }
        await sendPasswordResetEmail(auth, email.trim());
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, login, logout, resetPassword }}>
            {children}
        </AuthContext.Provider>
    );
}
