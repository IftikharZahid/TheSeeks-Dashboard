import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { useAppDispatch } from './store/hooks';

import { ProtectedRoute, PublicOnlyRoute } from './components/common/ProtectedRoute';
import { GlobalAboutModal } from './components/common/GlobalAboutModal';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';

// Slices
import { fetchStudents } from './store/slices/studentsSlice';
import { fetchTeachers } from './store/slices/teachersSlice';
import { fetchFees } from './store/slices/feesSlice';
import { initExamsListener } from './store/slices/examsSlice';
import { fetchNotices, fetchComplaints, fetchSuggestions, fetchVideos, fetchTimetable } from './store/slices/generalSlice';
import { fetchClasses } from './store/slices/appSettingsSlice';
import { fetchAssignments } from './store/slices/assignmentsSlice';
import { initAttendanceListener } from './store/slices/attendanceSlice';
import { initDiariesListener } from './store/slices/diariesSlice';
import { initMessagesListener } from './store/slices/messagesSlice';

/** Pre-fetch all Firestore data once user is authenticated */
function DataLoader({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const { user } = useAuth();

    React.useEffect(() => {
        if (!user) return;
        dispatch(fetchStudents() as any);
        dispatch(fetchTeachers() as any);
        dispatch(fetchFees() as any);
        // Use real-time listener so Teacher App writes appear instantly in Admin Panel
        dispatch(fetchNotices() as any);
        dispatch(fetchComplaints() as any);
        dispatch(fetchSuggestions() as any);
        dispatch(fetchClasses() as any);
        dispatch(fetchVideos() as any);
        dispatch(fetchTimetable() as any);
        dispatch(fetchAssignments() as any);
        
        // Start real-time listeners
        const unsubExams = initExamsListener(dispatch);
        const unsubAttendance = initAttendanceListener(dispatch);
        const unsubDiaries = initDiariesListener(dispatch);
        initMessagesListener(dispatch);

        // Clean up the real-time listeners when the user logs out
        return () => {
            unsubExams();
            unsubAttendance();
            unsubDiaries();
        };
    }, [user, dispatch]);

    return <>{children}</>;
}

export default function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <BrowserRouter>
                    <GlobalAboutModal />
                    <DataLoader>
                        <Routes>
                            {/* Public */}
                            <Route
                                path="/login"
                                element={
                                    <PublicOnlyRoute>
                                        <LoginPage />
                                    </PublicOnlyRoute>
                                }
                            />
                            {/* Protected */}
                            <Route
                                path="/*"
                                element={
                                    <ProtectedRoute>
                                        <AppLayout />
                                    </ProtectedRoute>
                                }
                            />
                        </Routes>
                    </DataLoader>
                </BrowserRouter>
            </ThemeProvider>
        </AuthProvider>
    );
}
