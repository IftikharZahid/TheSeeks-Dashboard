import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { collection, getDocs, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';

export interface Exam {
    id: string;
    class: string;
    testNo: string;
    subject: string;
    date: string;
    totalMarks: string;
    students: Record<string, { marks: string; status: 'Pass' | 'Fail' }>;
    [key: string]: any;
}

interface ExamsState {
    data: Exam[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: ExamsState = {
    data: [],
    status: 'idle',
    error: null,
};

// Legacy one-time fetch — kept for compatibility but prefer initExamsListener for real-time updates
export const fetchExams = createAsyncThunk('exams/fetchExams', async () => {
    const snap = await getDocs(collection(db, 'exams'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Exam));
});

/**
 * Real-time Firestore listener for the `exams` collection.
 * Call once after login (in App.tsx) and keep the returned unsubscribe function to clean up.
 * This replaces the one-time getDocs approach so Teacher App writes appear instantly.
 */
export const initExamsListener = (dispatch: any) => {
    dispatch({ type: 'exams/setStatus', payload: 'loading' });
    return onSnapshot(
        collection(db, 'exams'),
        (snapshot) => {
            const exams: Exam[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Exam));
            dispatch({ type: 'exams/setExams', payload: exams });
        },
        (error) => {
            console.error('Exams listener error:', error);
            dispatch({ type: 'exams/setStatus', payload: 'failed' });
        }
    );
};

export const saveExam = createAsyncThunk('exams/saveExam', async (examData: any, { dispatch }) => {
    const finalData = { ...examData, updatedAt: serverTimestamp() };
    dispatch(addOrUpdateExam(examData)); // Optimistic update immediately
    await setDoc(doc(db, 'exams', examData.id), finalData, { merge: true });
    return finalData;
});

export const deleteExam = createAsyncThunk('exams/deleteExam', async (id: string, { dispatch }) => {
    dispatch(removeExam(id)); // Optimistic removal
    await deleteDoc(doc(db, 'exams', id));
    return id;
});

export const saveBulkExams = createAsyncThunk('exams/saveBulkExams', async (payload: { examDataArray: any[] }, { dispatch }) => {
    // ── Step 1: Optimistic updates — instant Redux/UI update before network ───────────────
    payload.examDataArray.forEach(examData => dispatch(addOrUpdateExam(examData)));

    // ── Step 2: writeBatch — one round-trip for ALL records (vs N separate setDoc) ───
    // Firestore max: 500 ops per batch. Chunk larger arrays.
    const BATCH_LIMIT = 500;
    const chunks: any[][] = [];
    for (let i = 0; i < payload.examDataArray.length; i += BATCH_LIMIT) {
        chunks.push(payload.examDataArray.slice(i, i + BATCH_LIMIT));
    }

    await Promise.all(
        chunks.map(chunk => {
            const batch = writeBatch(db);
            chunk.forEach(examData => {
                batch.set(
                    doc(db, 'exams', examData.id),
                    { ...examData, updatedAt: serverTimestamp() },
                    { merge: true }
                );
            });
            return batch.commit();
        })
    );

    return true;
});

const examsSlice = createSlice({
    name: 'exams',
    initialState,
    reducers: {
        addOrUpdateExam: (state, action: PayloadAction<Exam>) => {
            const index = state.data.findIndex(e => e.id === action.payload.id);
            if (index !== -1) {
                state.data[index] = action.payload;
            } else {
                state.data.push(action.payload);
            }
        },
        removeExam: (state, action: PayloadAction<string>) => {
            state.data = state.data.filter(e => e.id !== action.payload);
        },
        // Called by the real-time listener to replace the full exam list
        setExams: (state, action: PayloadAction<Exam[]>) => {
            state.data = action.payload;
            state.status = 'succeeded';
        },
        setStatus: (state, action: PayloadAction<ExamsState['status']>) => {
            state.status = action.payload;
        },
    },
    extraReducers(builder) {
        builder
            .addCase(fetchExams.pending, (state) => { state.status = 'loading'; })
            .addCase(fetchExams.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.data = action.payload;
            })
            .addCase(fetchExams.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message || 'Failed';
            });
    }
});

export const { addOrUpdateExam, removeExam, setExams, setStatus } = examsSlice.actions;

// ── Professional RTK Selectors ──────────────────────────────────────────────

export const selectAllExams = createSelector(
    [(state: { exams: ExamsState }) => state.exams.data],
    (exams) => {
        const normalized: any[] = [];
        exams.forEach((e: any) => {
            if (e.students && typeof e.students === 'object' && !e.studentClass) {
                let cls = e.class || '';
                if (cls.toLowerCase().startsWith('class ')) {
                    cls = cls.substring(6).trim();
                }
                Object.entries(e.students).forEach(([rollNo, data]: [string, any]) => {
                    normalized.push({
                        ...e,
                        originalId: e.id,
                        id: `${e.id}_${rollNo}`,
                        studentClass: cls,
                        title: e.testNo || '',
                        category: e.category || 'Monthly',
                        date: e.date || '',
                        rollNo: rollNo,
                        studentName: 'Unknown', 
                        totalMarks: e.totalMarks || '0',
                        obtainedMarks: data.marks || '0',
                        books: [{ name: e.subject || '', totalMarks: e.totalMarks || '0', obtainedMarks: data.marks || '0' }],
                        bookName: e.subject || '',
                        status: data.status || ''
                    });
                });
            } else {
                let cls = e.studentClass || e.class || '';
                if (cls.toLowerCase().startsWith('class ')) {
                    cls = cls.substring(6).trim();
                }
                normalized.push({ ...e, studentClass: cls });
            }
        });
        return normalized;
    }
);

