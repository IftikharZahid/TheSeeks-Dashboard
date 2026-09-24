import React, { useEffect, useState } from 'react';
import { doc, setDoc, deleteDoc, serverTimestamp, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword, deleteUser } from 'firebase/auth';
import { db, firebaseConfig } from '../../firebase';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchStudents, addOrUpdateStudent, removeStudent, addPendingStudent, updatePendingStudent, removePendingStudent, removeSuccessfulPendingStudents, addEditedStudent, removeSuccessfulEditedStudents, toggleStudentActiveStatus } from '../../store/slices/studentsSlice';
import { fetchClasses, fetchBooks, fetchGroups } from '../../store/slices/appSettingsSlice';
import { FcBusinessman, FcBusinesswoman } from 'react-icons/fc';

interface Student {
    id: string;
    isActive?: boolean;
    name: string;
    fatherName: string;
    studentId: string;
    email: string;
    password?: string;
    grade: string;
    gender: string;
    section: string;
    session: string;
    phone: string;
    rollno?: string;
    profileImage?: string;
    uid?: string;
    subjects?: string[];
}

const GENDER_OPTIONS = ['Male', 'Female'];
const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ef4444'];

const classOrder: Record<string, number> = {
    'Playgroup': 1, 'Nursery': 2, 'Prep': 3,
    '1st': 4, '2nd': 5, '3rd': 6, '4th': 7, '5th': 8,
    '6th': 9, '7th': 10, '8th': 11, '9th': 12, '10th': 13,
    '1st Year': 14, '2nd Year': 15, '3rd Year': 16, '4th Year': 17,
    'O Level': 18, 'A Level': 19,
    'F.Sc Pre': 20, 'F.Sc Medical': 21, 'ICS': 22, 'FA.IT': 23, 'FA': 24,
};

const sortClasses = (clsArray: string[]) => {
    return [...clsArray].sort((a, b) => {
        const orderA = classOrder[a] || 999;
        const orderB = classOrder[b] || 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b);
    });
};

const avatarColor = (name: string) => {
    const n = name || 'A';
    return COLORS[(n.charCodeAt(0) || 65) % COLORS.length];
};

const emptyForm = (): Partial<Student> => {
    const year = new Date().getFullYear();
    const defaultSession = `${year}-${year + 1}`;
    return {
        name: '', fatherName: '', grade: '', gender: '', section: '', session: defaultSession, phone: '', email: '', profileImage: '', rollno: '', subjects: [], isActive: true
    };
};

// Auto-generates password in format: {f}{l}{random4}
const generatePassword = (studentName?: string): string => {
    let f = 'a';
    let l = 'a';
    if (studentName && studentName.trim().length > 0) {
        const parts = studentName.trim().split(/\s+/);
        f = parts[0].charAt(0).toLowerCase();
        l = parts.length > 1 ? parts[parts.length - 1].charAt(0).toLowerCase() : f;
    }
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
    return `${f}${l}${randomDigits}`;
};

// Generates email based on student ID format (e.g. STD-2026-012 -> std-26012@...)
const generateEmail = (studentId: string): string => {
    const parts = studentId.split('-');
    if (parts.length === 3) {
        const shortYear = parts[1].slice(-2);
        return `std-${shortYear}${parts[2]}@theseeksacademy.edu.pk`;
    }
    return `${studentId.toLowerCase()}@theseeksacademy.edu.pk`;
};

// Reads/increments a Firestore counter to produce STD-YEAR-NNN
const getNextStudentId = async (): Promise<string> => {
    const currentYear = new Date().getFullYear();
    const counterRef = doc(db, 'counters', 'studentId');
    const counterSnap = await getDoc(counterRef);
    let nextNumber = 1;
    if (counterSnap.exists()) {
        const data = counterSnap.data();
        if (data.year === currentYear) nextNumber = data.nextNumber;
    }
    const studentId = `STD-${currentYear}-${String(nextNumber).padStart(3, '0')}`;
    await setDoc(counterRef, { year: currentYear, nextNumber: nextNumber + 1 });
    return studentId;
};

// Creates a Firebase Auth account via a secondary app so admin stays signed in,
// and writes the student profile to `studentsprofile`
const createStudentAuthAccount = async (
    studentEmail: string,
    studentPassword: string,
    studentData: { name: string; fatherName: string; grade: string; profileImage: string; gender: string; section: string; session: string; phone: string; studentId: string; rollno?: string; }
): Promise<string | null> => {
    let secondaryApp: any;
    try {
        secondaryApp = initializeApp(firebaseConfig, `studentCreation_${Date.now()}`);
        const secondaryAuth = initializeAuth(secondaryApp, { persistence: browserLocalPersistence });
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, studentEmail, studentPassword);
        const uid = userCredential.user.uid;
        await setDoc(doc(db, 'studentsprofile', uid), {
            fullname: studentData.name,
            fathername: studentData.fatherName,
            email: studentEmail,
            phone: studentData.phone || '',
            rollno: studentData.rollno || studentData.studentId || '',
            class: studentData.grade || '',
            section: studentData.section || '',
            session: studentData.session || '',
            image: studentData.profileImage || '',
            gender: studentData.gender || '',
            role: 'student',
            isActive: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return uid;
    } catch (error: any) {
        console.error('Error creating student auth account:', error);
        throw error;
    } finally {
        if (secondaryApp) { try { await deleteApp(secondaryApp); } catch (_) { } }
    }
};

// Resolves a student's Firebase Auth UID and current password by querying studentsprofile,
// then signs in and updates the password. Returns true if Auth was actually updated.
const updateStudentAuthAccount = async (
    oldEmail: string,
    oldPassword: string | undefined,
    newEmail: string,
    newPassword: string | undefined,
    studentData: any,
    uid: string | undefined
): Promise<'updated' | 'skipped' | 'no_uid'> => {
    if (!newPassword) return 'skipped';

    // Step 1: Resolve UID and current Auth password — prefer UID, then studentId
    let resolvedUid = uid || studentData.uid || studentData.studentId || studentData.id || '';
    let resolvedAuthPassword = oldPassword || '';

    try {
        if (resolvedUid) {
            const profileSnap = await getDoc(doc(db, 'studentsprofile', resolvedUid));
            if (profileSnap.exists()) {
                const profileData = profileSnap.data();
                if (profileData.password) resolvedAuthPassword = profileData.password;
                if (!oldEmail && profileData.email) oldEmail = profileData.email; // Ensure we have the right email to sign in
            }
        } else {
            const emailLower = (oldEmail || '').toLowerCase().trim();
            const q = query(collection(db, 'studentsprofile'), where('email', '==', emailLower));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const profileDoc = snap.docs[0];
                resolvedUid = profileDoc.id;
                const profileData = profileDoc.data();
                if (profileData.password) resolvedAuthPassword = profileData.password;
            }
        }
    } catch (lookupError) {
        console.warn('studentsprofile lookup failed:', lookupError);
    }

    if (!resolvedUid) {
        resolvedUid = studentData.studentId || studentData.id;
    }

    // Step 2: Sign in as student with resolved current password and update to new one
    let authUpdated = false;
    if (resolvedAuthPassword) {
        let secondaryApp: any;
        try {
            const emailLower = (oldEmail || '').toLowerCase().trim();
            secondaryApp = initializeApp(firebaseConfig, `studentUpdate_${Date.now()}`);
            const secondaryAuth = initializeAuth(secondaryApp, { persistence: browserLocalPersistence });
            const userCredential = await signInWithEmailAndPassword(secondaryAuth, emailLower, resolvedAuthPassword);
            await updatePassword(userCredential.user, newPassword);
            authUpdated = true;
            console.log('✅ Firebase Auth password updated for', emailLower);
        } catch (authError: any) {
            console.warn('Auth update failed:', authError?.code, authError?.message);
        } finally {
            if (secondaryApp) { try { await deleteApp(secondaryApp); } catch (_) { } }
        }
    }

    // Step 3: Always sync studentsprofile (password field + profile data)
    try {
        const profileUpdates: any = {
            fullname: studentData.name,
            fathername: studentData.fatherName,
            class: studentData.grade,
            image: studentData.profileImage,
            gender: studentData.gender,
            section: studentData.section,
            session: studentData.session,
            phone: studentData.phone,
            rollno: studentData.rollno || studentData.studentId || '',
            email: (newEmail || '').toLowerCase().trim(),
            password: newPassword,
            isActive: studentData.isActive ?? true,
            updatedAt: serverTimestamp()
        };
        await setDoc(doc(db, 'studentsprofile', resolvedUid), profileUpdates, { merge: true });
    } catch (profileError: any) {
        console.warn('studentsprofile sync skipped:', profileError?.message);
    }

    return authUpdated ? 'updated' : 'skipped';
};

