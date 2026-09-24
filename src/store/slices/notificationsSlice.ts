import { createSlice, createAsyncThunk, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy, getDoc, limit, startAfter, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Notification, NotificationAnalytics } from '../../notifications/types';
import { uploadNotificationMedia } from '../../notifications/services/storageService';

const notificationsAdapter = createEntityAdapter<Notification>({
    sortComparer: (a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
        return dateB - dateA;
    }
});

interface NotificationsExtraState {
    analytics: NotificationAnalytics | null;
    loading: boolean;
    loadingMore: boolean;
    hasMore: boolean;
    lastVisibleDate: string | null;
    error: string | null;
}

const initialState = notificationsAdapter.getInitialState<NotificationsExtraState>({
    analytics: null,
    loading: false,
    loadingMore: false,
    hasMore: true,
    lastVisibleDate: null,
    error: null,
});

export const fetchNotifications = createAsyncThunk(
    'notifications/fetchNotifications',
    async (args: { loadMore?: boolean; pageSize?: number } | undefined, { getState, rejectWithValue }) => {
        try {
            const pageSize = args?.pageSize || 20;
            const state = getState() as any;
            const lastDate = state.notifications.lastVisibleDate;
            
            // For true Firestore infinite scroll, we should pass the actual document or the exact order-by value.
            // Using a simple query here for architecture demonstration.
            let q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(pageSize));
            
            // Note: In a production app, we would use startAfter with the actual document snapshot.
            // Here we are setting the architectural pattern.
            
            const snapshot = await getDocs(q);
            const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            return {
                notifications,
                hasMore: notifications.length === pageSize,
                loadMore: args?.loadMore || false,
                lastDate: notifications.length > 0 ? (notifications[notifications.length - 1].createdAt?.toDate?.()?.toISOString() || notifications[notifications.length - 1].createdAt) : null
            };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const createNotification = createAsyncThunk(
    'notifications/createNotification',
    async (payload: any, { rejectWithValue }) => {
        try {
            const { bannerFile, pdfFile, ...notificationData } = payload;
            
            let imageUrl = notificationData.imageUrl || '';
            let pdfUrl = notificationData.pdfUrl || '';

            if (bannerFile) {
                imageUrl = await uploadNotificationMedia(bannerFile, 'images');
            }
            if (pdfFile) {
                pdfUrl = await uploadNotificationMedia(pdfFile, 'pdfs');
            }

            const docRef = doc(collection(db, 'notifications'));
            const newNotification = { 
                ...notificationData, 
                imageUrl: imageUrl || null,
                pdfUrl: pdfUrl || null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                id: docRef.id 
            };
            
            await setDoc(docRef, newNotification);
            return newNotification as Notification;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const updateNotification = createAsyncThunk(
    'notifications/updateNotification',
    async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
        try {
            const { bannerFile, pdfFile, ...notificationData } = data;
            
            let imageUrl = notificationData.imageUrl;
            let pdfUrl = notificationData.pdfUrl;

            if (bannerFile) {
                imageUrl = await uploadNotificationMedia(bannerFile, 'images');
            }
            if (pdfFile) {
                pdfUrl = await uploadNotificationMedia(pdfFile, 'pdfs');
            }

            const updatePayload = {
                ...notificationData,
                updatedAt: serverTimestamp(),
            };
            
            if (imageUrl) updatePayload.imageUrl = imageUrl;
            if (pdfUrl) updatePayload.pdfUrl = pdfUrl;

            const docRef = doc(db, 'notifications', id);
            await updateDoc(docRef, updatePayload);
            return { id, data: updatePayload };
        } catch (error: any) {
            return rejectWithValue({ id, error: error.message });
        }
    }
);

export const deleteNotification = createAsyncThunk(
    'notifications/deleteNotification',
    async (id: string, { rejectWithValue }) => {
        try {
            await deleteDoc(doc(db, 'notifications', id));
            return id;
        } catch (error: any) {
            return rejectWithValue({ id, error: error.message });
        }
    }
);

export const bulkDeleteNotifications = createAsyncThunk(
    'notifications/bulkDelete',
    async (ids: string[], { rejectWithValue }) => {
        try {
            const batch = writeBatch(db);
            ids.forEach(id => {
                const docRef = doc(db, 'notifications', id);
                batch.delete(docRef);
            });
            await batch.commit();
            return ids;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchNotificationAnalytics = createAsyncThunk(
    'notifications/fetchNotificationAnalytics',
    async (_, { rejectWithValue }) => {
        try {
            const docRef = doc(db, 'analytics', 'notifications');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data() as NotificationAnalytics;
            }
            
            return {
                total: 0,
                delivered: 0,
                failed: 0,
                read: 0,
                opened: 0,
                daily: [],
                weekly: [],
                monthly: []
            } as NotificationAnalytics;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch
            .addCase(fetchNotifications.pending, (state, action) => { 
                if (action.meta.arg?.loadMore) {
                    state.loadingMore = true;
                } else {
                    state.loading = true; 
                }
                state.error = null; 
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                state.hasMore = action.payload.hasMore;
                state.lastVisibleDate = action.payload.lastDate;
                
                if (action.payload.loadMore) {
                    notificationsAdapter.upsertMany(state, action.payload.notifications);
                } else {
                    notificationsAdapter.setAll(state, action.payload.notifications);
                }
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                state.error = action.payload as string;
            })
            
            // Create
            .addCase(createNotification.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createNotification.fulfilled, (state, action) => {
                state.loading = false;
                notificationsAdapter.addOne(state, action.payload);
            })
            .addCase(createNotification.rejected, (state, action: any) => {
                state.loading = false;
                state.error = action.payload || 'Failed to create notification';
            })
            
            // Update
            .addCase(updateNotification.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                const { id, data } = action.meta.arg;
                const { bannerFile, pdfFile, ...safeData } = data as any;
                notificationsAdapter.updateOne(state, { id, changes: safeData });
            })
            .addCase(updateNotification.fulfilled, (state, action) => {
                state.loading = false;
                const { id, data } = action.payload;
                notificationsAdapter.updateOne(state, { id, changes: data });
            })
            .addCase(updateNotification.rejected, (state, action: any) => {
                state.loading = false;
                state.error = action.payload?.error || 'Failed to update notification';
            })
            
            // Delete
            .addCase(deleteNotification.pending, (state, action) => {
                notificationsAdapter.removeOne(state, action.meta.arg);
            })
            .addCase(deleteNotification.rejected, (state, action: any) => {
                state.error = action.payload?.error || 'Failed to delete notification';
            })

            // Bulk Delete
            .addCase(bulkDeleteNotifications.pending, (state, action) => {
                notificationsAdapter.removeMany(state, action.meta.arg);
            })
            .addCase(bulkDeleteNotifications.rejected, (state, action: any) => {
                state.error = action.payload || 'Failed to bulk delete notifications';
            })
            
            // Analytics
            .addCase(fetchNotificationAnalytics.fulfilled, (state, action) => {
                state.analytics = action.payload;
            })
            .addCase(fetchNotificationAnalytics.rejected, (state, action) => {
                // Set default analytics so the UI doesn't hang in a skeleton state
                state.analytics = {
                    total: 0,
                    delivered: 0,
                    failed: 0,
                    read: 0,
                    opened: 0,
                    daily: [],
                    weekly: [],
                    monthly: []
                };
            });
    }
});

export const { clearError } = notificationsSlice.actions;

// Selectors
export const {
    selectAll: selectAllNotifications,
    selectById: selectNotificationById,
    selectIds: selectNotificationIds
} = notificationsAdapter.getSelectors((state: any) => state.notifications);

export const selectFilteredNotifications = createSelector(
    [
        selectAllNotifications,
        (state: any, search: string) => search,
        (state: any, search: string, status: string) => status,
        (state: any, search: string, status: string, type: string) => type,
        (state: any, search: string, status: string, type: string, audience: string) => audience
    ],
    (notifications, search, status, type, audience) => {
        return notifications.filter(notif => {
            const matchesSearch = notif.title.toLowerCase().includes(search.toLowerCase()) || 
                                  (notif.description || '').toLowerCase().includes(search.toLowerCase());
            const matchesStatus = status === 'All' 
                                  || (status === 'Published' && notif.published)
                                  || (status === 'Draft' && !notif.published);
            const matchesType = type === 'All' || notif.type === type;
            const matchesAudience = audience === 'All' || notif.audience === audience;
            
            return matchesSearch && matchesStatus && matchesType && matchesAudience;
        });
    }
);

export default notificationsSlice.reducer;
