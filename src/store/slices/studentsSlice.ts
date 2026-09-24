import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

export interface Student {
    id: string;
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
    createdAt?: number;
    [key: string]: any;
}

interface StudentsState {
    data: Student[];
    pendingStudents: Student[];
    editedStudents: Student[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: StudentsState = {
    data: [],
    pendingStudents: [],
    editedStudents: [],
    status: 'idle',
    error: null,
};

export const fetchStudents = createAsyncThunk('students/fetchStudents', async () => {
    const snap = await getDocs(collection(db, 'students'));
    return snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            name: data.name || data.fullname || 'Unknown',
            fatherName: data.fatherName || data.fathername || '',
            studentId: data.studentId || d.id,
            email: data.email || '',
            password: data.password || '',
            grade: data.grade || data.class || '',
            gender: data.gender || '',
            section: data.section || '',
            session: data.session || '',
            phone: data.phone || '',
            rollno: data.rollno || '',
            profileImage: data.profileImage || data.image || '',
            uid: data.uid || '',
            authUid: data.authUid || '',
            createdAt: data.createdAt ? (data.createdAt.toMillis ? data.createdAt.toMillis() : (typeof data.createdAt === 'number' ? data.createdAt : Date.now())) : null,
        } as Student;
    });
}, {
    condition: (_, { getState }: any) => {
        const { students } = getState();
        if (students.status === 'succeeded' || students.status === 'loading') {
            return false;
        }
    }
});

export const toggleStudentActiveStatus = createAsyncThunk(
    'students/toggleActiveStatus',
    async (payload: { student: Student; nextActive: boolean }, { rejectWithValue }) => {
        try {
            const { student, nextActive } = payload;
            const uidToUpdate = student.uid || student.studentId || student.id;
            
            await setDoc(doc(db, 'students', student.id), { isActive: nextActive, status: nextActive ? 'active' : 'inactive', updatedAt: serverTimestamp() }, { merge: true });
            
            if (uidToUpdate) {
                await setDoc(doc(db, 'studentsprofile', uidToUpdate), { isActive: nextActive, status: nextActive ? 'active' : 'inactive' }, { merge: true });
            }
            
            return { studentId: student.id, nextActive };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to toggle status');
        }
    }
);

const studentsSlice = createSlice({
    name: 'students',
    initialState,
    reducers: {
        resetStudentsStatus: (state) => {
            state.status = 'idle';
        },
        setStudents: (state, action: PayloadAction<Student[]>) => {
            state.data = action.payload;
        },
        addOrUpdateStudent: (state, action: PayloadAction<Student>) => {
            const index = state.data.findIndex(s => s.id === action.payload.id);
            if (index !== -1) {
                state.data[index] = action.payload;
            } else {
                state.data.push(action.payload);
            }
        },
        removeStudent: (state, action: PayloadAction<string>) => {
            state.data = state.data.filter(s => s.id !== action.payload);
            state.editedStudents = state.editedStudents.filter(s => s.id !== action.payload);
        },
        addPendingStudent: (state, action: PayloadAction<Student>) => {
            state.pendingStudents.push(action.payload);
            state.data.push(action.payload);
        },
        updatePendingStudent: (state, action: PayloadAction<Student>) => {
            const index = state.pendingStudents.findIndex(s => s.id === action.payload.id);
            if (index !== -1) {
                state.pendingStudents[index] = action.payload;
            }
            const dataIndex = state.data.findIndex(s => s.id === action.payload.id);
            if (dataIndex !== -1) {
                state.data[dataIndex] = action.payload;
            }
        },
        removePendingStudent: (state, action: PayloadAction<string>) => {
            state.pendingStudents = state.pendingStudents.filter(s => s.id !== action.payload);
            state.data = state.data.filter(s => s.id !== action.payload);
        },
        removeSuccessfulPendingStudents: (state, action: PayloadAction<string[]>) => {
            state.pendingStudents = state.pendingStudents.filter(s => !action.payload.includes(s.id));
        },
        addEditedStudent: (state, action: PayloadAction<Student>) => {
            state.editedStudents = state.editedStudents.filter(s => s.id !== action.payload.id);
            state.editedStudents.push(action.payload);
            const index = state.data.findIndex(s => s.id === action.payload.id);
            if (index !== -1) {
                state.data[index] = action.payload;
            }
        },
        removeSuccessfulEditedStudents: (state, action: PayloadAction<string[]>) => {
            state.editedStudents = state.editedStudents.filter(s => !action.payload.includes(s.id));
        }
    },
    extraReducers(builder) {
        builder
            .addCase(fetchStudents.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchStudents.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.data = action.payload;
            })
            .addCase(fetchStudents.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message || 'Failed to fetch students';
            })
            .addCase(toggleStudentActiveStatus.pending, (state, action) => {
                const { student, nextActive } = action.meta.arg;
                const index = state.data.findIndex(s => s.id === student.id);
                if (index !== -1) {
                    state.data[index] = { ...state.data[index], isActive: nextActive, status: nextActive ? 'active' : 'inactive' };
                }
            })
            .addCase(toggleStudentActiveStatus.rejected, (state, action) => {
                const { student } = action.meta.arg;
                const index = state.data.findIndex(s => s.id === student.id);
                if (index !== -1) {
                    state.data[index] = { ...state.data[index], isActive: student.isActive, status: student.isActive ? 'active' : 'inactive' };
                }
            });
    }
});

export const { resetStudentsStatus, setStudents, addOrUpdateStudent, removeStudent, addPendingStudent, updatePendingStudent, removePendingStudent, removeSuccessfulPendingStudents, addEditedStudent, removeSuccessfulEditedStudents } = studentsSlice.actions;
export default studentsSlice.reducer;