export const selectFilteredExams = createSelector(
    [
        selectAllExams,
        (_state: any, filters: any) => filters
    ],
    (exams, filters) => {
        const term = (filters.searchTerm || '').toLowerCase();
        return exams.filter((e: any) => {
            const matchesSearch = !term ||
                (e.studentName || '').toLowerCase().includes(term) ||
                (e.rollNo || '').toLowerCase().includes(term) ||
                (e.title || '').toLowerCase().includes(term) ||
                (e.category || '').toLowerCase().includes(term);
            const matchesClass = filters.filterClass ? (e.studentClass || '').replace(/^class\s+/i, '').trim().toLowerCase() === (filters.filterClass || '').replace(/^class\s+/i, '').trim().toLowerCase() : true;
            const matchesTestNo = filters.filterTestNo ? (e.title || '').trim().toLowerCase() === (filters.filterTestNo || '').trim().toLowerCase() : true;
            const matchesCategory = filters.filterCategory ? (e.category || '').trim().toLowerCase() === (filters.filterCategory || '').trim().toLowerCase() : true;
            const matchesSubject = filters.filterSubject ? (e.books || []).some((b: any) => b.name === filters.filterSubject) || e.subject === filters.filterSubject || e.bookName === filters.filterSubject : true;
            return matchesSearch && matchesClass && matchesTestNo && matchesCategory && matchesSubject;
        });
    }
);

export const selectStudentProgressList = createSelector(
    [
        (_state: any, students: any[], _filters: any) => students,
        (state: any, _students: any[], filters: any) => selectFilteredExams(state, filters),
        (_state: any, _students: any[], filters: any) => filters
    ],
    (students, filteredExams, filters) => {
        const map = new Map<string, any>();
        
        for (const s of students) {
            const rollNo = s.studentId || s.rollno || s.id || '';
            let grade = s.grade || s.class || '';
            if (grade.toLowerCase().startsWith('class ')) {
                grade = grade.substring(6).trim();
            }
            const key = rollNo + '|' + grade;
            if (!map.has(key)) {
                map.set(key, {
                    studentName: s.name,
                    fatherName: s.fatherName || '',
                    gender: s.gender || '',
                    rollNo,
                    studentClass: grade,
                    session: s.session || '',
                    studentEmail: s.email || '',
                    section: s.section || '',
                    totalMarks: 0,
                    obtainedMarks: 0,
                    testCount: 0,
                    tests: [],
                    latestExam: { id: '', title: '', date: '', category: '', rollNo, studentName: s.name, studentEmail: s.email || '', studentClass: grade, totalMarks: '0', obtainedMarks: '0', status: '', description: '' },
                });
            }
        }

        for (const e of filteredExams) {
            const key = (e.rollNo || e.studentName || '') + '|' + (e.studentClass || '');
            let total = 0;
            let obtained = 0;

            if (filters.filterSubject && e.books && e.books.length > 0) {
                const sub = e.books.find((b: any) => b.name === filters.filterSubject || e.subject === filters.filterSubject || e.bookName === filters.filterSubject);
                if (sub) {
                    total = parseFloat(sub.totalMarks || '0') || 0;
                    obtained = parseFloat(sub.obtainedMarks || '0') || 0;
                } else if (e.subject === filters.filterSubject || e.bookName === filters.filterSubject) {
                    total = parseFloat(e.totalMarks || '0') || 0;
                    obtained = parseFloat(e.obtainedMarks || '0') || 0;
                }
            } else {
                total = parseFloat(e.totalMarks || '0') || 0;
                obtained = parseFloat(e.obtainedMarks || '0') || 0;
            }

            const existing = map.get(key);

            if (existing) {
                existing.totalMarks += total;
                existing.obtainedMarks += obtained;
                if (e.title && !existing.tests.includes(e.title)) {
                    existing.testCount += 1;
                    existing.tests.push(e.title);
                }
                
                if (e.title === existing.latestExam.title) {
                    if (e.books && e.books.length > 0) {
                        existing.latestExam.books = [...(existing.latestExam.books || []), ...e.books];
                    } else if (e.bookName || e.subject) {
                        existing.latestExam.books = [...(existing.latestExam.books || []), { name: e.bookName || e.subject, totalMarks: e.totalMarks, obtainedMarks: e.obtainedMarks }];
                    }
                } else if (e.title > existing.latestExam.title) {
                    existing.latestExam = { ...e, books: e.books ? [...e.books] : (e.bookName || e.subject ? [{ name: e.bookName || e.subject, totalMarks: e.totalMarks, obtainedMarks: e.obtainedMarks }] : []) };
                }

                if (!existing.studentName || existing.studentName === 'Unknown') existing.studentName = e.studentName || existing.studentName;
            } else {
                map.set(key, {
                    studentName: e.studentName || 'Unknown',
                    fatherName: '',
                    gender: '',
                    rollNo: e.rollNo || '',
                    studentClass: e.studentClass || '',
                    session: '',
                    studentEmail: e.studentEmail || '',
                    section: '',
                    totalMarks: total,
                    obtainedMarks: obtained,
                    testCount: 1,
                    tests: e.title ? [e.title] : [],
                    latestExam: { ...e, books: e.books ? [...e.books] : (e.bookName || e.subject ? [{ name: e.bookName || e.subject, totalMarks: e.totalMarks, obtainedMarks: e.obtainedMarks }] : []) },
                });
            }
        }

        const term = (filters.searchTerm || '').toLowerCase();
        return Array.from(map.values())
            .filter(s => {
                const sName = (s.studentName || '').toLowerCase();
                const sRoll = (s.rollNo || '').toString().toLowerCase();
                const sClass = (s.studentClass || '').toLowerCase();
                
                const matchesSearch = !term ||
                    sName.includes(term) ||
                    sRoll.includes(term) ||
                    sClass.includes(term);
                const matchesClass = filters.filterClass ? s.studentClass === filters.filterClass : true;
                const matchesTest = filters.filterTestNo ? (s.tests || []).includes(filters.filterTestNo) : true;
                const matchesGender = filters.filterGender ? (s.gender || '').toLowerCase() === filters.filterGender.toLowerCase() : true;
                const matchesSession = filters.filterSession ? s.session === filters.filterSession : true;
                const matchesGroup = filters.filterGroup ? s.section === filters.filterGroup : true;
                return matchesSearch && matchesClass && matchesTest && matchesGender && matchesSession && matchesGroup;
            })
            .sort((a, b) => a.studentName.localeCompare(b.studentName));
    }
);

