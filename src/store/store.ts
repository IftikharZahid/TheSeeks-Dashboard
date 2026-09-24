import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web

import studentsReducer from './slices/studentsSlice.ts';
import teachersReducer from './slices/teachersSlice.ts';
import examsReducer from './slices/examsSlice.ts';
import feesReducer from './slices/feesSlice.ts';
import generalReducer from './slices/generalSlice.ts';
import attendanceReducer from './slices/attendanceSlice.ts';
import assignmentsReducer from './slices/assignmentsSlice.ts';
import diariesReducer from './slices/diariesSlice.ts';
import appSettingsReducer from './slices/appSettingsSlice.ts';
import notificationsReducer from './slices/notificationsSlice.ts';
import messagesReducer from './slices/messagesSlice.ts';

const rootReducer = combineReducers({
    students: studentsReducer,
    teachers: teachersReducer,
    exams: examsReducer,
    fees: feesReducer,
    general: generalReducer,
    attendance: attendanceReducer,
    assignments: assignmentsReducer,
    diaries: diariesReducer,
    appSettings: appSettingsReducer,
    notifications: notificationsReducer,
    messages: messagesReducer,
});

const persistConfig = {
    key: 'root',
    storage,
    whitelist: ['messages'], // Add other slices here if you want them persisted
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) => 
        getDefaultMiddleware({
            serializableCheck: false, // required since Firebase Timestamp objects might be in state
            immutableCheck: false,
        }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
