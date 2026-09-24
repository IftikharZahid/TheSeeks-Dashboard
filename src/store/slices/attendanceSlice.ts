import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { db } from '../../firebase';
import { doc, setDoc, getDocs, collection, onSnapshot, writeBatch } from 'firebase/firestore';

// ── Types ──────────────────────────────────────────────
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'pending';

export interface AttendanceData {
    dailyRecords: Record<string, string>;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    totalDays: number;
    percentage: number;
}

export type AdminAttendanceDB = Record<string, Record<string, string>>;

interface AttendanceState {
    data: AttendanceData | null;
    isLoading: boolean;
    error: string | null;
    adminDb: AdminAttendanceDB;
    markedByDb: Record<string, Record<string, string>>;
    adminLoading: boolean;
}

const initialState: AttendanceState = {
    data: null,
    isLoading: false,
    error: null,
    adminDb: {},
    markedByDb: {},
    adminLoading: false,
};

// ── Listeners ──────────────────────────────────────────

/**
 * Real-time Firestore listener for the `attendance` collection.
 */
export const initAttendanceListener = (dispatch: any) => {
    dispatch(setAdminLoading(true));
    return onSnapshot(
        collection(db, 'attendance'),
        (snapshot) => {
            const newDb: Record<string, Record<string, string>> = {};
            const newMarkedByDb: Record<string, Record<string, string>> = {};
            snapshot.docs.forEach((docSnap) => {
                const dr = docSnap.data().dailyRecords ?? {};
                const mr = docSnap.data().markedByRecords ?? {};
                
                const norm: Record<string, string> = {};
                if (typeof dr === 'object' && !Array.isArray(dr)) {
                    Object.keys(dr).forEach(k => {
                        const v = dr[k];
                        norm[k] = typeof v === 'string' ? v : (v?.status ?? '');
                    });
                }
                newDb[docSnap.id] = norm;
                
                const normMr: Record<string, string> = {};
                if (typeof mr === 'object' && !Array.isArray(mr)) {
                    Object.keys(mr).forEach(k => {
                        normMr[k] = String(mr[k] || '');
                    });
                }
                newMarkedByDb[docSnap.id] = normMr;
            });
            dispatch(setAdminDb(newDb));
            dispatch(setMarkedByDb(newMarkedByDb));
        },
        (error) => {
            console.error('Attendance listener error:', error);
            dispatch(setAdminLoading(false));
        }
    );
};

// ── Thunks ─────────────────────────────────────────────

export const fetchAttendance = createAsyncThunk('attendance/fetchAttendance', async () => {
    const snap = await getDocs(collection(db, 'attendance'));
    const newDb: Record<string, Record<string, string>> = {};
    const newMarkedByDb: Record<string, Record<string, string>> = {};
    
    snap.docs.forEach((docSnap) => {
        const dr = docSnap.data().dailyRecords ?? {};
        const mr = docSnap.data().markedByRecords ?? {};
        
        const norm: Record<string, string> = {};
        if (typeof dr === 'object' && !Array.isArray(dr)) {
            Object.keys(dr).forEach(k => {
                const v = dr[k];
                norm[k] = typeof v === 'string' ? v : (v?.status ?? '');
            });
        }
        newDb[docSnap.id] = norm;
        
        const normMr: Record<string, string> = {};
        if (typeof mr === 'object' && !Array.isArray(mr)) {
            Object.keys(mr).forEach(k => {
                normMr[k] = String(mr[k] || '');
            });
        }
        newMarkedByDb[docSnap.id] = normMr;
    });
    return { adminDb: newDb, markedByDb: newMarkedByDb };
}, {
    condition: (_, { getState }: any) => {
        const { attendance } = getState();
        if (Object.keys(attendance.adminDb).length > 0 || attendance.adminLoading) {
            return false;
        }
    }
});

