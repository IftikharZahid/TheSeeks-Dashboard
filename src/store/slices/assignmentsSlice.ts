import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

export interface Assignment {
    id: string;
    title: string;
    teacherName: string;
    deadline: string;
    targetClass: string;
    subject: string;
    description: string;
    [key: string]: any;
}

interface AssignmentsState {
    data: Assignment[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: AssignmentsState = {
    data: [],
    status: 'idle',
    error: null,
};

export const fetchAssignments = createAsyncThunk('assignments/fetchAssignments', async () => {
    const snap = await getDocs(collection(db, 'assignments'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment));
}, {
    condition: (_, { getState }: any) => {
        const { assignments } = getState();
        if (assignments.status === 'succeeded' || assignments.status === 'loading') {
            return false;
        }
    }
});

export const saveAssignment = createAsyncThunk('assignments/saveAssignment', async (assignmentData: any, { dispatch }) => {
    const finalData = { ...assignmentData };
    if (!finalData.createdAt) {
        finalData.createdAt = Date.now();
    }
    dispatch(addOrUpdateAssignment(finalData)); // Optimistic update
    await setDoc(doc(db, 'assignments', assignmentData.id), finalData, { merge: true });
    return finalData;
});

export const deleteAssignment = createAsyncThunk('assignments/deleteAssignment', async (id: string, { dispatch }) => {
    dispatch(removeAssignment(id)); // Optimistic removal
    await deleteDoc(doc(db, 'assignments', id));
    return id;
});

const assignmentsSlice = createSlice({
    name: 'assignments',
    initialState,
    reducers: {
        addOrUpdateAssignment: (state, action: PayloadAction<Assignment>) => {
            const index = state.data.findIndex(a => a.id === action.payload.id);
            if (index !== -1) {
                state.data[index] = action.payload;
            } else {
                state.data.push(action.payload);
            }
        },
        removeAssignment: (state, action: PayloadAction<string>) => {
            state.data = state.data.filter(a => a.id !== action.payload);
        }
    },
    extraReducers(builder) {
        builder
            .addCase(fetchAssignments.pending, (state) => { state.status = 'loading'; })
            .addCase(fetchAssignments.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.data = action.payload.sort((a, b) => {
                    const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
                    const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
                    return timeB - timeA;
                });
            })
            .addCase(fetchAssignments.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message || 'Failed';
            });
    }
});

export const { addOrUpdateAssignment, removeAssignment } = assignmentsSlice.actions;
export default assignmentsSlice.reducer;
