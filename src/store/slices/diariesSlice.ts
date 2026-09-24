import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, getDocs, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export interface Diary {
    id: string;
    className: string;
    subject: string;
    title: string;
    details: string;
    date: Date | string;
    teacherId?: string;
    createdAt?: number | any;
    [key: string]: any;
}

interface DiariesState {
    data: Diary[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: DiariesState = {
    data: [],
    status: 'idle',
    error: null,
};

/**
 * Real-time Firestore listener for the `diaries` collection.
 * Replaces one-time getDocs so Teacher App writes appear instantly in Dashboard.
 */
export const initDiariesListener = (dispatch: any) => {
    dispatch({ type: 'diaries/setStatus', payload: 'loading' });
    return onSnapshot(
        collection(db, 'diaries'),
        (snapshot) => {
            const now = new Date();
            const validDiaries: Diary[] = [];

            snapshot.docs.forEach(d => {
                const data = d.data();
                
                let diaryDate = now;
                if (data.date) {
                    diaryDate = data.date.toDate ? data.date.toDate() : new Date(data.date);
                } else if (data.createdAt) {
                    diaryDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                }

                const ageInMs = now.getTime() - diaryDate.getTime();
                const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

                if (ageInDays > 7) {
                    deleteDoc(doc(db, 'diaries', d.id)).catch(e => console.log('Auto-delete old diary failed:', e));
                } else {
                    validDiaries.push({
                        id: d.id,
                        ...data,
                        date: data.date && data.date.toDate ? data.date.toDate().toISOString() : data.date,
                        createdAt: data.createdAt && data.createdAt.toMillis ? data.createdAt.toMillis() : data.createdAt
                    } as Diary);
                }
            });

            // Sort descending
            validDiaries.sort((a, b) => {
                const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
                const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
                return timeB - timeA;
            });

            dispatch({ type: 'diaries/setDiaries', payload: validDiaries });
        },
        (error) => {
            console.error('Diaries listener error:', error);
            dispatch({ type: 'diaries/setStatus', payload: 'failed' });
        }
    );
};

export const fetchDiaries = createAsyncThunk('diaries/fetchDiaries', async () => {
    const snap = await getDocs(collection(db, 'diaries'));
    const now = new Date();
    const validDiaries: Diary[] = [];

    snap.docs.forEach(d => {
        const data = d.data();
        
        // Check age of the diary
        let diaryDate = now;
        if (data.date) {
            diaryDate = data.date.toDate ? data.date.toDate() : new Date(data.date);
        } else if (data.createdAt) {
            diaryDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        }

        const ageInMs = now.getTime() - diaryDate.getTime();
        const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

        if (ageInDays > 7) {
            deleteDoc(doc(db, 'diaries', d.id)).catch(e => console.log('Auto-delete old diary failed:', e));
        } else {
            validDiaries.push({
                id: d.id,
                ...data,
                date: data.date && data.date.toDate ? data.date.toDate().toISOString() : data.date,
                createdAt: data.createdAt && data.createdAt.toMillis ? data.createdAt.toMillis() : data.createdAt
            } as Diary);
        }
    });

    return validDiaries;
}, {
    condition: (_, { getState }: any) => {
        const { diaries } = getState();
        if (diaries.status === 'succeeded' || diaries.status === 'loading') {
            return false;
        }
    }
});

export const saveDiary = createAsyncThunk('diaries/saveDiary', async (diaryData: any, { dispatch }) => {
    const finalData = { ...diaryData };
    if (!finalData.createdAt) {
        finalData.createdAt = Date.now();
    }
    
    // Convert string date back to Date object if needed for Firebase, 
    // but saving as string is also fine if consistency is managed.
    // For React Native we used JS Date, here let's save as Date object.
    if (typeof finalData.date === 'string') {
        finalData.date = new Date(finalData.date);
    }

    // Optimistic update (convert Date to string for Redux)
    const optimisticData = { ...finalData, date: finalData.date instanceof Date ? finalData.date.toISOString() : finalData.date };
    dispatch(addOrUpdateDiary(optimisticData)); 

    await setDoc(doc(db, 'diaries', diaryData.id), finalData, { merge: true });
    return optimisticData;
});

export const deleteDiary = createAsyncThunk('diaries/deleteDiary', async (id: string, { dispatch }) => {
    dispatch(removeDiary(id)); // Optimistic removal
    await deleteDoc(doc(db, 'diaries', id));
    return id;
});

const diariesSlice = createSlice({
    name: 'diaries',
    initialState,
    reducers: {
        setDiaries: (state, action: PayloadAction<Diary[]>) => {
            state.data = action.payload;
            state.status = 'succeeded';
        },
        setStatus: (state, action: PayloadAction<'idle' | 'loading' | 'succeeded' | 'failed'>) => {
            state.status = action.payload;
        },
        addOrUpdateDiary: (state, action: PayloadAction<Diary>) => {
            const index = state.data.findIndex(d => d.id === action.payload.id);
            if (index !== -1) {
                state.data[index] = action.payload;
            } else {
                state.data.push(action.payload);
            }
        },
        removeDiary: (state, action: PayloadAction<string>) => {
            state.data = state.data.filter(d => d.id !== action.payload);
        }
    },
    extraReducers(builder) {
        builder
            .addCase(fetchDiaries.pending, (state) => { state.status = 'loading'; })
            .addCase(fetchDiaries.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.data = action.payload.sort((a, b) => {
                    const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
                    const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
                    return timeB - timeA; // sort descending
                });
            })
            .addCase(fetchDiaries.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message || 'Failed';
            });
    }
});

export const { addOrUpdateDiary, removeDiary, setDiaries, setStatus } = diariesSlice.actions;
export default diariesSlice.reducer;