export const writeStudentAttendance = createAsyncThunk(
    'attendance/writeStudent',
    async (payload: { studentId: string; dailyRecords: Record<string, string> }, { rejectWithValue }) => {
        try {
            const { studentId, dailyRecords } = payload;
            let present = 0, absent = 0, late = 0;
            
            Object.values(dailyRecords).forEach(st => {
                const s = st.toLowerCase();
                if (s === 'present') present++;
                else if (s === 'absent') absent++;
                else if (s === 'late') late++;
            });
            const total = present + absent + late;
            const pct = total > 0 ? Math.round((present / total) * 100) : 0;
            
            const payloadToSet = JSON.parse(JSON.stringify({
                dailyRecords,
                totalPresent: present,
                totalAbsent:  absent,
                totalLate:    late,
                totalDays:    total,
                percentage:   pct,
            }));
            
            await setDoc(doc(db, 'attendance', studentId), payloadToSet, { merge: true });
            
            return { studentId, dailyRecords };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to write attendance');
        }
    }
);

export const writeBulkStudentAttendance = createAsyncThunk(
    'attendance/writeBulk',
    async (payload: { updates: Record<string, Record<string, string>> }, { rejectWithValue }) => {
        try {
            const { updates } = payload;
            const batch = writeBatch(db);

            Object.entries(updates).forEach(([studentId, dailyRecords]) => {
                let present = 0, absent = 0, late = 0;
                
                Object.values(dailyRecords).forEach(st => {
                    const s = st.toLowerCase();
                    if (s === 'present') present++;
                    else if (s === 'absent') absent++;
                    else if (s === 'late') late++;
                });
                const total = present + absent + late;
                const pct = total > 0 ? Math.round((present / total) * 100) : 0;
                
                const ref = doc(db, 'attendance', studentId);
                const payloadToSet = JSON.parse(JSON.stringify({
                    dailyRecords,
                    totalPresent: present,
                    totalAbsent:  absent,
                    totalLate:    late,
                    totalDays:    total,
                    percentage:   pct,
                }));
                batch.set(ref, payloadToSet, { merge: true });
            });

            await batch.commit();
            return { updates };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to bulk write attendance');
        }
    }
);

// ── Slice ──────────────────────────────────────────────
const attendanceSlice = createSlice({
    name: 'attendance',
    initialState,
    reducers: {
        setAdminDb(state, action: PayloadAction<AdminAttendanceDB>) {
            state.adminDb = action.payload;
            state.adminLoading = false;
        },
        setMarkedByDb(state, action: PayloadAction<Record<string, Record<string, string>>>) {
            state.markedByDb = action.payload;
        },
        setAdminLoading(state, action: PayloadAction<boolean>) {
            state.adminLoading = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchAttendance.pending, (state) => {
            state.adminLoading = true;
        });
        builder.addCase(fetchAttendance.fulfilled, (state, action) => {
            state.adminDb = action.payload.adminDb;
            state.markedByDb = action.payload.markedByDb;
            state.adminLoading = false;
        });
        builder.addCase(fetchAttendance.rejected, (state, action) => {
            state.error = action.error.message || 'Failed to fetch attendance';
            state.adminLoading = false;
        });
        builder.addCase(writeStudentAttendance.pending, (state, action) => {
            const { studentId, dailyRecords } = action.meta.arg;
            if (!state.adminDb) state.adminDb = {};
            state.adminDb[studentId] = dailyRecords;
        });
        builder.addCase(writeStudentAttendance.fulfilled, (state, action) => {
            const { studentId, dailyRecords } = action.payload;
            if (!state.adminDb) state.adminDb = {};
            state.adminDb[studentId] = dailyRecords;
        });
        builder.addCase(writeBulkStudentAttendance.pending, (state, action) => {
            const { updates } = action.meta.arg;
            if (!state.adminDb) state.adminDb = {};
            Object.entries(updates).forEach(([studentId, dailyRecords]) => {
                state.adminDb[studentId] = dailyRecords;
            });
        });
        builder.addCase(writeBulkStudentAttendance.fulfilled, (state, action) => {
            const { updates } = action.payload;
            if (!state.adminDb) state.adminDb = {};
            Object.entries(updates).forEach(([studentId, dailyRecords]) => {
                state.adminDb[studentId] = dailyRecords;
            });
        });
    },
});

export const { setAdminDb, setMarkedByDb, setAdminLoading } = attendanceSlice.actions;
export default attendanceSlice.reducer;