// Deletes all related records (attendance, fees, exams) for a student across the database
const deleteStudentRelatedRecords = async (student: any) => {
    try {
        const studentId = student.studentId || student.id;
        const uid = student.uid;

        // 1. Delete Attendance
        if (studentId) await deleteDoc(doc(db, 'attendance', studentId));
        if (uid && uid !== studentId) await deleteDoc(doc(db, 'attendance', uid));

        // 2. Delete Fees
        if (studentId) {
            const feesQ1 = query(collection(db, 'fees'), where('studentId', '==', studentId));
            const feesSnap1 = await getDocs(feesQ1);
            for (const d of feesSnap1.docs) { await deleteDoc(d.ref); }
        }

        if (uid && uid !== studentId) {
            const feesQ2 = query(collection(db, 'fees'), where('studentId', '==', uid));
            const feesSnap2 = await getDocs(feesQ2);
            for (const d of feesSnap2.docs) { await deleteDoc(d.ref); }
        }

        // 3. Delete Exams
        const rollNo = student.rollno || studentId;
        if (rollNo) {
            const examsQ1 = query(collection(db, 'exams'), where('rollNo', '==', rollNo));
            const examsSnap1 = await getDocs(examsQ1);
            for (const d of examsSnap1.docs) { await deleteDoc(d.ref); }
        }

        if (studentId && studentId !== rollNo) {
            const examsQ2 = query(collection(db, 'exams'), where('studentId', '==', studentId));
            const examsSnap2 = await getDocs(examsQ2);
            for (const d of examsSnap2.docs) { await deleteDoc(d.ref); }
        }

        console.log(`✅ Successfully deleted related records for student`);
    } catch (error) {
        console.error('Error deleting related records:', error);
    }
};

// Attempts to sign in as the student using their current email and password stored in studentsprofile,
// then deletes their Firebase Auth account.
const deleteStudentAuthAccount = async (student: any): Promise<boolean> => {
    let resolvedAuthPassword = student.password || '';
    const resolvedUid = student.uid || student.studentId || student.id;

    if (!resolvedAuthPassword) {
        try {
            if (resolvedUid) {
                const profileSnap = await getDoc(doc(db, 'studentsprofile', resolvedUid));
                if (profileSnap.exists() && profileSnap.data().password) {
                    resolvedAuthPassword = profileSnap.data().password;
                }
            }
            if (!resolvedAuthPassword) {
                const emailLower = (student.email || '').toLowerCase().trim();
                const q = query(collection(db, 'studentsprofile'), where('email', '==', emailLower));
                const snap = await getDocs(q);
                if (!snap.empty && snap.docs[0].data().password) {
                    resolvedAuthPassword = snap.docs[0].data().password;
                }
            }
        } catch (lookupError) {
            console.warn('studentsprofile lookup failed during delete:', lookupError);
        }
    }

    if (!resolvedAuthPassword) {
        console.warn('Could not resolve password for student auth deletion.');
        return false;
    }

    let secondaryApp: any;
    let authDeleted = false;
    try {
        const emailLower = (student.email || '').toLowerCase().trim();
        secondaryApp = initializeApp(firebaseConfig, `studentDelete_${Date.now()}`);
        const secondaryAuth = initializeAuth(secondaryApp, { persistence: browserLocalPersistence });
        const userCredential = await signInWithEmailAndPassword(secondaryAuth, emailLower, resolvedAuthPassword);
        await deleteUser(userCredential.user);
        authDeleted = true;
        console.log('✅ Firebase Auth account deleted for', emailLower);
    } catch (authError: any) {
        console.warn('Auth deletion failed:', authError?.code, authError?.message);
    } finally {
        if (secondaryApp) { try { await deleteApp(secondaryApp); } catch (_) { } }
    }

    return authDeleted;
};

