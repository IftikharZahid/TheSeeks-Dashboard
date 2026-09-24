import React, { useEffect, useState } from 'react';
import { doc, setDoc, deleteDoc, serverTimestamp, getDoc, getDocs, query, where, collection } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { db, firebaseConfig } from '../../firebase';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { initTeachersListener, addOrUpdateTeacher, removeTeacher } from '../../store/slices/teachersSlice';
import { fetchBooks, fetchGroups, fetchClasses } from '../../store/slices/appSettingsSlice';
import { FcBusinessman, FcBusinesswoman } from 'react-icons/fc';

interface Teacher {
    id: string;
    name: string;
    fatherName?: string;
    gender?: string;
    role?: string;
    subject: string;
    subjects?: string[];
    qualification: string;
    experience: string;
    phone: string;
    email: string;
    password?: string;
    image: string;
    teacherId?: string;
    uid?: string;
    section?: string;
    sections?: string[];
    assignedClass?: string;
    classes?: string[];
}

// Subjects are now dynamically loaded from Firestore

const TEACHER_ROLES = ['Teacher', 'Senior Teacher', 'Assistant Teacher', 'HOD', 'Principal', 'Vice Principal'];
const GENDERS = ['Male', 'Female'];

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ef4444'];
const avatarColor = (name: string) => COLORS[(name || 'A').charCodeAt(0) % COLORS.length];
const emptyForm = (): Partial<Teacher> => ({ name: '', fatherName: '', gender: '', role: 'Teacher', subject: '', subjects: [], qualification: '', experience: '', phone: '', email: '', image: '', section: '', sections: [], assignedClass: '', classes: [] });

const PAGE_SIZE = 12;

// ── Auth helpers (mirrors StudentsPage) ────────────────────────────────────────

const generatePassword = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    return pwd;
};

// Returns teacherId in the format TCH-YEAR-NNN
// Email is derived directly from teacherId: TCH-2026-001@theseeksacademy.edu.pk
const getNextTeacherId = async (): Promise<string> => {
    const currentYear = new Date().getFullYear();
    const idCounterRef = doc(db, 'counters', 'teacherId');
    const idSnap = await getDoc(idCounterRef);
    let nextIdNum = 1;
    if (idSnap.exists()) {
        const d = idSnap.data();
        if (d.year === currentYear) nextIdNum = d.nextNumber;
    }
    const teacherId = `TCH-${currentYear}-${String(nextIdNum).padStart(3, '0')}`;
    await setDoc(idCounterRef, { year: currentYear, nextNumber: nextIdNum + 1 });
    return teacherId;
};

// ── Sync ALL profile docs for a teacher by their email ───────────────────────
// Queries both `profile` and `studentsprofile` by email to find every existing
// doc regardless of which ID was used when the teacher was created, then merges
// the updated payload into all of them. Also writes to uid-keyed and
// teacherId-keyed docs so future auth lookups always hit the right document.
const syncTeacherProfileByEmail = async (
    email: string,
    payload: Record<string, any>,
    uid?: string,
    teacherDocId?: string,
) => {
    if (!email) return;
    const writes: Promise<any>[] = [];

    // 1️⃣ Always write to teacherId-keyed docs (catches new-flow teachers)
    if (teacherDocId) {
        writes.push(setDoc(doc(db, 'profile', teacherDocId), payload, { merge: true }));
        writes.push(setDoc(doc(db, 'studentsprofile', teacherDocId), payload, { merge: true }));
    }
    // 2️⃣ Always write to uid-keyed docs (primary mobile lookup)
    if (uid) {
        writes.push(setDoc(doc(db, 'profile', uid), payload, { merge: true }));
        writes.push(setDoc(doc(db, 'studentsprofile', uid), payload, { merge: true }));
    }
    // 3️⃣ Email-based discovery: find & update ANY existing profile docs
    try {
        const [pSnap, spSnap] = await Promise.all([
            getDocs(query(collection(db, 'profile'), where('email', '==', email))),
            getDocs(query(collection(db, 'studentsprofile'), where('email', '==', email))),
        ]);
        pSnap.forEach(d => writes.push(setDoc(doc(db, 'profile', d.id), payload, { merge: true })));
        spSnap.forEach(d => writes.push(setDoc(doc(db, 'studentsprofile', d.id), payload, { merge: true })));
    } catch (e) {
        console.warn('Profile email-query sync failed (non-fatal):', e);
    }
    await Promise.all(writes.map(p => p.catch(e => console.warn('Profile sync write failed:', e?.code))));
    console.log('✅ Teacher profile synced for', email);
};


// Resolves a teacher's Firebase Auth UID and current password, then signs in and updates the password.
const updateTeacherAuthAccount = async (
    oldEmail: string,
    oldPassword: string | undefined,
    newEmail: string,
    newPassword: string | undefined,
    uid: string | undefined
): Promise<'updated' | 'skipped' | 'no_uid'> => {
    if (!newPassword) return 'skipped';
    
    let resolvedUid = uid || '';
    let resolvedAuthPassword = oldPassword || '';

    if (!resolvedAuthPassword) {
        try {
            const q = query(collection(db, 'staff'), where('email', '==', (oldEmail || '').toLowerCase().trim()));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const docData = snap.docs[0].data();
                if (docData.password) resolvedAuthPassword = docData.password;
                if (!resolvedUid && docData.uid) resolvedUid = docData.uid;
            }
        } catch (e) {}
    }

    if (!resolvedUid) return 'no_uid';

    if (resolvedAuthPassword) {
        let secondaryApp: any;
        try {
            const emailLower = (oldEmail || '').toLowerCase().trim();
            secondaryApp = initializeApp(firebaseConfig, `teacherUpdate_${Date.now()}`);
            const secondaryAuth = initializeAuth(secondaryApp, { persistence: browserLocalPersistence });
            const userCredential = await signInWithEmailAndPassword(secondaryAuth, emailLower, resolvedAuthPassword);
            await updatePassword(userCredential.user, newPassword);
            console.log('✅ Firebase Auth password updated for teacher:', emailLower);
            return 'updated';
        } catch (authError: any) {
            console.warn('Teacher Auth update failed:', authError?.code, authError?.message);
        } finally {
            if (secondaryApp) { try { await deleteApp(secondaryApp); } catch (_) {} }
        }
    }
    return 'skipped';
};

