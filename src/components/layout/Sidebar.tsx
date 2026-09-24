import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaWhatsapp } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useAppSelector } from '../../store/hooks';

const navItems = [
    { to: '/', label: 'Dashboard', icon: '🏠', exact: true },
    { to: '/students', label: 'Students', icon: '🎓' },
    { to: '/teachers', label: 'Faculty', icon: '👩‍🏫' },
    { to: '/attendance', label: 'Attendance', icon: '🖐️' },
    { to: '/timetable', label: 'Timetable', icon: '📅' },
    {
        id: 'resources',
        label: 'e-Library',
        icon: '📂',
        children: [
            { to: '/assignments', label: 'Assignments', icon: '📓' },
            { to: '/diary', label: 'Diary', icon: '📖' },
            { to: '/books', label: 'Books', icon: '📚' },
            { to: '/videos', label: 'Video Gallery', icon: '🎥' },
        ]
    },
    { to: '/exams-bank', label: 'Exams', icon: '📄', isNew: true },
    { to: '/results', label: 'Results', icon: '🏆' },
    { to: '/fees', label: 'Fee Management', icon: '💰' },
    {
        id: 'whatsapp',
        label: 'WhatsApp',
        icon: <FaWhatsapp size={16} color="#25D366" />,
        children: [
            { to: '/whatsapp/results', label: 'Results', icon: '📄' },
            { to: '/whatsapp/attendance', label: 'Attendance', icon: '📅' },
            { to: '/whatsapp/general', label: 'General Messages', icon: '✉️' },
            { to: '/whatsapp/history', label: 'Message History', icon: '🕒' },
        ]
    },
    { to: '/chat', label: 'Academic Chat', icon: '🗨️' },
    {
        id: 'notifications',
        label: 'Notifications',
        icon: '🔔',
        children: [
            { to: '/notifications', label: 'Dashboard', icon: '📊' },
            { to: '/notifications/list', label: 'All Notifications', icon: '📋' },
            { to: '/notifications/create', label: 'Create New', icon: '➕' },
        ]
    },
    {
        id: 'feedback',
        label: 'Feedback',
        icon: '📢',
        children: [
            { to: '/complaints', label: 'Complaints', icon: '💬' },
            { to: '/suggestions', label: 'Suggestions', icon: '💡' },
        ]
    }
];

export default function Sidebar({
    collapsed,
    setCollapsed,
    mobileOpen,
    setMobileOpen,
}: {
    collapsed: boolean;
    setCollapsed: (val: boolean) => void;
    mobileOpen: boolean;
    setMobileOpen: (val: boolean) => void;
}) {
    const { profile } = useAuth();
    const libraryCategories = useAppSelector((s: any) => s.appSettings.libraryCategories);
    const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({});

    const toggleMenu = (id: string) => {
        if (collapsed) setCollapsed(false);
        setOpenMenus(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <>
            <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
                {/* Brand */}
                <div className="sidebar-logo" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: collapsed ? '16px 0' : '16px 14px',
                    height: 60, borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10, justifyContent: 'center', width: '100%' }}>
                        <img src="/logo.png" alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} />
                        {!collapsed && (
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                <div className="brand" style={{ fontSize: 14, lineHeight: 1.1, fontWeight: 800, letterSpacing: -0.3 }}>
                                    The Seeks <span style={{ color: 'rgba(255,255,255,0.7)' }}>Academy</span>
                                </div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginTop: 2, letterSpacing: 0.2 }}>Fort Abbas</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Nav */}
                <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto' }}>
                    {!collapsed && <div className="nav-section-label">Navigation</div>}
                    {collapsed && <div style={{ height: 20 }} />}
                    {navItems.map((item: any) => {
                        if (item.children) {
                            const isOpen = openMenus[item.id];
                            // Check if a child is active by checking window location
                            const isChildActive = item.children.some((c: any) => window.location.pathname === c.to);
                            return (
                                <div key={item.id}>
                                    <button
                                        onClick={() => toggleMenu(item.id)}
                                        className={`nav-link ${isChildActive ? 'active' : ''}`}
                                        style={{ 
                                            width: '100%', border: 'none', background: isChildActive && !isOpen ? 'rgba(255,255,255,0.05)' : 'transparent',
                                            justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '10px 0' : '8px 10px',
                                            cursor: 'pointer', textAlign: 'left',
                                            display: 'flex', alignItems: 'center', marginBottom: 2,
                                        }}
                                        title={collapsed ? item.label : undefined}
                                    >
                                        <span className="icon" style={{ margin: collapsed ? '0' : undefined }}>{item.icon}</span>
                                        {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                                        {!collapsed && <span style={{ fontSize: 10, opacity: 0.5 }}>{isOpen ? '▼' : '▶'}</span>}
                                    </button>
                                    {!collapsed && isOpen && (
                                        <div style={{ paddingLeft: 34, display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 4 }}>
                                            {item.children.map((child: any) => {
                                                const search = window.location.search;
                                                const isActiveItem = window.location.pathname === child.to && !search;
                                                return (
                                                    <NavLink
                                                        key={child.to}
                                                        to={child.to}
                                                        className={`nav-link${isActiveItem ? ' active' : ''}`}
                                                        style={{ padding: '6px 10px', fontSize: 13, background: 'transparent' }}
                                                    >
                                                        <span style={{ marginRight: 8, opacity: 0.6 }}>{child.icon}</span>
                                                        {child.label}
                                                    </NavLink>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.exact}
                                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                                style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '10px 0' : '8px 10px', marginBottom: 2 }}
                                title={collapsed ? item.label : undefined}
                            >
                                <span className="icon" style={{ margin: collapsed ? '0' : undefined }}>{item.icon}</span>
                                {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                                {!collapsed && item.isNew && <span style={{ fontSize: 9, fontWeight: 800, background: 'var(--primary)', color: '#fff', padding: '2px 6px', borderRadius: 10, marginLeft: 'auto' }}>NEW</span>}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Footer / Settings */}
                <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
                    <NavLink
                        to="/settings"
                        className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
                            padding: collapsed ? '10px 0' : '8px 10px',
                            background: 'rgba(255,255,255,0.05)', borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.1)', marginBottom: 8,
                            color: 'rgba(255,255,255,0.8)', transition: 'all 0.2s', cursor: 'pointer',
                        }}
                        title={collapsed ? 'Settings' : undefined}
                    >
                        <span className="icon" style={{ margin: collapsed ? '0' : undefined }}>⚙️</span>
                        {!collapsed && <span>Settings</span>}
                    </NavLink>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 10 }}>
                        © {new Date().getFullYear()} The Seeks Academy
                        <div style={{ marginTop: 4, fontSize: 9 }}>
                            Made with ❤️ by <a href="https://IftikharZahid.github.io" target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 600 }}>ZahidCodes</a>
                        </div>
                    </div>
                </div>
            </aside>
            {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
        </>
    );
}