export default function StudentsPage() {
    const dispatch = useAppDispatch();
    const { data: students, pendingStudents, editedStudents, status: studentsStatus } = useAppSelector((s: any) => s.students);
    const classes = useAppSelector((s: any) => s.appSettings.classes as string[]);
    const classesStatus = useAppSelector((s: any) => s.appSettings.classesStatus);
    const books = useAppSelector((s: any) => s.appSettings.books as string[]) || [];
    const groups = useAppSelector((s: any) => s.appSettings.groups as any[]) || [];
    const groupsStatus = useAppSelector((s: any) => s.appSettings.groupsStatus);
    const loading = studentsStatus === 'loading' || studentsStatus === 'idle';

    const globalSearchQuery = useAppSelector((s: any) => s.general.globalSearchQuery);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'personal' | 'academic'>('personal');
    const [filterClass, setFilterClass] = useState('');
    const [filterGroup, setFilterGroup] = useState('');
    const [filterGender, setFilterGender] = useState('');
    const [filterSession, setFilterSession] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Student | null>(null);
    const [form, setForm] = useState<Partial<Student>>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [viewStudent, setViewStudent] = useState<Student | null>(null);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [promoteModalOpen, setPromoteModalOpen] = useState(false);
    const [targetClass, setTargetClass] = useState('');
    const [targetSession, setTargetSession] = useState('');
    const [isPromoting, setIsPromoting] = useState(false);
    const [assignGroupModalOpen, setAssignGroupModalOpen] = useState(false);
    const [targetAssignGroup, setTargetAssignGroup] = useState('');
    const [isAssigningGroup, setIsAssigningGroup] = useState(false);
    const [promotionHistory, setPromotionHistory] = useState<{ id: string; oldClass: string; oldSession: string; }[] | null>(null);
    const [isUndoing, setIsUndoing] = useState(false);
    const [savingPending, setSavingPending] = useState(false);
    const [savingEdited, setSavingEdited] = useState(false);
    const [isFixing, setIsFixing] = useState(false);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [uploadingProgress, setUploadingProgress] = useState<{ current: number, total: number } | null>(null);

    const downloadTemplate = async () => {
        try {
            const XLSX = await import('xlsx');
            const ws = XLSX.utils.json_to_sheet([{
                'Name': 'Iftikhar Zahid',
                'Student ID': 'STD-26-001',
                'Class': '9th',
                'Father Name': 'Muhammad Ali',
                'Gender': 'Male',
                'Section': 'A',
                'Session': '2026-27',
                'Phone': '03001234567',
                'Email': 'Example@theseeksacademy.edu.pk',
                'Password': 'password123',
                'Roll No': '101'
            }]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Students");
            XLSX.writeFile(wb, "Students_Import_Template.xlsx");
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

                    if (!confirm(`Are you sure you want to import ${normalizedData.length} students?`)) {
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        return;
                    }

                    setUploadingProgress({ current: 0, total: normalizedData.length });

                    let successCount = 0;
                    let skippedCount = 0;
                    for (let i = 0; i < normalizedData.length; i++) {
                        const row = normalizedData[i];
                        const name = row['name'] || row['fullname'] || row['full name'] || row['student name'] || '';

                        if (!name) {
                            skippedCount++;
                            setUploadingProgress({ current: i + 1, total: normalizedData.length });
                            continue;
                        }

                        const fatherName = row['fathername'] || row['father name'] || '';
                        const grade = row['class'] || row['grade'] || '';
                        const gender = row['gender'] || '';
                        const section = row['section'] || '';
                        const session = row['session'] || '';
                        const phone = row['phone'] || row['contact'] || '';
                        const rollno = row['rollno'] || row['roll no'] || '';
                        const inputStudentId = row['student id'] || row['studentid'] || '';
                        const inputEmail = row['email'] || '';
                        const inputPassword = row['password'] || '';

                        try {
                            const newStudentId = inputStudentId || await getNextStudentId();
                            const newEmail = inputEmail || generateEmail(newStudentId);
                            const newPassword = inputPassword || generatePassword(String(name));

                            const authData = {
                                name: String(name),
                                fatherName: String(fatherName),
                                grade: String(grade),
                                profileImage: '',
                                gender: String(gender),
                                section: String(section),
                                session: String(session),
                                phone: String(phone),
                                rollno: String(rollno),
                                studentId: newStudentId,
                                isActive: true,
                            };

                            const uid = await createStudentAuthAccount(newEmail, newPassword, authData);

                            const payload = {
                                name: String(name),
                                fatherName: String(fatherName),
                                studentId: newStudentId,
                                email: newEmail,
                                password: newPassword,
                                grade: String(grade),
                                gender: String(gender),
                                section: String(section),
                                session: String(session),
                                phone: String(phone),
                                rollno: String(rollno),
                                profileImage: '',
                                uid: uid || '',
                                isActive: true,
                            };

                            await setDoc(doc(db, 'students', newStudentId), { ...payload, updatedAt: serverTimestamp() });
                            dispatch(addOrUpdateStudent({ id: newStudentId, ...payload, isActive: true } as Student));

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

    useEffect(() => {
        if (studentsStatus === 'idle') {
            dispatch(fetchStudents());
        }
        if (classesStatus === 'idle') {
            dispatch(fetchClasses());
            dispatch(fetchBooks());
        }
        if (groupsStatus === 'idle' || !groupsStatus) {
            dispatch(fetchGroups());
        }
    }, [dispatch, studentsStatus, classesStatus, groupsStatus]);

    const activeSearch = search || globalSearchQuery;

    const filtered = students.filter((s: any) => {
        const matchClass = !filterClass || s.grade === filterClass;
        const matchGroup = !filterGroup || s.section === filterGroup;
        const matchGender = !filterGender || String(s.gender || '').toLowerCase() === filterGender.toLowerCase();
        const matchSession = !filterSession || s.session === filterSession;
        const q = activeSearch.toLowerCase();
        const strName = String(s.name || '').toLowerCase();
        const strEmail = String(s.email || '').toLowerCase();
        const strRollno = String(s.rollno || '').toLowerCase();
        const strStudentId = String(s.studentId || '').toLowerCase();

        const matchSearch = !q || strName.includes(q) || strEmail.includes(q) || strRollno.includes(q) || strStudentId.includes(q);

        return matchClass && matchGroup && matchGender && matchSession && matchSearch;
    });

    const uniqueSessions = Array.from(new Set(students.map((s: any) => s.session).filter(Boolean))).sort();

    useEffect(() => {
        setSelectedStudents([]);
    }, [activeSearch, filterClass, filterGroup, filterGender, filterSession]);

    const toggleSelectAll = (checked: boolean) => {
        if (checked) setSelectedStudents(filtered.map((s: any) => s.id));
        else setSelectedStudents([]);
    };

    const toggleSelectStudent = (id: string, checked: boolean) => {
        if (checked) setSelectedStudents(prev => [...prev, id]);
        else setSelectedStudents(prev => prev.filter(sId => sId !== id));
    };

    const handlePromote = async () => {
        if (!targetClass) { alert('Please select a target class.'); return; }
        if (!confirm(`Are you sure you want to promote ${selectedStudents.length} students to ${targetClass}?`)) return;

        setIsPromoting(true);
        const history: { id: string; oldClass: string; oldSession: string; }[] = [];
        try {
            for (const sId of selectedStudents) {
                const student = students.find((s: any) => s.id === sId);
                if (!student) continue;

                history.push({ id: sId, oldClass: student.grade, oldSession: student.session || '' });

                const updateData: any = { grade: targetClass, updatedAt: serverTimestamp() };
                if (targetSession) updateData.session = targetSession;

                await setDoc(doc(db, 'students', sId), updateData, { merge: true });

                const profileUpdateData: any = { class: targetClass, updatedAt: serverTimestamp() };
                if (targetSession) profileUpdateData.session = targetSession;

                if (student.uid) {
                    await setDoc(doc(db, 'studentsprofile', student.uid), profileUpdateData, { merge: true });
                } else if (student.studentId) {
                    await setDoc(doc(db, 'studentsprofile', student.studentId), profileUpdateData, { merge: true });
                }

                dispatch(addOrUpdateStudent({ ...student, grade: targetClass, ...(targetSession ? { session: targetSession } : {}) }));
            }
            setPromotionHistory(history);
            alert('Students promoted successfully!');
            setSelectedStudents([]);
            setPromoteModalOpen(false);
            setTargetClass('');
            setTargetSession('');
        } catch (err) {
            console.error('Promotion error:', err);
            alert('Failed to promote some students.');
        } finally {
            setIsPromoting(false);
        }
    };

    const handleAssignGroup = async () => {
        if (!targetAssignGroup) { alert('Please select a target group.'); return; }
        if (!confirm(`Are you sure you want to assign ${selectedStudents.length} students to ${targetAssignGroup}?`)) return;

        setIsAssigningGroup(true);
        try {
            for (const sId of selectedStudents) {
                const student = students.find((s: any) => s.id === sId);
                if (!student) continue;

                const updateData: any = { section: targetAssignGroup, updatedAt: serverTimestamp() };
                await setDoc(doc(db, 'students', sId), updateData, { merge: true });

                const profileUpdateData: any = { section: targetAssignGroup, updatedAt: serverTimestamp() };
                if (student.uid) {
                    await setDoc(doc(db, 'studentsprofile', student.uid), profileUpdateData, { merge: true });
                } else if (student.studentId) {
                    await setDoc(doc(db, 'studentsprofile', student.studentId), profileUpdateData, { merge: true });
                }

                dispatch(addOrUpdateStudent({ ...student, section: targetAssignGroup }));
            }
            alert('Students assigned to group successfully!');
            setSelectedStudents([]);
            setAssignGroupModalOpen(false);
            setTargetAssignGroup('');
        } catch (err) {
            console.error('Assign group error:', err);
            alert('Failed to assign group to some students.');
        } finally {
            setIsAssigningGroup(false);
        }
    };

    const handleUndoPromotion = async () => {
        if (!promotionHistory) return;
        if (!confirm(`Are you sure you want to undo the promotion for ${promotionHistory.length} students?`)) return;

        setIsUndoing(true);
        try {
            for (const record of promotionHistory) {
                const student = students.find((s: any) => s.id === record.id);
                if (!student) continue;

                const updateData: any = { grade: record.oldClass, session: record.oldSession, updatedAt: serverTimestamp() };

                await setDoc(doc(db, 'students', record.id), updateData, { merge: true });

                const profileUpdateData: any = { class: record.oldClass, session: record.oldSession, updatedAt: serverTimestamp() };

                if (student.uid) {
                    await setDoc(doc(db, 'studentsprofile', student.uid), profileUpdateData, { merge: true });
                } else if (student.studentId) {
                    await setDoc(doc(db, 'studentsprofile', student.studentId), profileUpdateData, { merge: true });
                }

                dispatch(addOrUpdateStudent({ ...student, grade: record.oldClass, session: record.oldSession }));
            }
            alert('Promotion reversed successfully!');
            setPromotionHistory(null);
        } catch (err) {
            console.error('Undo Promotion error:', err);
            alert('Failed to undo promotion for some students.');
        } finally {
            setIsUndoing(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedStudents.length === 0) return;
        if (!confirm(`Are you sure you want to permanently delete ${selectedStudents.length} selected students? This action cannot be undone.`)) return;

        try {
            for (const sId of selectedStudents) {
                const student = students.find((s: any) => s.id === sId);
                if (!student) continue;

                if (student.isPending) {
                    dispatch(removePendingStudent(sId));
                    continue;
                }

                if (student.email) {
                    await deleteStudentAuthAccount(student);
                }

                dispatch(removeStudent(sId));

                await deleteDoc(doc(db, 'students', sId));

                if (student.uid) {
                    await deleteDoc(doc(db, 'studentsprofile', student.uid));
                    await deleteDoc(doc(db, 'profile', student.uid));
                }
                if (student.studentId) {
                    await deleteDoc(doc(db, 'studentsprofile', student.studentId));
                    await deleteDoc(doc(db, 'profile', student.studentId));
                }

                // Cascade delete to related records
                await deleteStudentRelatedRecords(student);
            }
            alert('Selected students deleted successfully.');
            setSelectedStudents([]);
        } catch (error) {
            console.error('Error deleting students:', error);
            alert('Failed to completely delete some records from Firebase.');
        }
    };

    const saveAllPending = async () => {
        if (!confirm(`Are you sure you want to save ${pendingStudents.length} new students to the database?`)) return;

        setSavingPending(true);
        let successCount = 0;
        let errors = 0;
        const successfulTempIds: string[] = [];

        for (const student of pendingStudents) {
            try {
                const newStudentId = await getNextStudentId();
                const newEmail = generateEmail(newStudentId);
                const newPassword = generatePassword(student.name);

                const authData = {
                    name: student.name,
                    fatherName: student.fatherName,
                    grade: student.grade,
                    profileImage: student.profileImage,
                    gender: student.gender,
                    section: student.section,
                    session: student.session,
                    phone: student.phone,
                    rollno: student.rollno,
                    studentId: newStudentId,
                };

                const uid = await createStudentAuthAccount(newEmail, newPassword, authData);

                const finalPayload = {
                    ...student,
                    id: newStudentId,
                    studentId: newStudentId,
                    email: newEmail,
                    password: newPassword,
                    uid: uid || '',
                };
                delete finalPayload.isPending;

                await setDoc(doc(db, 'students', newStudentId), { ...finalPayload, updatedAt: serverTimestamp() });

                dispatch(removeStudent(student.id));
                dispatch(addOrUpdateStudent(finalPayload as Student));

                successfulTempIds.push(student.id);
                successCount++;
            } catch (err) {
                console.error("Failed to save pending student:", student.name, err);
                errors++;
            }
        }

        dispatch(removeSuccessfulPendingStudents(successfulTempIds));
        setSavingPending(false);

        if (errors > 0) {
            alert(`Saved ${successCount} students. ${errors} failed.`);
        } else {
            alert(`Successfully saved all ${successCount} new students!`);
        }
    };

    const saveAllEdited = async () => {
        if (!confirm(`Are you sure you want to save ${editedStudents.length} edited students to the database?`)) return;

        setSavingEdited(true);
        let successCount = 0;
        let errors = 0;
        const successfulIds: string[] = [];

        for (const student of editedStudents) {
            try {
                const authResult = await updateStudentAuthAccount(
                    student._originalEmail || student.email,
                    student._originalPassword || student.password,
                    student.email,
                    student.password,
                    student,
                    student.uid
                );

                const dbPayload = { ...student };
                delete dbPayload._originalEmail;
                delete dbPayload._originalPassword;

                await setDoc(doc(db, 'students', student.id), { ...dbPayload, updatedAt: serverTimestamp() }, { merge: true });
                successfulIds.push(student.id);
                successCount++;
            } catch (err) {
                console.error("Failed to save edited student:", student.name, err);
                errors++;
            }
        }

        dispatch(removeSuccessfulEditedStudents(successfulIds));
        setSavingEdited(false);

        if (errors > 0) {
            alert(`Saved ${successCount} edited students. ${errors} failed.`);
        } else {
            alert(`Successfully saved all ${successCount} edited students!`);
        }
    };

    const handleFixCredentials = async () => {
        if (!viewStudent) return;
        if (!viewStudent.email || !viewStudent.password) {
            alert("Email and password are required. Please edit the student first.");
            return;
        }

        if (!confirm("This will test the current credentials and recreate the Auth account if it is broken. Do you want to continue?")) return;

        setIsFixing(true);
        let secondaryApp: any;
        try {
            secondaryApp = initializeApp(firebaseConfig, `studentFix_${Date.now()}`);
            const secondaryAuth = initializeAuth(secondaryApp, { persistence: browserLocalPersistence });
            
            try {
                // Try logging in to check if credentials are fine
                await signInWithEmailAndPassword(secondaryAuth, viewStudent.email, viewStudent.password);
                alert("✅ Credentials are correct! The student should be able to log in without issues.");
            } catch (err: any) {
                // If login fails, try recreating the account
                if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                    try {
                        const creds = await createUserWithEmailAndPassword(secondaryAuth, viewStudent.email, viewStudent.password);
                        const uid = creds.user.uid;
                        
                        // Update students and studentsprofile with new UID
                        await setDoc(doc(db, 'students', viewStudent.id), { uid, updatedAt: serverTimestamp() }, { merge: true });
                        await setDoc(doc(db, 'studentsprofile', uid), {
                            fullname: viewStudent.name,
                            fathername: viewStudent.fatherName,
                            class: viewStudent.grade,
                            image: viewStudent.profileImage || '',
                            gender: viewStudent.gender,
                            section: viewStudent.section,
                            session: viewStudent.session,
                            phone: viewStudent.phone,
                            rollno: viewStudent.rollno || viewStudent.studentId || '',
                            email: viewStudent.email,
                            password: viewStudent.password,
                            role: 'student',
                            isActive: viewStudent.isActive ?? true,
                            updatedAt: serverTimestamp()
                        }, { merge: true });

                        dispatch(addOrUpdateStudent({ ...viewStudent, uid }));
                        alert("✅ Fixed! Auth account recreated successfully with the current email and password.");
                    } catch (createErr: any) {
                        if (createErr.code === 'auth/email-already-in-use') {
                            alert("❌ The email is already in use by a broken account. Please click 'Edit Details', change the email slightly (e.g. std-101-1@...), save, and try fixing again.");
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

    const exportSelected = async () => {
        try {
            const XLSX = await import('xlsx');
            const dataToExport = selectedStudents.map(id => {
                const s = students.find((st: any) => st.id === id);
                if (!s) return null;
                return {
                    'Name': s.name || '',
                    'Student ID': s.studentId || '',
                    'Class': s.grade || '',
                    'Father Name': s.fatherName || '',
                    'Gender': s.gender || '',
                    'Section': s.section || '',
                    'Session': s.session || '',
                    'Phone': s.phone || '',
                    'Email': s.email || '',
                    'Password': s.password || '',
                    'Roll No': s.rollno || '',
                };
            }).filter(Boolean);

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Students");
            XLSX.writeFile(wb, "Selected_Students_Export.xlsx");
        } catch (error) {
            alert('Failed to export data.');
        }
    };

    const openAdd = () => { setEditing(null); setForm(emptyForm()); setActiveTab('personal'); setModalOpen(true); };
    const openEdit = (s: Student) => { setEditing(s); setForm({ ...s }); setActiveTab('personal'); setModalOpen(true); };

    const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newGrade = e.target.value;
        let autoRollno = form.rollno;

        if (!editing && newGrade) {
            const studentsInClass = students.filter((s: Student) => s.grade === newGrade);
            let maxRoll = 0;
            for (const s of studentsInClass) {
                if (s.rollno) {
                    const r = parseInt(s.rollno, 10);
                    if (!isNaN(r) && r > maxRoll) {
                        maxRoll = r;
                    }
                }
            }
            autoRollno = String(maxRoll + 1);
        }

        setForm(p => ({ ...p, grade: newGrade, rollno: autoRollno }));
    };

    const save = async () => {
        if (!form.name || !form.fatherName) { alert('Name and Father Name are required.'); return; }
        setSaving(true);
        try {
            if (editing) {
                if ((editing as any).isPending) {
                    // --- EDIT pending student ---
                    const id = editing.id;
                    const payload = {
                        ...editing,
                        name: form.name || '',
                        fatherName: form.fatherName || '',
                        grade: form.grade || '',
                        gender: form.gender || '',
                        section: form.section || '',
                        session: form.session || '',
                        phone: form.phone || '',
                        rollno: form.rollno || '',
                        profileImage: form.profileImage || '',
                        subjects: form.subjects || [],
                    };

                    dispatch(updatePendingStudent(payload as Student));
                    setModalOpen(false);
                    setSaving(false);
                    return;
                }

                // --- EDIT existing student ---
                const id = editing.id;
                const payload = {
                    ...editing,
                    name: form.name || '',
                    fatherName: form.fatherName || '',
                    studentId: id,
                    email: form.email || '',
                    grade: form.grade || '',
                    gender: form.gender || '',
                    section: form.section || '',
                    session: form.session || '',
                    phone: form.phone || '',
                    rollno: form.rollno || '',
                    profileImage: form.profileImage || '',
                    password: form.password || '',
                    subjects: form.subjects || [],
                    isActive: (editing as any).isActive ?? true,
                    _originalEmail: '_originalEmail' in editing ? (editing as any)._originalEmail : editing.email,
                    _originalPassword: '_originalPassword' in editing ? (editing as any)._originalPassword : editing.password
                };

                dispatch(addEditedStudent(payload as Student));
                setModalOpen(false);
            } else {
                // --- ADD new student: add to pending list ---
                const tempId = `temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                const payload = {
                    id: tempId,
                    name: form.name || '',
                    fatherName: form.fatherName || '',
                    studentId: 'Pending...',
                    email: 'Pending...',
                    password: '',
                    grade: form.grade || '',
                    gender: form.gender || '',
                    section: form.section || '',
                    session: form.session || '',
                    phone: form.phone || '',
                    rollno: form.rollno || '',
                    profileImage: form.profileImage || '',
                    uid: '',
                    isPending: true,
                    subjects: form.subjects || [],
                    isActive: true,
                };

                dispatch(addPendingStudent(payload as Student));
                setModalOpen(false);
            }
        } catch (e: any) {
            if (e?.code === 'auth/email-already-in-use') {
                alert('An account with this email already exists.');
            } else {
                alert('Failed to save. Please try again.');
            }
        }
        setSaving(false);
    };

    const remove = async (s: any) => {
        if (!confirm('Delete this student record?')) return;
        setDeleting(s.id);

        if (s.isPending) {
            dispatch(removePendingStudent(s.id));
            setDeleting(null);
            return;
        }

        try {
            if (s.email) {
                await deleteStudentAuthAccount(s);
            }

            // Optimistic UI update
            dispatch(removeStudent(s.id));

            // Finalize backend
            await deleteDoc(doc(db, 'students', s.id));

            // Delete associated profile documents if they exist
            if (s.uid) {
                await deleteDoc(doc(db, 'studentsprofile', s.uid));
                await deleteDoc(doc(db, 'profile', s.uid));
            }
            if (s.studentId) {
                await deleteDoc(doc(db, 'studentsprofile', s.studentId));
                await deleteDoc(doc(db, 'profile', s.studentId));
            }

            // Cascade delete to related records
            await deleteStudentRelatedRecords(s);
        } catch (error) {
            console.error('Error deleting student:', error);
            alert('Failed to completely delete the record from Firebase.');
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="page" style={{ padding: '0px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="page-header" style={{ padding: '10px 20px 5px 20px', background: 'var(--card)', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>👥 Student Directory</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>Manage and view enrolled students</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {editedStudents?.length > 0 && (
                            <button className="btn btn-primary" onClick={saveAllEdited} disabled={savingEdited} style={{ padding: '5px 12px', fontSize: 12, height: 30, background: '#3b82f6', borderColor: '#3b82f6', color: '#fff', fontWeight: 'bold', boxShadow: '0 0 8px rgba(59,130,246,0.6)' }}>
                                {savingEdited ? 'Saving...' : `💾 Save ${editedStudents.length} Edited`}
                            </button>
                        )}
                        {pendingStudents?.length > 0 && (
                            <button className="btn btn-primary" onClick={saveAllPending} disabled={savingPending} style={{ padding: '5px 12px', fontSize: 12, height: 30, background: '#f59e0b', borderColor: '#f59e0b', color: '#fff', fontWeight: 'bold' }}>
                                {savingPending ? 'Saving...' : `💾 Save ${pendingStudents.length} New`}
                            </button>
                        )}
                        {promotionHistory && (
                            <button className="btn btn-primary" onClick={handleUndoPromotion} disabled={isUndoing} style={{ padding: '5px 12px', fontSize: 12, height: 30, background: '#ef4444', borderColor: '#ef4444' }}>
                                {isUndoing ? 'Undoing...' : `↩️ Undo Promote (${promotionHistory.length})`}
                            </button>
                        )}
                        {selectedStudents.length > 0 && (
                            <>
                                <button className="btn btn-ghost" onClick={exportSelected} style={{ padding: '5px 12px', fontSize: 12, height: 30, border: '1px solid var(--border)', background: 'var(--card)' }}>
                                    ⬇️ Export ({selectedStudents.length})
                                </button>
                                <button className="btn btn-primary" onClick={() => setPromoteModalOpen(true)} style={{ padding: '5px 12px', fontSize: 12, height: 30, background: '#10b981', borderColor: '#10b981' }}>
                                    🎓 Promote ({selectedStudents.length})
                                </button>
                                <button className="btn btn-primary" onClick={() => setAssignGroupModalOpen(true)} style={{ padding: '5px 12px', fontSize: 12, height: 30, background: '#8b5cf6', borderColor: '#8b5cf6' }}>
                                    👥 Assign Group ({selectedStudents.length})
                                </button>
                                <button className="btn btn-primary" onClick={handleBulkDelete} style={{ padding: '5px 12px', fontSize: 12, height: 30, background: '#ef4444', borderColor: '#ef4444' }}>
                                    🗑️ Delete ({selectedStudents.length})
                                </button>
                            </>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px' }}>
                            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Total</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>{filtered.length}</span>
                            <span style={{ fontSize: 10, color: 'var(--text2)' }}>{(filterClass || filterGroup || filterGender || filterSession || search) ? 'found' : 'students'}</span>
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
            <div className="responsive-filter-bar" style={{ padding: '5px 20px 10px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
                <div className="search-box" style={{ flex: 1.5, background: 'var(--bg3)', margin: 0, height: 30, minHeight: 'unset', display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <span className="search-icon" style={{ fontSize: 12, marginRight: 6 }}>🔍</span>
                    <input
                        placeholder="Search name, ID, email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ background: 'transparent', fontSize: 12, border: 'none', outline: 'none', flex: 1, color: 'var(--text)' }}
                    />
                </div>
                <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', maxWidth: 160 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                    <option value="">All Classes</option>
                    {sortClasses(classes).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', maxWidth: 160 }} value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
                    <option value="">All Groups</option>
                    {groups.map((g: any) => { const grp = g.name || g; return <option key={grp} value={grp}>{grp}</option>; })}
                </select>
                <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', maxWidth: 160 }} value={filterSession} onChange={e => setFilterSession(e.target.value)}>
                    <option value="">All Sessions</option>
                    {uniqueSessions.map(session => <option key={session as string} value={session as string}>{session as string}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 6, padding: 2, border: '1px solid var(--border)' }}>
                    {['', 'Male', 'Female'].map(g => (
                        <button key={g} onClick={() => setFilterGender(g)} style={{ padding: '2px 8px', height: 26, fontSize: 11, borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: filterGender === g ? 700 : 400, background: filterGender === g ? 'var(--primary)' : 'transparent', color: filterGender === g ? '#fff' : 'var(--text2)', transition: 'all 0.15s' }}>
                            {g === '' ? 'All' : g === 'Male' ? '👦 Boys' : '👧 Girls'}
                        </button>
                    ))}
                </div>
                {(search || filterClass || filterGroup || filterGender || filterSession) && (
                    <button className="btn btn-ghost" style={{ height: 30, fontSize: 11, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', padding: '0 10px' }} onClick={() => { setSearch(''); setFilterClass(''); setFilterGroup(''); setFilterGender(''); setFilterSession(''); }}>
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
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', width: 30, textAlign: 'center' }}>
                                            <input type="checkbox"
                                                checked={selectedStudents.length === filtered.length && filtered.length > 0}
                                                onChange={e => toggleSelectAll(e.target.checked)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', width: 40, textAlign: 'center', color: '#ffffff' }}>#</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', width: '1%', whiteSpace: 'nowrap' }}>Student ID</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', minWidth: 150 }}>Name</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.95)', minWidth: 120 }}>Father</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', textAlign: 'center', color: '#ffffff', width: 80 }}>Gender</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', minWidth: 80 }}>Class</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', minWidth: 80 }}>Group</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', minWidth: 110 }}>Phone</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', minWidth: 150 }}>Email</th>
                                        <th style={{ padding: '7px 10px', textAlign: 'center', width: 120, borderLeft: '1px solid rgba(255,255,255,0.15)', color: '#ffffff' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? <tr><td colSpan={12} className="empty" style={{ padding: '30px', fontSize: 12 }}>No students found matching filters</td></tr>
                                        : filtered.map((s: any, i: number) => {
                                            const sGender = String(s.gender || '').toLowerCase();
                                            const rowNum = i + 1;
                                            return (
                                                <tr key={s.id} onClick={() => setViewStudent(s)} style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--card)' : 'var(--bg3)' }}>
                                                    <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', textAlign: 'center' }}>
                                                        <input type="checkbox"
                                                            checked={selectedStudents.includes(s.id)}
                                                            onChange={e => toggleSelectStudent(s.id, e.target.checked)}
                                                            onClick={e => e.stopPropagation()}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', textAlign: 'center', fontSize: 11, color: 'var(--text2)' }}>{rowNum}</td>
                                                    <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontFamily: 'monospace', color: 'var(--primary-light)', fontSize: 12 }}>{s.studentId}</td>
                                                    <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div className="avatar" style={{ width: 26, height: 26, fontSize: 12, flexShrink: 0, background: `${avatarColor(String(s.name || ''))}22`, color: avatarColor(String(s.name || '')), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                {s.profileImage ? <img src={s.profileImage} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (sGender === 'female' ? <FcBusinesswoman size={24} /> : sGender === 'male' ? <FcBusinessman size={24} /> : String(s.name || 'S').charAt(0).toUpperCase())}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>{s.name}</div>
                                                                {s.rollno && <div style={{ fontSize: 10, color: 'var(--text2)' }}>Roll: {s.rollno}</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 11, color: 'var(--text2)' }}>{s.fatherName || '—'}</td>
                                                    <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', textAlign: 'center' }}>
                                                        {sGender ? (
                                                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: sGender === 'male' ? 'rgba(99,102,241,0.12)' : 'rgba(236,72,153,0.12)', color: sGender === 'male' ? '#818cf8' : '#ec4899' }}>
                                                                {sGender === 'male' ? '♂ M' : '♀ F'}
                                                            </span>
                                                        ) : <span style={{ color: 'var(--text2)', fontSize: 11 }}>—</span>}
                                                    </td>
                                                    <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 12 }}>{s.grade || '—'}</td>
                                                    <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)' }}>{s.section || '—'}</td>
                                                    <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 12, color: 'var(--text)' }}>{s.phone || '—'}</td>
                                                    <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 11, color: 'var(--text2)' }}>{s.email || '—'}</td>
                                                    <td style={{ padding: '5px 10px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                                                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                                            <div 
                                                                onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    const nextActive = s.isActive === false; 
                                                                    dispatch(toggleStudentActiveStatus({ student: s, nextActive }));
                                                                }}
                                                                style={{
                                                                    width: 44, height: 24, borderRadius: 12,
                                                                    background: s.isActive === false ? 'linear-gradient(to bottom, #ef4444, #dc2626)' : 'linear-gradient(to bottom, #10b981, #059669)',
                                                                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4), 0 1px 1px rgba(255,255,255,0.1)',
                                                                    position: 'relative', cursor: 'pointer', transition: 'background 0.3s ease',
                                                                    display: 'flex', alignItems: 'center', padding: '0 3px', marginRight: 8
                                                                }}
                                                                title={s.isActive === false ? 'Click to Activate' : 'Click to Deactivate'}
                                                            >
                                                                <div style={{
                                                                    width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(to bottom, #ffffff, #f0f0f0)',
                                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 #ffffff', transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                                                                    transform: s.isActive === false ? 'translateX(0px)' : 'translateX(20px)'
                                                                }} />
                                                            </div>
                                                            <button className="btn btn-ghost" style={{ padding: '3px', height: 26, width: 26, color: '#ef4444', background: 'rgba(239,68,68,0.1)' }} disabled={deleting === s.id} onClick={(e) => { e.stopPropagation(); remove(s); }}>
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

                </div>
            )}

            {/* ── Import Modal ────────────────────────────────────────────────────── */}
            {importModalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setImportModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: 450 }}>
                        <div className="modal-header">
                            <div className="modal-title">Bulk Import Students</div>
                            <button className="modal-close" onClick={() => setImportModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ background: 'rgba(59,130,246,0.08)', padding: 16, borderRadius: 10, border: '1px solid rgba(59,130,246,0.2)' }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 16 }}>1️⃣</span> Download Template
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.5 }}>
                                    Download the exact Excel template required for importing. Fill it with your students data without modifying the column headers.
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
                                    Select your filled template to automatically create student accounts and profiles.
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
            {/* Promote Modal */}
            {promoteModalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPromoteModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <div className="modal-title">Promote Students</div>
                            <button className="modal-close" onClick={() => setPromoteModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                                You are about to promote <strong>{selectedStudents.length}</strong> selected student(s).
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Target Class</label>
                                <select className="form-input" value={targetClass} onChange={e => setTargetClass(e.target.value)}>
                                    <option value="">Select Class</option>
                                    {sortClasses(classes).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Target Session (Optional)</label>
                                <input className="form-input" list="target-session-list" placeholder="e.g. 2025-2026" value={targetSession} onChange={e => setTargetSession(e.target.value)} />
                                <datalist id="target-session-list">
                                    {['2025-2026', '2026-2027', '2027-2028', '2028-2029'].map(s => <option key={s} value={s} />)}
                                    {uniqueSessions.filter(s => !['2025-2026', '2026-2027', '2027-2028', '2028-2029'].includes(s as string)).map(s => <option key={s as string} value={s as string} />)}
                                </datalist>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                                <button className="btn btn-ghost" onClick={() => setPromoteModalOpen(false)}>Cancel</button>
                                <button className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }} onClick={handlePromote} disabled={isPromoting || !targetClass}>
                                    {isPromoting ? 'Promoting...' : 'Confirm Promote'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Group Modal */}
            {assignGroupModalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAssignGroupModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <div className="modal-title">Assign Group</div>
                            <button className="modal-close" onClick={() => setAssignGroupModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                                You are about to assign <strong>{selectedStudents.length}</strong> selected student(s) to a new group/section.
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Target Group</label>
                                <select className="form-input" value={targetAssignGroup} onChange={e => setTargetAssignGroup(e.target.value)}>
                                    <option value="">Select Group</option>
                                    {groups.map((g: any) => { const grp = g.name || g; return <option key={grp} value={grp}>{grp}</option>; })}
                                </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                                <button className="btn btn-ghost" onClick={() => setAssignGroupModalOpen(false)}>Cancel</button>
                                <button className="btn btn-primary" style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }} onClick={handleAssignGroup} disabled={isAssigningGroup || !targetAssignGroup}>
                                    {isAssigningGroup ? 'Assigning...' : 'Confirm Assign'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {modalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <div className="modal-title">{editing ? 'Edit Student' : 'Add Student'}</div>
                            <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
                                <button
                                    onClick={() => setActiveTab('personal')}
                                    style={{
                                        flex: 1, padding: '10px', background: 'transparent', border: 'none',
                                        borderBottom: activeTab === 'personal' ? '2px solid var(--primary)' : '2px solid transparent',
                                        color: activeTab === 'personal' ? 'var(--primary)' : 'var(--text2)',
                                        fontWeight: activeTab === 'personal' ? 700 : 500, cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}>
                                    👤 Personal Information
                                </button>
                                <button
                                    onClick={() => setActiveTab('academic')}
                                    style={{
                                        flex: 1, padding: '10px', background: 'transparent', border: 'none',
                                        borderBottom: activeTab === 'academic' ? '2px solid var(--primary)' : '2px solid transparent',
                                        color: activeTab === 'academic' ? 'var(--primary)' : 'var(--text2)',
                                        fontWeight: activeTab === 'academic' ? 700 : 500, cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}>
                                    📚 Academic Information
                                </button>
                            </div>

                            {activeTab === 'personal' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    {/* Personal fields */}
                                    {[
                                        { label: 'Full Name *', key: 'name', placeholder: 'e.g. Ahmed Ali', type: 'text' },
                                        { label: 'Father Name *', key: 'fatherName', placeholder: 'e.g. Ali Khan', type: 'text' },
                                        { label: 'Gender', key: 'gender', placeholder: 'Select Gender', type: 'select', options: GENDER_OPTIONS },
                                        { label: 'Class', key: 'grade', placeholder: 'Select Class', type: 'select', options: sortClasses(classes), onChangeOverride: handleClassChange },
                                        { label: 'Phone', key: 'phone', placeholder: '03001234567', type: 'text' },
                                        { label: 'Profile Image URL', key: 'profileImage', placeholder: 'https://...', type: 'text' },
                                        { label: 'Session', key: 'session', placeholder: 'e.g. 2024-2025', type: 'text' },
                                        { label: 'Section', key: 'section', placeholder: 'Select Section', type: 'select', options: groups.map((g: any) => g.name || g) },
                                    ].map(f => (
                                        <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>{f.label}</label>
                                            {f.type === 'select' ? (
                                                <select className="form-input" value={(form as any)[f.key] || ''} onChange={(e: any) => f.onChangeOverride ? f.onChangeOverride(e) : setForm(p => ({ ...p, [f.key]: e.target.value }))}>
                                                    <option value="">{f.placeholder}</option>
                                                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            ) : (
                                                <input className="form-input" placeholder={f.placeholder} value={(form as any)[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                                            )}
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Roll No</label>
                                        <input className="form-input" placeholder="e.g. 101  (leave blank for auto-entry)" value={form.rollno || ''} onChange={e => setForm(p => ({ ...p, rollno: e.target.value }))} />
                                    </div>

                                    {/* Email & Password: auto-generated for new, editable for edit */}
                                    {editing && !((editing as any).isPending) ? (
                                        <>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Email</label>
                                                <input className="form-input" placeholder="student@theseeksacademy.edu.pk" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Password</label>
                                                <input className="form-input" placeholder="Portal login password" value={form.password || ''} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ gridColumn: '1 / -1', background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.35)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: 18 }}>🔑</span>
                                            <div>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>Credentials Auto-Generated</div>
                                                <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>A unique Student ID, email (<em>std-YYNNN@theseeksacademy.edu.pk</em>), and password will be created automatically when you save.</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'academic' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Assigned Subjects</div>
                                    <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Select the subjects this student is enrolled in.</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                        {books.map((book: string) => {
                                            const isChecked = (form.subjects || []).includes(book);
                                            return (
                                                <label key={book} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', background: isChecked ? 'rgba(99,102,241,0.08)' : 'var(--bg3)', border: isChecked ? '1px solid var(--primary-light)' : '1px solid var(--border)', borderRadius: 6, transition: 'all 0.2s' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            const currentSubjects = form.subjects || [];
                                                            if (e.target.checked) {
                                                                setForm(p => ({ ...p, subjects: [...currentSubjects, book] }));
                                                            } else {
                                                                setForm(p => ({ ...p, subjects: currentSubjects.filter((s: string) => s !== book) }));
                                                            }
                                                        }}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: isChecked ? 600 : 400 }}>{book}</span>
                                                </label>
                                            );
                                        })}
                                        {books.length === 0 && (
                                            <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--text2)', padding: '20px', textAlign: 'center', background: 'var(--bg3)', borderRadius: 8 }}>
                                                No subjects found. Please configure subjects in the Settings page.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save Student'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {viewStudent && (
                <div className="modal-overlay" onClick={() => setViewStudent(null)}>
                    <div className="modal" style={{ maxWidth: 400, padding: 0, overflow: 'hidden', background: 'var(--card)' }} onClick={e => e.stopPropagation()}>
                        {/* ID Card Header Banner */}
                        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', height: 100, position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 12, right: 16, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 4, color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>ID: {viewStudent.studentId}</div>
                            <button onClick={() => setViewStudent(null)} style={{ position: 'absolute', top: 12, left: 16, background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✕</button>
                        </div>

                        {/* Profile Area */}
                        <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -40, position: 'relative' }}>
                            <div className="avatar" style={{ width: 80, height: 80, fontSize: 32, flexShrink: 0, background: (!viewStudent.profileImage && (String(viewStudent.gender || '').toLowerCase() === 'female' || String(viewStudent.gender || '').toLowerCase() === 'male')) ? '#f3f4f6' : `${avatarColor(viewStudent.name)}`, color: '#fff', border: '4px solid var(--card)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                {viewStudent.profileImage ? <img src={viewStudent.profileImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (String(viewStudent.gender || '').toLowerCase() === 'female' ? <FcBusinesswoman size={60} /> : String(viewStudent.gender || '').toLowerCase() === 'male' ? <FcBusinessman size={60} /> : String(viewStudent.name || 'S').charAt(0).toUpperCase())}
                            </div>
                            <div style={{ marginTop: 12, textAlign: 'center' }}>
                                <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--text)', letterSpacing: -0.5 }}>{viewStudent.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                                    {viewStudent.grade && <span style={{ color: 'var(--primary)' }}>{viewStudent.grade}</span>}
                                    {viewStudent.section && <><span>•</span><span>{viewStudent.section}</span></>}
                                </div>
                            </div>
                        </div>

                        {/* ID Details Grid */}
                        <div style={{ padding: '0 24px 20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--bg3)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                                {[
                                    ['Father Name', viewStudent.fatherName],
                                    ['Roll No', viewStudent.rollno],
                                    ['Session', viewStudent.session],
                                    ['Section', viewStudent.section],
                                    ['Phone', viewStudent.phone],
                                    ['Gender', viewStudent.gender],
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
                                        {viewStudent.email ? (
                                            <span style={{ color: 'var(--text)', fontWeight: 700, fontFamily: 'monospace', background: 'var(--card)', padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', userSelect: 'all' }}>{viewStudent.email}</span>
                                        ) : (
                                            <span style={{ color: 'var(--text2)', fontStyle: 'italic', fontSize: 10 }}>Not Assigned</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                        <span style={{ color: 'var(--text2)', fontWeight: 600 }}>Password</span>
                                        {viewStudent.password ? (
                                            <span style={{ color: 'var(--text)', fontWeight: 700, fontFamily: 'monospace', background: 'var(--card)', padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', userSelect: 'all' }}>{viewStudent.password}</span>
                                        ) : (
                                            <span style={{ color: 'var(--text2)', fontStyle: 'italic', fontSize: 10 }}>Not Assigned</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                                <button className="btn btn-ghost" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', fontSize: 12, fontWeight: 700, background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }} onClick={() => setViewStudent(null)}>Close</button>
                                <button className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }} onClick={() => { setViewStudent(null); openEdit(viewStudent); }}>Edit Details</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