const createTeacherAuthAccount = async (
    teacherEmail: string,
    teacherPassword: string,
    teacherData: { name: string; fatherName: string; gender: string; role: string; qualification: string; experience: string; phone: string; subject: string; subjects?: string[]; image: string; teacherId: string; section?: string; sections?: string[]; assignedClass?: string; classes?: string[]; }
): Promise<string | null> => {

    let secondaryApp: any;
    try {
        secondaryApp = initializeApp(firebaseConfig, `teacherCreation_${Date.now()}`);
        const secondaryAuth = initializeAuth(secondaryApp, { persistence: browserLocalPersistence });

        // 1️⃣ Create the Firebase Auth account
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, teacherEmail, teacherPassword);
        const uid = userCredential.user.uid;

        // 2️⃣ Build the profile payload (matches mobile UserProfile type)
        const profilePayload = {
            // Core UserProfile fields consumed by ProfileScreen
            fullname: teacherData.name,
            fathername: teacherData.fatherName || '',  // ProfileScreen shows fathername
            email: teacherEmail,
            phone: teacherData.phone || '',
            rollno: teacherData.teacherId,             // shown as ID / Roll No
            class: teacherData.subject || '',           // shown as Class → Subject for teacher
            section: teacherData.qualification || '',   // shown as Section → Qualification
            session: teacherData.experience || '',      // shown as Session → Experience
            image: teacherData.image || '',
            gender: teacherData.gender || '',           // shown in Personal Information
            role: teacherData.role || 'teacher',        // shown as Role badge in profile
            // Extra teacher-specific fields
            teacherId: teacherData.teacherId,
            subject: teacherData.subject || '',
            subjects: teacherData.subjects || [],
            qualification: teacherData.qualification || '',
            experience: teacherData.experience || '',
            assignedSection: teacherData.section || '',
            assignedSections: teacherData.sections || [],
            assignedClass: teacherData.assignedClass || '',
            assignedClasses: teacherData.classes || [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        // 3️⃣ PRIMARY: Write to studentsprofile/{uid}
        // mobile authSlice checks this collection FIRST via direct UID read
        // → always succeeds regardless of Firestore security rules
        await setDoc(doc(db, 'studentsprofile', uid), profilePayload);
        console.log('✅ studentsprofile/', uid, 'written — primary profile path');

        // 4️⃣ SECONDARY: Also write to profile/{uid} for the direct-uid lookup (step 1b)
        try {
            await setDoc(doc(db, 'profile', uid), profilePayload);
            console.log('✅ profile/', uid, 'written');
        } catch (e1: any) {
            console.warn('⚠️ profile/', uid, 'write failed (non-fatal):', e1?.code);
        }

        // 5️⃣ TERTIARY: Also write to profile/{teacherId} for email-based query fallback
        try {
            await setDoc(doc(db, 'profile', teacherData.teacherId), profilePayload, { merge: true });
            console.log('✅ profile/', teacherData.teacherId, 'written as email-lookup key');
        } catch (e2: any) {
            console.warn('⚠️ profile/', teacherData.teacherId, 'write failed (non-fatal):', e2?.code);
        }

        return uid;
    } catch (error: any) {
        console.error('❌ createTeacherAuthAccount failed:', error?.code, error?.message);
        throw error;
    } finally {
        // Delete secondary app AFTER all writes are complete
        if (secondaryApp) {
            try { await deleteApp(secondaryApp); } catch (_) {}
        }
    }
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function TeachersPage() {
    const dispatch = useAppDispatch();
    const { data: teachers, status: teachersStatus } = useAppSelector((s: any) => s.teachers);
    const loading = teachersStatus === 'loading' || teachersStatus === 'idle';

    const globalSearchQuery = useAppSelector((s: any) => s.general.globalSearchQuery);
    const [search, setSearch] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Teacher | null>(null);
    const [form, setForm] = useState<Partial<Teacher>>(emptyForm());
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2000);
    };
    const [saving, setSaving] = useState(false);
    const [isFixing, setIsFixing] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [viewTeacher, setViewTeacher] = useState<Teacher | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [importModalOpen, setImportModalOpen] = useState(false);
    
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [uploadingProgress, setUploadingProgress] = useState<{current: number, total: number} | null>(null);
    
    // UI states for custom multi-select
    const [subjectsDropdownOpen, setSubjectsDropdownOpen] = useState(false);
    const [sectionsDropdownOpen, setSectionsDropdownOpen] = useState(false);
    const [classesDropdownOpen, setClassesDropdownOpen] = useState(false);

    const downloadTemplate = async () => {
        try {
            const XLSX = await import('xlsx');
            const ws = XLSX.utils.json_to_sheet([{
                Name: 'Mr. Iftikhar Zahid',
                'Father Name': 'Muhammad Ali',
                Gender: 'Male',
                Role: 'Teacher',
                Subject: 'Mathematics',
                Qualification: 'MSc',
                Experience: '5 Years',
                Phone: '03001234567'
            }]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Staff");
            XLSX.writeFile(wb, "Staff_Import_Template.xlsx");
        } catch (error) {
            alert('Failed to generate template.');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const XLSX = await import('xlsx');
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data: any[] = XLSX.utils.sheet_to_json(ws);

                    if (data.length === 0) {
                        alert("No data found in the file.");
                        return;
                    }

                    // Normalize keys to lower case and trim to handle spaces in Excel headers
                    const normalizedData = data.map(row => {
                        const newRow: any = {};
                        for (const key in row) {
                            newRow[key.trim().toLowerCase()] = row[key];
                        }
                        return newRow;
                    });

                    if (!confirm(`Are you sure you want to import ${normalizedData.length} staff members?`)) {
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        return;
                    }

                    setUploadingProgress({ current: 0, total: normalizedData.length });

                    let successCount = 0;
                    let skippedCount = 0;
                    for (let i = 0; i < normalizedData.length; i++) {
                        const row = normalizedData[i];
                        const name = row['name'] || row['fullname'] || row['full name'] || row['teacher name'] || '';
                        
                        if (!name) {
                            skippedCount++;
                            setUploadingProgress({ current: i + 1, total: normalizedData.length });
                            continue;
                        }

                        const subjectRaw = row['subject'] || row['class'] || '';
                        const subjectArray = subjectRaw ? subjectRaw.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [];
                        const subjectStr = subjectArray.join(', ');
                        const fatherName = row['fathername'] || row['father name'] || '';
                        const gender = row['gender'] || '';
                        const qualification = row['qualification'] || row['degree'] || '';
                        const experience = row['experience'] || '';
                        const phone = row['phone'] || row['contact'] || '';
                        const role = row['role'] || row['position'] || 'Teacher';

                        try {
                            const newTeacherId = await getNextTeacherId();
                            const newEmail = `${newTeacherId.toLowerCase()}@theseeksacademy.edu.pk`;
                            const newPassword = generatePassword();

                            const authData = {
                                name: String(name),
                                fatherName: String(fatherName),
                                gender: String(gender),
                                role: String(role),
                                qualification: String(qualification),
                                experience: String(experience),
                                phone: String(phone),
                                subject: subjectStr,
                                subjects: subjectArray,
                                image: '',
                                teacherId: newTeacherId,
                            };

                            const uid = await createTeacherAuthAccount(newEmail, newPassword, authData);

                            const payload = {
                                name: String(name),
                                fatherName: String(fatherName),
                                gender: String(gender),
                                role: String(role),
                                subject: subjectStr,
                                subjects: subjectArray,
                                qualification: String(qualification),
                                experience: String(experience),
                                phone: String(phone),
                                email: newEmail,
                                password: newPassword,
                                image: '',
                                teacherId: newTeacherId,
                                uid: uid || '',
                                type: 'Teacher',
                                status: 'Active',
                            };

                            await setDoc(doc(db, 'staff', newTeacherId), { ...payload, updatedAt: serverTimestamp() });
                            dispatch(addOrUpdateTeacher({ id: newTeacherId, ...payload } as any));

                            successCount++;
                        } catch (rowError) {
                            console.error(`Failed to import row ${i} (Name: ${name}):`, rowError);
                            skippedCount++;
                        }
                        
                        setUploadingProgress({ current: i + 1, total: normalizedData.length });
                    }

                    alert(`Import completed!\n✅ Successfully imported: ${successCount}\n⚠️ Skipped/Failed: ${skippedCount}`);
                } catch (err: any) {
                    alert('Error parsing file: ' + err.message);
                } finally {
                    setUploadingProgress(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            };
            reader.readAsBinaryString(file);
        } catch (err: any) {
            alert('Failed to load xlsx parser: ' + err.message);
            setUploadingProgress(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Load books/subjects from Redux
    const subjectsList = useAppSelector((s: any) => s.appSettings.books);
    const booksStatus = useAppSelector((s: any) => s.appSettings.booksStatus);
    const groupsList = useAppSelector((s: any) => s.appSettings.groups);
    const groupsStatus = useAppSelector((s: any) => s.appSettings.groupsStatus);
    const classesList = useAppSelector((s: any) => s.appSettings.classes);
    const classesStatus = useAppSelector((s: any) => s.appSettings.classesStatus);
    
    useEffect(() => {
        const unsubscribe = dispatch(initTeachersListener());
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [dispatch]);
    useEffect(() => {
        if (booksStatus === 'idle') dispatch(fetchBooks());
        if (groupsStatus === 'idle' || !groupsStatus) dispatch(fetchGroups());
        if (classesStatus === 'idle' || !classesStatus) dispatch(fetchClasses());
    }, [dispatch, booksStatus, groupsStatus, classesStatus]);

    const activeSearch = search || globalSearchQuery;

    const filtered = teachers.filter((t: any) => {
        const q = activeSearch.toLowerCase();
        const matchSearch = !q || (t.name || '').toLowerCase().includes(q)
            || (t.subject || '').toLowerCase().includes(q)
            || (t.email || '').toLowerCase().includes(q)
            || (t.teacherId || '').toLowerCase().includes(q);
        const matchSubject = !filterSubject || (t.subjects && t.subjects.includes(filterSubject)) || (t.subject && t.subject.split(',').map((s: string) => s.trim()).includes(filterSubject));
        const matchClass = !filterClass || (t.classes && t.classes.includes(filterClass)) || (t.assignedClass && t.assignedClass.split(',').map((s: string) => s.trim()).includes(filterClass));
        const matchSection = !filterSection || (t.sections && t.sections.includes(filterSection)) || (t.section && t.section.split(',').map((s: string) => s.trim()).includes(filterSection));
        return matchSearch && matchSubject && matchClass && matchSection;
    });

    useEffect(() => { setCurrentPage(1); }, [activeSearch, filterSubject, filterClass, filterSection]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const paginatedTeachers = filtered.slice(startIdx, startIdx + PAGE_SIZE);

    const openAdd = () => { setEditing(null); setForm(emptyForm()); setModalOpen(true); };
    const openEdit = (t: Teacher) => { 
        let subjectsArr = t.subjects && t.subjects.length > 0 ? t.subjects : (t.subject ? t.subject.split(',').map((s: string) => s.trim()).filter(Boolean) : []); 
        subjectsArr = subjectsArr.filter((s: string) => subjectsList.includes(s)); 
        
        let sectionsArr = t.sections && t.sections.length > 0 ? t.sections : (t.section ? t.section.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
        sectionsArr = sectionsArr.filter((s: string) => groupsList.some((g: any) => (g.name || g) === s));
        
        let classesArr = t.classes && t.classes.length > 0 ? t.classes : (t.assignedClass ? t.assignedClass.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
        classesArr = classesArr.filter((c: string) => classesList.includes(c));
        
        setEditing(t); setForm({ ...t, subjects: subjectsArr, sections: sectionsArr, classes: classesArr }); setModalOpen(true); 
    };

    const save = async () => {
        const finalSubjectsArray = form.subjects && form.subjects.length > 0 ? form.subjects : (form.subject ? [form.subject] : []);
        if (!form.name || finalSubjectsArray.length === 0 || !form.qualification || !form.experience) {
            showToast('Name, Subjects, Qualification and Experience are required.'); return;
        }
        setSaving(true);
        try {
            const finalSubjectStr = finalSubjectsArray.join(', ');
            
            const finalSectionsArray = form.sections && form.sections.length > 0 ? form.sections : (form.section ? [form.section] : []);
            const finalSectionStr = finalSectionsArray.join(', ');

            const finalClassesArray = form.classes && form.classes.length > 0 ? form.classes : (form.assignedClass ? [form.assignedClass] : []);
            const finalClassStr = finalClassesArray.join(', ');
            if (editing) {
                // ── EDIT existing teacher ──────────────────────────────
                const id = editing.id;
                const payload = {
                    name: form.name || '',
                    fatherName: form.fatherName || '',
                    gender: form.gender || '',
                    role: form.role || 'Teacher',
                    subject: finalSubjectStr,
                    subjects: finalSubjectsArray,
                    qualification: form.qualification || '',
                    experience: form.experience || '',
                    phone: form.phone || '',
                    email: form.email || '',
                    password: form.password || '',
                    image: form.image || '',
                    teacherId: editing.teacherId || id,
                    section: finalSectionStr,
                    sections: finalSectionsArray,
                    assignedClass: finalClassStr,
                    classes: finalClassesArray,
                    type: 'Teacher',
                };
                dispatch(addOrUpdateTeacher({ id, ...payload } as any));
                setModalOpen(false);

                // 1️⃣ Update staff doc
                await setDoc(doc(db, 'staff', id), { ...payload, updatedAt: serverTimestamp() }, { merge: true });

                // 2️⃣ Sync all profile documents so mobile ProfileScreen reflects changes
                const teacherDocId = (editing as any).teacherId || id;
                const uid = (editing as any).uid;
                const profileSync = {
                    fullname: form.name || '',
                    fathername: form.fatherName || '',
                    email: form.email || editing.email || '',
                    phone: form.phone || '',
                    rollno: teacherDocId,
                    class: form.subject || '',
                    section: form.qualification || '',
                    session: form.experience || '',
                    image: form.image || '',
                    gender: form.gender || '',
                    role: form.role || 'Teacher',
                    teacherId: teacherDocId,
                    subject: finalSubjectStr,
                    subjects: finalSubjectsArray,
                    qualification: form.qualification || '',
                    experience: form.experience || '',
                    assignedSection: finalSectionStr,
                    assignedSections: finalSectionsArray,
                    assignedClass: finalClassStr,
                    classes: finalClassesArray,
                    updatedAt: serverTimestamp(),
                };
                const teacherEmail = form.email || editing.email || '';
                await syncTeacherProfileByEmail(teacherEmail, profileSync, uid, teacherDocId);

                // 3️⃣ Attempt to update Firebase Auth password if changed
                if (form.password && form.password !== editing.password) {
                    const updateRes = await updateTeacherAuthAccount(
                        editing.email || form.email || '',
                        editing.password,
                        form.email || editing.email || '',
                        form.password,
                        uid
                    );
                    if (updateRes === 'updated') {
                        showToast('✅ Teacher updated successfully. Firebase Auth password has been changed.');
                    } else {
                        showToast('⚠️ Teacher record saved. Update the password in Firebase Console manually.');
                    }
                } else {
                    showToast('✅ Teacher updated successfully.');
                }


            } else {
                // ── ADD new teacher: auto-generate ID, email, password ─
                const newTeacherId = await getNextTeacherId();
                // Email = teacherId (lowercase) @ theseeksacademy.edu.pk
                // e.g. TCH-2026-001@theseeksacademy.edu.pk
                const newEmail = `${newTeacherId.toLowerCase()}@theseeksacademy.edu.pk`;
                const newPassword = generatePassword();

                const authData = {
                    name: form.name || '',
                    fatherName: form.fatherName || '',
                    gender: form.gender || '',
                    role: form.role || 'Teacher',
                    qualification: form.qualification || '',
                    experience: form.experience || '',
                    phone: form.phone || '',
                    subject: finalSubjectStr,
                    subjects: finalSubjectsArray,
                    image: form.image || '',
                    teacherId: newTeacherId,
                    section: finalSectionStr,
                    sections: finalSectionsArray,
                    assignedClass: finalClassStr,
                    classes: finalClassesArray,
                };

                // Create Firebase Auth account + profile doc
                const uid = await createTeacherAuthAccount(newEmail, newPassword, authData);

                const payload = {
                    name: form.name || '',
                    fatherName: form.fatherName || '',
                    gender: form.gender || '',
                    role: form.role || 'Teacher',
                    subject: finalSubjectStr,
                    subjects: finalSubjectsArray,
                    qualification: form.qualification || '',
                    experience: form.experience || '',
                    phone: form.phone || '',
                    email: newEmail,
                    password: newPassword,
                    image: form.image || '',
                    teacherId: newTeacherId,
                    uid: uid || '',
                    type: 'Teacher',
                    status: 'Active',
                    section: finalSectionStr,
                    sections: finalSectionsArray,
                    assignedClass: finalClassStr,
                    classes: finalClassesArray,
                };

                // Optimistic UI
                dispatch(addOrUpdateTeacher({ id: newTeacherId, ...payload } as any));
                setModalOpen(false);

                await setDoc(doc(db, 'staff', newTeacherId), { ...payload, updatedAt: serverTimestamp() });

                alert(`Teacher added!\n\nTeacher ID: ${newTeacherId}\nEmail: ${newEmail}\nPassword: ${newPassword}\n\nThe teacher can now log in with these credentials.`);
            }
        } catch (e: any) {
            if (e?.code === 'auth/email-already-in-use') {
                showToast('An account with this email already exists.');
            } else {
                showToast('Failed to save. Please try again.');
            }
        }
        setSaving(false);
    };

    const handleFixCredentials = async () => {
        if (!viewTeacher) return;
        if (!viewTeacher.email || !viewTeacher.password) {
            alert("Email and password are required. Please edit the teacher first.");
            return;
        }

        if (!confirm("This will test the current credentials and recreate the Auth account if it is broken. Do you want to continue?")) return;

        setIsFixing(true);
        let secondaryApp: any;
        try {
            secondaryApp = initializeApp(firebaseConfig, `teacherFix_${Date.now()}`);
            const secondaryAuth = initializeAuth(secondaryApp, { persistence: browserLocalPersistence });
            
            try {
                // Try logging in to check if credentials are fine
                await signInWithEmailAndPassword(secondaryAuth, viewTeacher.email, viewTeacher.password);
                alert("✅ Credentials are correct! The teacher should be able to log in without issues.");
            } catch (err: any) {
                // If login fails, try recreating the account
                if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                    try {
                        const creds = await createUserWithEmailAndPassword(secondaryAuth, viewTeacher.email, viewTeacher.password);
                        const uid = creds.user.uid;
                        
                        // Update staff with new UID
                        await setDoc(doc(db, 'staff', viewTeacher.id), { uid, updatedAt: serverTimestamp() }, { merge: true });
                        
                        const teacherDocId = viewTeacher.teacherId || viewTeacher.id;
                        const profileSync = {
                            fullname: viewTeacher.name || '',
                            fathername: (viewTeacher as any).fatherName || '',
                            email: viewTeacher.email,
                            phone: viewTeacher.phone || '',
                            rollno: teacherDocId,
                            class: viewTeacher.subject || '',
                            section: viewTeacher.qualification || '',
                            session: viewTeacher.experience || '',
                            image: viewTeacher.image || '',
                            gender: (viewTeacher as any).gender || '',
                            role: (viewTeacher as any).role || 'Teacher',
                            teacherId: teacherDocId,
                            subject: viewTeacher.subject || '',
                            subjects: viewTeacher.subjects || [],
                            qualification: viewTeacher.qualification || '',
                            experience: viewTeacher.experience || '',
                            assignedSection: (viewTeacher as any).section || '',
                            assignedSections: (viewTeacher as any).sections || [],
                            assignedClass: (viewTeacher as any).assignedClass || '',
                            classes: viewTeacher.classes || [],
                            updatedAt: serverTimestamp(),
                        };

                        await syncTeacherProfileByEmail(viewTeacher.email, profileSync, uid, teacherDocId);

                        dispatch(addOrUpdateTeacher({ ...viewTeacher, uid } as any));
                        alert("✅ Fixed! Auth account recreated successfully with the current email and password.");
                    } catch (createErr: any) {
                        if (createErr.code === 'auth/email-already-in-use') {
                            alert("❌ The email is already in use by a broken account. Please click 'Edit Details', change the email slightly (e.g. tch-...-1@...), save, and try fixing again.");
                        } else {
                            alert("❌ Failed to create auth account: " + createErr.message);
                        }
                    }
                } else {
                    alert("❌ Error checking credentials: " + err.message);
                }
            }
        } catch (e: any) {
            console.error(e);
            alert("An unexpected error occurred.");
        } finally {
            if (secondaryApp) { try { await deleteApp(secondaryApp); } catch (_) {} }
            setIsFixing(false);
        }
    };

    const remove = async (t: any) => {
        if (!confirm('Delete this staff member?')) return;
        setDeleting(t.id);
        
        try {
            dispatch(removeTeacher(t.id));
            await deleteDoc(doc(db, 'staff', t.id));
            
            if (t.uid) {
                await deleteDoc(doc(db, 'studentsprofile', t.uid));
                await deleteDoc(doc(db, 'profile', t.uid));
            }
            if (t.teacherId) {
                await deleteDoc(doc(db, 'studentsprofile', t.teacherId));
                await deleteDoc(doc(db, 'profile', t.teacherId));
            }
        } catch (error) {
            console.error('Error deleting staff member:', error);
            alert('Failed to completely delete the record from Firebase.');
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="page" style={{ padding: '0px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="page-header" style={{ padding: '10px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>👩‍🏫 Teachers / Staff</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>Manage and view staff members</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px' }}>
                            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Total</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>{filtered.length}</span>
                            <span style={{ fontSize: 10, color: 'var(--text2)' }}>{(filterSubject || search) ? 'found' : 'staff'}</span>
                        </div>
                        <button className="btn btn-ghost" onClick={() => setImportModalOpen(true)} style={{ padding: '5px 12px', fontSize: 12, height: 30, border: '1px solid var(--border)', background: 'var(--card)' }}>
                            📤 Import
                        </button>
                        <button className="btn btn-primary" onClick={openAdd} style={{ padding: '5px 12px', fontSize: 12, height: 30 }} disabled={!!uploadingProgress}>
                            ➕ Add
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="responsive-filter-bar" style={{ padding: '6px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
                <div className="search-box" style={{ flex: 1.5, background: 'var(--bg3)', margin: 0, height: 30, minHeight: 'unset', display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <span className="search-icon" style={{ fontSize: 12, marginRight: 6 }}>🔍</span>
                    <input
                        placeholder="Search name, subject, email, ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ background: 'transparent', fontSize: 12, border: 'none', outline: 'none', flex: 1, color: 'var(--text)' }}
                    />
                </div>
                <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', maxWidth: 160 }} value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                    <option value="">All Subjects</option>
                    {subjectsList.map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', maxWidth: 160 }} value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                    <option value="">All Sections</option>
                    {groupsList.map((g: any) => { const grp = g.name || g; return <option key={grp} value={grp}>{grp}</option>; })}
                </select>
                <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', maxWidth: 160 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                    <option value="">All Classes</option>
                    {classesList.map((c: any) => { const cls = c.name || c; return <option key={cls} value={cls}>{cls}</option>; })}
                </select>
                {(search || filterSubject || filterSection || filterClass) && (
                    <button className="btn btn-ghost" style={{ height: 30, fontSize: 11, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', padding: '0 10px' }} onClick={() => { setSearch(''); setFilterSubject(''); setFilterSection(''); setFilterClass(''); }}>
                        ✕ Clear
                    </button>
                )}
            </div>

            {loading ? (
                <div className="loading" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /> Loading...</div>
            ) : (
                <div style={{ flex: 1, overflow: 'hidden', padding: '10px 16px', display: 'flex', flexDirection: 'column' }}>
                    <div className="table-wrap" style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', background: 'var(--card)', borderRadius: 8, overflow: 'hidden', margin: 0 }}>
                        <div style={{ overflow: 'auto', flex: 1 }}>
                            <table style={{ background: 'var(--card)', minWidth: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                    <tr style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 100%)', color: '#ffffff', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', width: 40, textAlign: 'center', color: '#fff' }}>#</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#fff', width: '1%', whiteSpace: 'nowrap' }}>Teacher ID</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 180, color: '#fff' }}>Name</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 160, color: '#fff' }}>Qualification</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 140, color: '#fff' }}>Subject</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 100, color: '#fff' }}>Experience</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 110, color: '#fff' }}>Phone</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 160, color: '#fff' }}>Email</th>
                                        <th style={{ padding: '7px 10px', textAlign: 'center', width: 140, borderLeft: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={9} className="empty" style={{ padding: '30px', fontSize: 12 }}>No staff found matching filters</td></tr>
                                    ) : paginatedTeachers.map((t: any, i: number) => {
                                        const rowNum = startIdx + i + 1;
                                        return (
                                            <tr key={t.id} onClick={() => setViewTeacher(t as Teacher)} style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--card)' : 'var(--bg3)' }}>
                                                <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', textAlign: 'center', fontSize: 11, color: 'var(--text2)' }}>{rowNum}</td>
                                                <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontFamily: 'monospace', color: 'var(--primary-light)', fontSize: 12 }}>{t.teacherId || '—'}</td>
                                                <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div className="avatar" style={{ width: 26, height: 26, fontSize: 12, flexShrink: 0, background: `${avatarColor(t.name)}22`, color: avatarColor(t.name), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {t.image ? <img src={t.image} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (t.gender === 'Female' || t.gender === 'female' ? <FcBusinesswoman size={24} /> : t.gender === 'Male' || t.gender === 'male' ? <FcBusinessman size={24} /> : (t.name || 'T').charAt(0).toUpperCase())}
                                                        </div>
                                                        <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>{t.name}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)' }}>{t.qualification || '—'}</td>
                                                <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', maxWidth: 200 }}>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                        {(() => {
                                                            const validSubjects = (t.subjects && t.subjects.length > 0 ? t.subjects : (t.subject ? t.subject.split(',').map((s: string) => s.trim()).filter(Boolean) : [])).filter((s: string) => subjectsList.includes(s));
                                                            const showCount = 2;
                                                            const displayed = validSubjects.slice(0, showCount);
                                                            const extraCount = validSubjects.length - showCount;
                                                            return (
                                                                <>
                                                                    {displayed.map((s: string, idx: number) => (
                                                                        <span 
                                                                            key={idx}
                                                                            style={{ 
                                                                                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, 
                                                                                background: 'rgba(99,102,241,0.12)', color: '#818cf8',
                                                                                display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle'
                                                                            }} 
                                                                            title={s}
                                                                        >
                                                                            {s}
                                                                        </span>
                                                                    ))}
                                                                    {extraCount > 0 && (
                                                                        <span 
                                                                            style={{ 
                                                                                fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, 
                                                                                background: 'rgba(107,114,128,0.1)', color: 'var(--text2)',
                                                                                display: 'inline-block', verticalAlign: 'middle'
                                                                            }} 
                                                                            title={validSubjects.slice(showCount).join(', ')}
                                                                        >
                                                                            +{extraCount}
                                                                        </span>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)' }}>{t.experience || '—'}</td>
                                                <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 12, color: 'var(--text)' }}>{t.phone || '—'}</td>
                                                <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 11, color: 'var(--text2)' }}>{t.email || '—'}</td>
                                                <td style={{ padding: '5px 10px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                                                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'center' }}>
                                                        <div 
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                const nextActive = t.isActive === false; 
                                                                setDoc(doc(db, 'staff', t.id), { isActive: nextActive, status: nextActive ? 'active' : 'inactive', updatedAt: serverTimestamp() }, { merge: true })
                                                                .then(() => {
                                                                    dispatch(addOrUpdateTeacher({ ...t, isActive: nextActive, status: nextActive ? 'active' : 'inactive' }));
                                                                    syncTeacherProfileByEmail(t.email, { isActive: nextActive, status: nextActive ? 'active' : 'inactive' }, t.uid, t.teacherId || t.id);
                                                                }); 
                                                            }}
                                                            style={{
                                                                width: 44, height: 24, borderRadius: 12,
                                                                background: t.isActive === false ? 'linear-gradient(to bottom, #ef4444, #dc2626)' : 'linear-gradient(to bottom, #10b981, #059669)',
                                                                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4), 0 1px 1px rgba(255,255,255,0.1)',
                                                                position: 'relative', cursor: 'pointer', transition: 'background 0.3s ease',
                                                                display: 'flex', alignItems: 'center', padding: '0 3px', marginRight: 8
                                                            }}
                                                            title={t.isActive === false ? 'Click to Activate' : 'Click to Deactivate'}
                                                        >
                                                            <div style={{
                                                                width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(to bottom, #ffffff, #f0f0f0)',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 #ffffff', transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                                                                transform: t.isActive === false ? 'translateX(0px)' : 'translateX(20px)'
                                                            }} />
                                                        </div>
                                                        <button className="btn btn-ghost" style={{ padding: '3px', height: 26, width: 26, color: '#ef4444', background: 'rgba(239,68,68,0.1)' }} disabled={deleting === t.id} onClick={(e) => { e.stopPropagation(); remove(t); }}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {filtered.length > PAGE_SIZE && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: 'var(--card)', borderTop: '1px solid var(--border)', borderRadius: '0 0 8px 8px', flexShrink: 0 }}>
                            <button className="btn btn-ghost" style={{ padding: '5px 14px', fontSize: 12, height: 30 }} disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>← Previous</button>
                            <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>Showing <b style={{ color: 'var(--text)' }}>{startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filtered.length)}</b> of <b style={{ color: 'var(--primary)' }}>{filtered.length}</b></span>
                                <span style={{ color: 'var(--border)' }}>|</span>
                                <span>Page <b style={{ color: 'var(--text)' }}>{currentPage}</b> of {totalPages}</span>
                            </div>
                            <button className="btn btn-ghost" style={{ padding: '5px 14px', fontSize: 12, height: 30 }} disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next →</button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Import Modal ────────────────────────────────────────────────────── */}
            {importModalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setImportModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: 450 }}>
                        <div className="modal-header">
                            <div className="modal-title">Bulk Import Staff</div>
                            <button className="modal-close" onClick={() => setImportModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ background: 'rgba(59,130,246,0.08)', padding: 16, borderRadius: 10, border: '1px solid rgba(59,130,246,0.2)' }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 16 }}>1️⃣</span> Download Template
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.5 }}>
                                    Download the exact Excel template required for importing. Fill it with your staff data without modifying the column headers.
                                </div>
                                <button className="btn btn-ghost" style={{ background: '#fff', border: '1px solid var(--primary)', color: 'var(--primary)', fontSize: 12, padding: '8px 14px', borderRadius: 6, fontWeight: 700, boxShadow: '0 2px 4px rgba(59,130,246,0.1)' }} onClick={downloadTemplate}>
                                    ⬇️ Download .xlsx Template
                                </button>
                            </div>

                            <div style={{ background: 'var(--bg3)', padding: 16, borderRadius: 10, border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 16 }}>2️⃣</span> Upload Data
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.5 }}>
                                    Select your filled template to automatically create staff accounts and profiles.
                                </div>
                                <input type="file" ref={fileInputRef} hidden accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={async (e) => { await handleFileUpload(e); setImportModalOpen(false); }} />
                                <button className="btn btn-primary" style={{ width: '100%', padding: '12px 0', fontSize: 13, fontWeight: 700, borderRadius: 8, boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }} onClick={() => fileInputRef.current?.click()} disabled={!!uploadingProgress}>
                                    {uploadingProgress ? `Importing ${uploadingProgress.current}/${uploadingProgress.total}...` : '📤 Select File & Import'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add/Edit Modal ────────────────────────────────────────────────── */}
            {modalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: 800 }}>
                        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                            <div className="modal-title" style={{ fontSize: 18, fontWeight: 700 }}>{editing ? 'Edit Teacher Profile' : 'Add New Teacher'}</div>
                            <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ padding: '24px', overflow: 'visible', position: 'relative', zIndex: 10 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px 20px' }}>
                                {[
                                    { label: 'Full Name *', key: 'name', placeholder: 'e.g. Dr. Sarah Smith' },
                                    { label: 'Father Name', key: 'fatherName', placeholder: 'e.g. Muhammad Ali' },
                                    { label: 'Qualification *', key: 'qualification', placeholder: 'e.g. PhD in Mathematics' },
                                    { label: 'Experience *', key: 'experience', placeholder: 'e.g. 10 Years' },
                                    { label: 'Phone', key: 'phone', placeholder: '03001234567' },
                                    { label: 'Image URL', key: 'image', placeholder: 'https://...' },
                                ].map(f => (
                                    <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <label style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{f.label}</label>
                                        <input className="form-input" style={{ fontSize: 13, padding: '8px 12px', height: 'auto' }} placeholder={f.placeholder} value={(form as any)[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                                    </div>
                                ))}
                                
                                {/* Gender dropdown */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>Gender</label>
                                    <select className="form-input" style={{ fontSize: 13, padding: '8px 12px', height: 'auto' }} value={form.gender || ''} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                                        <option value="">Select Gender</option>
                                        {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                                
                                {/* Role dropdown */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>Role / Position</label>
                                    <select className="form-input" style={{ fontSize: 13, padding: '8px 12px', height: 'auto' }} value={form.role || 'Teacher'} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                                        {TEACHER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>

                                {/* Assignments Row: Subjects, Sections, Classes */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, gridColumn: '1 / -1' }}>
                                    {/* Subject multi-select dropdown */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
                                    <label style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>Subjects Taught *</label>
                                    <div 
                                        className="form-input" 
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', minHeight: 40, height: 'auto', padding: '8px 12px' }}
                                        onClick={() => {
                                            setSubjectsDropdownOpen(!subjectsDropdownOpen);
                                            if (!subjectsDropdownOpen) {
                                                setSectionsDropdownOpen(false);
                                                setClassesDropdownOpen(false);
                                            }
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {form.subjects && form.subjects.length > 0 ? form.subjects.map(s => (
                                                <span key={s} style={{ background: 'var(--primary)', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{s}</span>
                                            )) : <span style={{ color: 'var(--text2)', fontSize: 13 }}>Select Subjects...</span>}
                                        </div>
                                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>▼</span>
                                    </div>
                                    {subjectsDropdownOpen && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 9999, maxHeight: 160, overflowY: 'auto', overscrollBehavior: 'contain', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                                            {['All', ...subjectsList].map((s: string) => {
                                                const isSelected = s === 'All'
                                                    ? form.subjects?.length === subjectsList.length && subjectsList.length > 0
                                                    : form.subjects?.includes(s) || (form.subjects?.length === 0 && form.subject === s);
                                                return (
                                                    <div 
                                                        key={s}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setForm(p => {
                                                                const currentSubjects = p.subjects || (p.subject ? [p.subject] : []);
                                                                
                                                                if (s === 'All') {
                                                                    return { ...p, subjects: isSelected ? [] : [...subjectsList] };
                                                                }
                                                                
                                                                let newSubjects = form.subjects?.includes(s)
                                                                    ? currentSubjects.filter(sub => sub !== s)
                                                                    : [...currentSubjects, s];
                                                                    
                                                                return {
                                                                    ...p,
                                                                    subjects: newSubjects
                                                                };
                                                            });
                                                        }}
                                                        style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: isSelected ? 'rgba(99,102,241,0.1)' : 'transparent', borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                                                    >
                                                        <input type="checkbox" checked={isSelected} readOnly style={{ accentColor: 'var(--primary)', width: 16, height: 16, cursor: 'pointer' }} />
                                                        <span style={{ color: 'var(--text)', fontWeight: isSelected ? 600 : 400 }}>{s}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                
                                    {/* Section / Group multi-select dropdown */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
                                    <label style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>Assigned Sections / Groups</label>
                                    <div 
                                        className="form-input" 
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', minHeight: 40, height: 'auto', padding: '8px 12px' }}
                                        onClick={() => {
                                            setSectionsDropdownOpen(!sectionsDropdownOpen);
                                            if (!sectionsDropdownOpen) {
                                                setSubjectsDropdownOpen(false);
                                                setClassesDropdownOpen(false);
                                            }
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {form.sections && form.sections.length > 0 ? form.sections.map(g => (
                                                <span key={g} style={{ background: 'var(--primary-light)', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{g}</span>
                                            )) : <span style={{ color: 'var(--text2)', fontSize: 13 }}>Select Sections...</span>}
                                        </div>
                                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>▼</span>
                                    </div>
                                        {sectionsDropdownOpen && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 9999, maxHeight: 160, overflowY: 'auto', overscrollBehavior: 'contain', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                                                {['All', ...groupsList].map((g: any) => {
                                                    const grpName = g.name || g;
                                                    const allGroupNames = groupsList.map((gl: any) => gl.name || gl);
                                                    const isSelected = grpName === 'All'
                                                        ? form.sections?.length === allGroupNames.length && allGroupNames.length > 0
                                                        : form.sections?.includes(grpName) || (form.sections?.length === 0 && form.section === grpName);
                                                    return (
                                                        <div 
                                                            key={grpName}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setForm(p => {
                                                                    const currentSections = p.sections || (p.section ? [p.section] : []);
                                                                    
                                                                    if (grpName === 'All') {
                                                                        return { ...p, sections: isSelected ? [] : [...allGroupNames] };
                                                                    }
                                                                    
                                                                    let newSections = form.sections?.includes(grpName)
                                                                        ? currentSections.filter(sec => sec !== grpName)
                                                                        : [...currentSections, grpName];
                                                                        
                                                                    return {
                                                                        ...p,
                                                                        sections: newSections
                                                                    };
                                                                });
                                                            }}
                                                            style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: isSelected ? 'rgba(99,102,241,0.1)' : 'transparent', borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                                                        >
                                                            <input type="checkbox" checked={isSelected} readOnly style={{ accentColor: 'var(--primary)', width: 16, height: 16, cursor: 'pointer' }} />
                                                            <span style={{ color: 'var(--text)', fontWeight: isSelected ? 600 : 400 }}>{grpName}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Classes multi-select dropdown */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
                                        <label style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>Assigned Classes</label>
                                        <div 
                                            className="form-input" 
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', minHeight: 40, height: 'auto', padding: '8px 12px' }}
                                            onClick={() => {
                                                setClassesDropdownOpen(!classesDropdownOpen);
                                                if (!classesDropdownOpen) {
                                                    setSubjectsDropdownOpen(false);
                                                    setSectionsDropdownOpen(false);
                                                }
                                            }}
                                        >
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {form.classes && form.classes.length > 0 ? form.classes.map(c => (
                                                    <span key={c} style={{ background: 'var(--primary-light)', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{c}</span>
                                                )) : <span style={{ color: 'var(--text2)', fontSize: 13 }}>Select Classes...</span>}
                                            </div>
                                            <span style={{ fontSize: 12, color: 'var(--text2)' }}>▼</span>
                                        </div>
                                        {classesDropdownOpen && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 9999, maxHeight: 160, overflowY: 'auto', overscrollBehavior: 'contain', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                                                {['All', ...classesList].map((c: any) => {
                                                    const clsName = c.name || c;
                                                    const allClassNames = classesList.map((cl: any) => cl.name || cl);
                                                    const isSelected = clsName === 'All'
                                                        ? form.classes?.length === allClassNames.length && allClassNames.length > 0
                                                        : form.classes?.includes(clsName) || (form.classes?.length === 0 && form.assignedClass === clsName);
                                                    return (
                                                        <div 
                                                            key={clsName}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setForm(p => {
                                                                    const currentClasses = p.classes || (p.assignedClass ? [p.assignedClass] : []);
                                                                    
                                                                    // Special logic for "All"
                                                                    if (clsName === 'All') {
                                                                        return { ...p, classes: isSelected ? [] : [...allClassNames] };
                                                                    }
                                                                    
                                                                    // If selecting a specific class
                                                                    let newClasses = form.classes?.includes(clsName)
                                                                        ? currentClasses.filter(cl => cl !== clsName)
                                                                        : [...currentClasses, clsName];
                                                                        
                                                                    return {
                                                                        ...p,
                                                                        classes: newClasses
                                                                    };
                                                                });
                                                            }}
                                                            style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: isSelected ? 'rgba(99,102,241,0.1)' : 'transparent', borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                                                        >
                                                            <input type="checkbox" checked={isSelected} readOnly style={{ accentColor: 'var(--primary)', width: 16, height: 16, cursor: 'pointer' }} />
                                                            <span style={{ color: 'var(--text)', fontWeight: isSelected ? 600 : 400 }}>{clsName}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Email & Password: auto-generated for new, editable for edit */}
                                {editing ? (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1', marginTop: 8 }}>
                                            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 12px' }} />
                                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Account Credentials</div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <label style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>Email Address</label>
                                            <input className="form-input" style={{ fontSize: 13, padding: '8px 12px' }} placeholder="teacher@theseeksacademy.edu.pk" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <label style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>Portal Password</label>
                                            <input className="form-input" style={{ fontSize: 13, padding: '8px 12px' }} placeholder="Enter new password" value={form.password || ''} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ gridColumn: '1 / -1', background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.35)', borderRadius: 8, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14, marginTop: 8 }}>
                                        <span style={{ fontSize: 24, marginTop: 2 }}>🔑</span>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>Credentials Auto-Generated</div>
                                            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>A unique Teacher ID, login email (<em>TCH-YEAR-NNN@theseeksacademy.edu.pk</em>), and secure password will be created automatically when you save this new profile.</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer" style={{ padding: '16px 24px', background: 'var(--bg3)', borderTop: '1px solid var(--border)' }}>
                            <button className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => setModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" style={{ padding: '8px 20px', fontSize: 13, fontWeight: 700 }} disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save Teacher Profile'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── View Profile Modal ────────────────────────────────────────────── */}
            {viewTeacher && (
                <div className="modal-overlay" onClick={() => setViewTeacher(null)}>
                    <div className="modal" style={{ maxWidth: 400, padding: 0, overflowY: 'auto', overflowX: 'hidden', background: 'var(--card)' }} onClick={e => e.stopPropagation()}>
                        {/* Banner */}
                        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', height: 100, position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 12, right: 16, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 4, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>
                                ID: {viewTeacher.teacherId || viewTeacher.id}
                            </div>
                            <button onClick={() => setViewTeacher(null)} style={{ position: 'absolute', top: 12, left: 16, background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✕</button>
                        </div>

                        {/* Profile Area */}
                        <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -40, position: 'relative' }}>
                            <div className="avatar" style={{ width: 80, height: 80, fontSize: 32, flexShrink: 0, background: (!viewTeacher.image && ((viewTeacher as any).gender === 'Female' || (viewTeacher as any).gender === 'female' || (viewTeacher as any).gender === 'Male' || (viewTeacher as any).gender === 'male')) ? '#f3f4f6' : avatarColor(viewTeacher.name), color: '#fff', border: '4px solid var(--card)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {viewTeacher.image
                                    ? <img src={viewTeacher.image} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                    : ((viewTeacher as any).gender === 'Female' || (viewTeacher as any).gender === 'female' ? <FcBusinesswoman size={60} /> : (viewTeacher as any).gender === 'Male' || (viewTeacher as any).gender === 'male' ? <FcBusinessman size={60} /> : (viewTeacher.name || 'T').charAt(0).toUpperCase())}
                            </div>
                            <div style={{ marginTop: 12, textAlign: 'center' }}>
                                <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--text)', letterSpacing: -0.5 }}>{viewTeacher.name}</div>
                                <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                    {(viewTeacher.subjects && viewTeacher.subjects.length > 0 ? viewTeacher.subjects : (viewTeacher.subject ? viewTeacher.subject.split(',').map((s: string) => s.trim()).filter(Boolean) : [])).filter((s: string) => subjectsList.includes(s)).map((s: string, idx: number) => (
                                        <span key={idx} style={{ color: 'var(--primary)', fontWeight: 600, background: 'rgba(99,102,241,0.08)', padding: '2px 8px', borderRadius: 12 }}>{s}</span>
                                    ))}
                                    {viewTeacher.role && (
                                        <span style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: 0.5 }}>
                                            {viewTeacher.role}
                                        </span>
                                    )}
                                    {viewTeacher.gender && (
                                        <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                                            {viewTeacher.gender}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div style={{ padding: '0 24px 20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--bg3)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                                {[
                                    ['Father Name', (viewTeacher as any).fatherName],
                                    ['Gender',      (viewTeacher as any).gender],
                                    ['Role',        (viewTeacher as any).role],
                                    ['Subject',     (viewTeacher.subjects && viewTeacher.subjects.length > 0 ? viewTeacher.subjects.filter((s: string) => subjectsList.includes(s)).join(', ') : (viewTeacher.subject ? viewTeacher.subject.split(',').map((s: string) => s.trim()).filter(Boolean).filter((s: string) => subjectsList.includes(s)).join(', ') : '—'))],
                                    ['Qualification', viewTeacher.qualification],
                                    ['Experience',  viewTeacher.experience],
                                    ['Phone',       viewTeacher.phone],
                                ].map(([label, value]) => (
                                    <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: 9, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 2 }}>{label}</span>
                                        <span style={{ fontSize: 12, color: value ? 'var(--text)' : 'var(--text2)', fontWeight: 600 }}>{value || '—'}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Credentials */}
                            <div style={{ marginTop: 12, background: 'rgba(99,102,241,0.05)', border: '1px dashed rgba(99,102,241,0.3)', borderRadius: 12, padding: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--primary)', letterSpacing: 0.8, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span>🔑</span> Portal Access
                                    </div>
                                    <button 
                                        onClick={handleFixCredentials}
                                        disabled={isFixing}
                                        title="Fix Auth Credentials"
                                        style={{
                                            background: 'rgba(245, 158, 11, 0.15)',
                                            border: '1px solid rgba(245, 158, 11, 0.3)',
                                            borderRadius: '50%',
                                            width: 24,
                                            height: 24,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: isFixing ? 'not-allowed' : 'pointer',
                                            color: '#d97706',
                                            transition: 'all 0.2s',
                                            padding: 0
                                        }}
                                    >
                                        {isFixing ? (
                                            <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2, borderColor: '#d97706', borderTopColor: 'transparent' }} />
                                        ) : (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                                        )}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                        <span style={{ color: 'var(--text2)', fontWeight: 600 }}>Email</span>
                                        {viewTeacher.email ? (
                                            <span style={{ color: 'var(--text)', fontWeight: 700, fontFamily: 'monospace', background: 'var(--card)', padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', userSelect: 'all' }}>{viewTeacher.email}</span>
                                        ) : (
                                            <span style={{ color: 'var(--text2)', fontStyle: 'italic', fontSize: 10 }}>Not Assigned</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                        <span style={{ color: 'var(--text2)', fontWeight: 600 }}>Password</span>
                                        {viewTeacher.password ? (
                                            <span style={{ color: 'var(--text)', fontWeight: 700, fontFamily: 'monospace', background: 'var(--card)', padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', userSelect: 'all' }}>{viewTeacher.password}</span>
                                        ) : (
                                            <span style={{ color: 'var(--text2)', fontStyle: 'italic', fontSize: 10 }}>Not Assigned</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                                <button className="btn btn-ghost" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', fontSize: 12, fontWeight: 700, background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }} onClick={() => setViewTeacher(null)}>Close</button>
                                <button className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }} onClick={() => { setViewTeacher(null); openEdit(viewTeacher); }}>Edit Details</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Toast Notification */}
            {toastMessage && (
                <div style={{
                    position: 'fixed',
                    bottom: 30,
                    right: 30,
                    background: 'var(--card)',
                    color: 'var(--text)',
                    padding: '16px 24px',
                    borderRadius: 12,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                    zIndex: 999999,
                    fontWeight: 600,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    border: '1px solid var(--border)',
                    animation: 'fadeInUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}>
                    <div style={{ 
                        width: 24, height: 24, borderRadius: '50%', 
                        background: toastMessage.includes('✅') ? 'rgba(16,185,129,0.1)' : toastMessage.includes('⚠️') ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                        color: toastMessage.includes('✅') ? '#10b981' : toastMessage.includes('⚠️') ? '#f59e0b' : '#ef4444',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12
                    }}>
                        {toastMessage.includes('✅') ? '✓' : toastMessage.includes('⚠️') ? '!' : '✕'}
                    </div>
                    {toastMessage.replace('✅ ', '').replace('⚠️ ', '')}
                </div>
            )}
        </div>
    );
}