export const selectResultDetails = createSelector(
    [
        selectAllExams,
        (_state: any, filters: any) => filters
    ],
    (exams, filters) => {
        if (!filters.rollNo && !filters.studentName) return { detailSubjects: [], existingData: {} };

        const studentExams = exams.filter((e: any) => {
            const matchUser = e.rollNo === filters.rollNo || e.studentName === filters.studentName;
            const matchCategory = filters.filterCategory ? e.category === filters.filterCategory : true;
            const matchTestNo = filters.filterTestNo ? e.title === filters.filterTestNo : true;
            return matchUser && matchCategory && matchTestNo;
        });

        const existingData: Record<string, string> = {};
        const subjectMap = new Map<string, string>();

        studentExams.forEach((e: any) => {
            const prefix = filters.filterCategory ? e.title : `${e.category} - ${e.title}`;
            if (e.books) {
                e.books.forEach((b: any) => {
                    if (filters.filterSubject && b.name !== filters.filterSubject) return;
                    if (!subjectMap.has(b.name) || parseFloat(b.totalMarks) > parseFloat(subjectMap.get(b.name) || '0')) {
                        subjectMap.set(b.name, b.totalMarks);
                    }
                    existingData[`${prefix}_${b.name}`] = b.obtainedMarks;
                });
            }
        });

        const rawDetailSubjects = Array.from(subjectMap.entries()).map(([name, maxMarks]) => ({ name, maxMarks }));
        
        return { detailSubjects: rawDetailSubjects, existingData };
    }
);

export const selectBulkEntryData = createSelector(
    [
        selectAllExams,
        (_state: any, filters: any) => filters
    ],
    (exams, filters) => {
        const relevantExams = exams.filter((e: any) => {
            const matchClass = !filters.bulkClass || (e.studentClass || '').replace(/^class\s+/i, '').trim().toLowerCase() === (filters.bulkClass || '').replace(/^class\s+/i, '').trim().toLowerCase();
            const matchTestNo = !filters.bulkTestNo || e.title === filters.bulkTestNo;
            const matchCategory = !filters.bulkCategory || e.category === filters.bulkCategory;
            return matchClass && matchTestNo && matchCategory;
        });

        const existingData: Record<string, string> = {};
        const subjectMap = new Map<string, string>();

        relevantExams.forEach((e: any) => {
            if (e.books) {
                e.books.forEach((b: any) => {
                    if (!subjectMap.has(b.name) || parseFloat(b.totalMarks) > parseFloat(subjectMap.get(b.name) || '0')) {
                        subjectMap.set(b.name, b.totalMarks);
                    }
                    existingData[`${e.rollNo}_${b.name}`] = b.obtainedMarks;
                });
            }
        });

        const rawBulkSubjects = Array.from(subjectMap.entries()).map(([name, maxMarks]) => ({ name, maxMarks }));
        return { bulkSubjects: rawBulkSubjects, existingData };
    }
);

export default examsSlice.reducer;
