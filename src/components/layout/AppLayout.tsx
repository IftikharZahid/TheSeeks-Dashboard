import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Sidebar from './Sidebar';
import TopBar from './TopBar';

import LoginPage from '../../pages/auth/LoginPage';
import DashboardHome from '../../pages/dashboard/DashboardHome';
import StudentsPage from '../../pages/people/StudentsPage';
import TeachersPage from '../../pages/people/TeachersPage';
import ResultsPage from '../../pages/academics/ResultsPage';
import ExamsQuestionBankPage from '../../pages/academics/ExamsQuestionBankPage';
import CreateExamPage from '../../pages/academics/CreateExamPage';
import QuestionBankPage from '../../pages/academics/QuestionBankPage';
import TimetablePage from '../../pages/academics/TimetablePage';
import AttendancePage from '../../pages/academics/AttendancePage';
import AssignmentsPage from '../../pages/academics/AssignmentsPage';
import DiaryPage from '../../pages/academics/DiaryPage';
import VideosPage from '../../pages/academics/VideosPage';
import FeePage from '../../pages/finance/FeePage';
import BooksPage from '../../pages/academics/BooksPage';
import ComplaintsPage from '../../pages/communication/ComplaintsPage';
import SuggestionsPage from '../../pages/communication/SuggestionsPage';
import ChatPage from '../../pages/communication/ChatPage';
import SettingsPage from '../../pages/settings/SettingsPage';
import WhatsAppCommunication from '../../pages/whatsapp/WhatsAppCommunication';

import NotificationDashboard from '../../pages/notifications/NotificationDashboard';
import NotificationList from '../../pages/notifications/NotificationList';
import CreateNotification from '../../pages/notifications/CreateNotification';
import ViewNotification from '../../pages/notifications/ViewNotification';

import { useAuth } from '../../context/AuthContext';

export default function AppLayout() {
    const [collapsed, setCollapsed] = React.useState(false);
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const { logout } = useAuth();

    // Close mobile menu on navigation
    const location = useLocation();
    React.useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    // 5-minute auto-logout for admin panel inactivity
    React.useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;

        const resetTimer = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                logout();
            }, 5 * 60 * 1000); // 5 minutes
        };

        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, resetTimer));

        // Initial setup
        resetTimer();

        return () => {
            clearTimeout(timeoutId);
            events.forEach(e => window.removeEventListener(e, resetTimer));
        };
    }, [logout]);

    return (
        <div className="layout" data-collapsed={collapsed} data-mobile-open={mobileOpen}>
            <div className="no-print">
                <Sidebar
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                    mobileOpen={mobileOpen}
                    setMobileOpen={setMobileOpen}
                />
            </div>
            <div className="main-content">
                <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
                    <TopBar collapsed={collapsed} toggleMobile={() => setMobileOpen(prev => !prev)} />
                </div>
                <Routes>
                    <Route path="/" element={<DashboardHome />} />
                    <Route path="/students" element={<StudentsPage />} />
                    <Route path="/teachers" element={<TeachersPage />} />
                    <Route path="/results" element={<ResultsPage />} />
                    <Route path="/exams-bank" element={<ExamsQuestionBankPage />} />
                    <Route path="/exams-bank/create" element={<CreateExamPage />} />
                    <Route path="/exams-bank/questions" element={<QuestionBankPage />} />
                    <Route path="/timetable" element={<TimetablePage />} />
                    <Route path="/attendance" element={<AttendancePage />} />
                    <Route path="/fees" element={<FeePage />} />
                    <Route path="/complaints" element={<ComplaintsPage />} />
                    <Route path="/suggestions" element={<SuggestionsPage />} />
                    <Route path="/chat" element={<ChatPage />} />
                    <Route path="/books" element={<BooksPage />} />
                    <Route path="/videos" element={<VideosPage />} />
                    <Route path="/assignments" element={<AssignmentsPage />} />
                    <Route path="/diary" element={<DiaryPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    
                    {/* Notifications Module */}
                    <Route path="/notifications" element={<NotificationDashboard />} />
                    <Route path="/notifications/list" element={<NotificationList />} />
                    <Route path="/notifications/create" element={<CreateNotification />} />
                    <Route path="/notifications/edit/:id" element={<CreateNotification />} />
                    <Route path="/notifications/:id" element={<ViewNotification />} />

                    {/* WhatsApp Module */}
                    <Route path="/whatsapp/results" element={<WhatsAppCommunication />} />
                    <Route path="/whatsapp/attendance" element={<WhatsAppCommunication />} />
                    <Route path="/whatsapp/general" element={<WhatsAppCommunication />} />
                    <Route path="/whatsapp/history" element={<WhatsAppCommunication />} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </div>
    );
}
