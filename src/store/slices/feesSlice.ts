import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

export interface FeeRecord {
    id: string;
    studentId: string;
    months: string[];
    amount: string | number;
    status: 'Paid' | 'Unpaid';
    datePaid: string;
    history?: { id: string; date: string; amountPaid: number; months: string[] }[];
    [key: string]: any;
}

interface FeesState {
    data: FeeRecord[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: FeesState = {
    data: [],
    status: 'idle',
    error: null,
};

export const fetchFees = createAsyncThunk('fees/fetchFees', async () => {
    const snap = await getDocs(collection(db, 'fees'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FeeRecord));
}, {
    condition: (_, { getState }: any) => {
        const { fees } = getState();
        if (fees.status === 'succeeded' || fees.status === 'loading') {
            return false;
        }
    }
});

const feesSlice = createSlice({
    name: 'fees',
    initialState,
    reducers: {
        addOrUpdateFee: (state, action: PayloadAction<FeeRecord>) => {
            const index = state.data.findIndex(f => f.id === action.payload.id);
            if (index !== -1) {
                state.data[index] = action.payload;
            } else {
                state.data.push(action.payload);
            }
        },
        removeFee: (state, action: PayloadAction<string>) => {
            state.data = state.data.filter(f => f.id !== action.payload);
        }
    },
    extraReducers(builder) {
        builder
            .addCase(fetchFees.pending, (state) => { state.status = 'loading'; })
            .addCase(fetchFees.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.data = action.payload;
            })
            .addCase(fetchFees.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message || 'Failed';
            });
    }
});

export const { addOrUpdateFee, removeFee } = feesSlice.actions;
export default feesSlice.reducer;
