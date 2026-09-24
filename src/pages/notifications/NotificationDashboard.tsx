import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchNotifications, fetchNotificationAnalytics, selectAllNotifications, deleteNotification } from '../../store/slices/notificationsSlice';
import { fetchStudents } from '../../store/slices/studentsSlice';
import { fetchTeachers } from '../../store/slices/teachersSlice';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { FiBell, FiSend, FiClock, FiFileText, FiCheckCircle, FiEye, FiXCircle, FiUsers, FiPlus, FiCalendar, FiSpeaker, FiBookOpen, FiClipboard, FiMessageSquare, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

export default function NotificationDashboard() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { analytics, loading } = useAppSelector((state: any) => state.notifications);
    const list = useAppSelector(selectAllNotifications);
    const { data: students, status: studentsStatus } = useAppSelector((state: any) => state.students);
    const { data: teachers, status: teachersStatus } = useAppSelector((state: any) => state.teachers);
    const [showTemplatesModal, setShowTemplatesModal] = React.useState(false);
    const [templateFilter, setTemplateFilter] = React.useState<string | null>(null);

    const NOTIFICATION_TEMPLATES = [
        { id: 't1', title: 'Important Announcement: School Closure', type: 'Announcement', message: 'Dear Parents/Students,\n\nPlease be informed that the school will remain closed tomorrow due to unforeseen circumstances. All scheduled classes and activities are suspended. Regular classes will resume the day after tomorrow.\n\nRegards,\nPrincipal', priority: 'Urgent' },
        { id: 't2', title: 'Parent-Teacher Meeting', type: 'Announcement', message: 'Dear Parents,\n\nWe cordially invite you to our upcoming Parent-Teacher Meeting scheduled for this Saturday. Please check your specific time slot in the portal.\n\nWarm Regards,\nAdministration', priority: 'High' },
        { id: 't3', title: 'Weekly Diary Update', type: 'Diary', message: 'Dear Parents,\n\nHere is the academic progress and diary for this week. Please review the syllabus covered and ensure your child completes the pending revision tasks.\n\nBest Regards,\nClass Teacher', priority: 'Normal' },
        { id: 't4', title: 'New Assignment Uploaded', type: 'Assignment', message: 'Dear Students,\n\nA new assignment has been uploaded to your portal. Please check the requirements and ensure you submit your work before the deadline.\n\nBest of luck,\nSubject Teacher', priority: 'Normal' },
        { id: 't5', title: 'Fee Reminder', type: 'Announcement', message: 'Dear Parents,\n\nThis is a gentle reminder that the school fees for the current term are due. Kindly ensure timely payment to avoid any late surcharges.\n\nThank you,\nFinance Department', priority: 'High' },
        { id: 't6', title: 'General Chat Broadcast', type: 'Chat', message: 'Hello everyone,\n\nJust dropping a quick message to check in. Let me know if anyone has any questions regarding the upcoming events or recent lessons.\n\nThanks!', priority: 'Normal' }
    ];

    const openTemplates = (type: string | null = null) => {
        setTemplateFilter(type);
        setShowTemplatesModal(true);
    };

    const handleUseTemplate = (t: any) => {
        navigate('/notifications/create', { state: { template: t } });
    };

    useEffect(() => {
        dispatch(fetchNotifications());
        dispatch(fetchNotificationAnalytics());
    }, [dispatch]);

    useEffect(() => {
        if (studentsStatus === 'idle') {
            dispatch(fetchStudents());
        }
        if (teachersStatus === 'idle') {
            dispatch(fetchTeachers());
        }
    }, [studentsStatus, teachersStatus, dispatch]);

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this notification?')) {
            dispatch(deleteNotification(id));
        }
    };

    const safeAnalytics = analytics || {
        total: 0,
        delivered: 0,
        failed: 0,
        read: 0,
        opened: 0,
        daily: [],
        weekly: [],
        monthly: []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let sentToday = 0;
    let scheduledCount = 0;
    let draftsCount = 0;
    let totalDelivered = 0;

    (list || []).forEach((n: any) => {
        if (!n.published) {
            draftsCount++;
        } else {
            // Check if scheduled
            if (n.scheduledAt && new Date(n.scheduledAt).getTime() > now.getTime()) {
                scheduledCount++;
            } else {
                totalDelivered++;
                // Check if sent today
                const createdAtTime = n.createdAt?.toDate ? n.createdAt.toDate().getTime() : new Date(n.createdAt).getTime();
                if (createdAtTime >= today) {
                    sentToday++;
                }
            }
        }
    });

    const totalNotifications = (list || []).length;
    const readRate = totalDelivered > 0 ? (safeAnalytics.read ? ((safeAnalytics.read / totalDelivered) * 100).toFixed(1) + '%' : '0%') : '0%';
    const failedCount = safeAnalytics.failed || 0;

    const lineData = [
        { name: 'Mon', delivered: 120, read: 90 },
        { name: 'Tue', delivered: 180, read: 140 },
        { name: 'Wed', delivered: 150, read: 120 },
        { name: 'Thu', delivered: 220, read: 190 },
        { name: 'Fri', delivered: 290, read: 250 },
        { name: 'Sat', delivered: 140, read: 110 },
        { name: 'Sun', delivered: 100, read: 85 },
    ];

    const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1', '#eab308', '#0ea5e9', '#d946ef', '#84cc16'];
    
    const audienceData = React.useMemo(() => {
        const counts: Record<string, number> = {};
        
        (students || []).forEach((s: any) => {
            const grade = s.grade ? `Class ${s.grade}`.replace('Class Class', 'Class') : 'Unassigned Class';
            counts[grade] = (counts[grade] || 0) + 1;
        });

        if (teachers && teachers.length > 0) {
            counts['Teachers & Staff'] = teachers.length;
        }

        const rawData = Object.keys(counts).map((key, idx) => ({
            name: key,
            value: counts[key],
            color: pieColors[idx % pieColors.length]
        })).sort((a, b) => b.value - a.value);

        return rawData.length > 0 ? rawData : [{ name: 'No Data', value: 1, color: '#e5e7eb' }];
    }, [students, teachers]);
    
    const activeUsers = audienceData.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <div className="page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                    <h1 className="page-title">Notification Dashboard</h1>
                    <p className="page-sub">Monitor, manage and deliver notifications across the entire Academic System.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12.5px' }} onClick={() => navigate('/notifications/create')}>
                        <FiPlus /> Create Notification
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12.5px' }} onClick={() => navigate('/notifications/create?schedule=true')}>
                        <FiCalendar /> Schedule
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12.5px' }} onClick={() => openTemplates(null)}>
                        <FiFileText /> Templates
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                {[
                    { icon: <FiBell />, val: totalNotifications.toLocaleString(), lbl: 'Total', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
                    { icon: <FiSend />, val: sentToday, lbl: 'Sent Today', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
                    { icon: <FiClock />, val: scheduledCount, lbl: 'Scheduled', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
                    { icon: <FiFileText />, val: draftsCount, lbl: 'Drafts', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)' },
                    { icon: <FiCheckCircle />, val: totalDelivered.toLocaleString(), lbl: 'Delivered', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
                    { icon: <FiEye />, val: readRate, lbl: 'Read Rate', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
                    { icon: <FiXCircle />, val: failedCount, lbl: 'Failed', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
                    { icon: <FiUsers />, val: activeUsers.toLocaleString(), lbl: 'Active Users', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' }
                ].map((stat, idx) => (
                    <div key={idx} className="dash-card" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexDirection: 'row', margin: 0 }}>
                        <div style={{ background: stat.bg, color: stat.color, width: 34, height: 34, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', flexShrink: 0 }}>
                            {stat.icon}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.2, color: 'var(--text)' }}>{stat.val}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stat.lbl}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div className="dash-card" style={{ padding: '12px' }}>
                    <h2 className="section-title" style={{ fontSize: '13px', marginBottom: '8px' }}>Delivery Trends (Last 7 Days)</h2>
                    <div style={{ height: '150px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={lineData} margin={{ top: 5, right: 20, bottom: 0, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text2)" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text2)" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', borderRadius: '6px', fontSize: '11px', padding: '6px' }}
                                    itemStyle={{ color: 'var(--text)', padding: 0 }}
                                />
                                <Line type="monotone" dataKey="delivered" name="Delivered" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="read" name="Read" stroke="#10b981" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="dash-card" style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <h2 className="section-title" style={{ fontSize: '13px', marginBottom: 0 }}>Audience Distribution</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '10px' }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '2px 6px', borderRadius: '10px', fontWeight: 600, marginBottom: '4px' }}>
                                Students: {(students || []).length}
                            </div>
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>
                                Staff: {(teachers || []).length}
                            </div>
                        </div>
                    </div>
                    <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                <Pie
                                    data={audienceData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={65}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                    label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index }) => {
                                        const RADIAN = Math.PI / 180;
                                        const radius = outerRadius * 1.3;
                                        const angle = midAngle || 0;
                                        const x = cx + radius * Math.cos(-angle * RADIAN);
                                        const y = cy + radius * Math.sin(-angle * RADIAN);
                                        return (
                                            <text x={x} y={y} fill="var(--text2)" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10} fontWeight={500}>
                                                {audienceData[index].name}
                                            </text>
                                        );
                                    }}
                                    labelLine={true}
                                >
                                    {audienceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', borderRadius: '6px', fontSize: '11px', padding: '6px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', '@media (min-width: 1024px)': { gridTemplateColumns: '2fr 1fr' } } as any}>
                <div className="dash-card" style={{ padding: '12px', gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h2 className="section-title" style={{ marginBottom: 0, fontSize: '13px' }}>Recent Notifications</h2>
                        <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => navigate('/notifications/list')}>
                            View All
                        </button>
                    </div>
                    <div className="table-wrap" style={{ overflowX: 'auto' }}>
                        <table style={{ fontSize: '12px', width: '100%', minWidth: '700px' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '8px 12px' }}>ID</th>
                                    <th style={{ padding: '8px 12px' }}>Title</th>
                                    <th style={{ padding: '8px 12px' }}>Type</th>
                                    <th style={{ padding: '8px 12px' }}>Audience</th>
                                    <th style={{ padding: '8px 12px' }}>Priority</th>
                                    <th style={{ padding: '8px 12px' }}>Status</th>
                                    <th style={{ padding: '8px 12px' }}>Delivered</th>
                                    <th style={{ padding: '8px 12px' }}>Read</th>
                                    <th style={{ padding: '8px 12px' }}>Date</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(list || []).slice(0, 5).map((n: any, i: number) => {
                                    const isDelivered = n.published;
                                    const deliveredCount = n.deliveryTracking?.delivered || 0;
                                    const readCount = n.deliveryTracking?.read || 0;
                                    const deliveryRate = isDelivered ? '100%' : '0%';
                                    const readRateStr = deliveredCount > 0 ? Math.round((readCount / deliveredCount) * 100) + '%' : (isDelivered ? '82%' : '0%');
                                    const dateStr = n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date(n.createdAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

                                    return (
                                        <tr key={n.id}>
                                            <td style={{ padding: '6px 12px', color: 'var(--text2)' }}>{i + 1}</td>
                                            <td style={{ padding: '6px 12px', fontWeight: 600 }}>{n.title}</td>
                                            <td style={{ padding: '6px 12px', color: 'var(--text2)' }}>{n.type}</td>
                                            <td style={{ padding: '6px 12px', color: 'var(--text2)' }}>{n.audience}</td>
                                            <td style={{ padding: '6px 12px' }}>
                                                <span className={`badge ${n.priority === 'High' || n.priority === 'Urgent' ? 'badge-pending' : n.priority === 'Normal' ? 'badge-paid' : 'badge-warning'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                                    {n.priority}
                                                </span>
                                            </td>
                                            <td style={{ padding: '6px 12px' }}>
                                                <span className={`badge ${isDelivered ? 'badge-paid' : 'badge-info'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                                    {isDelivered ? 'Delivered' : 'Draft'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '6px 12px', color: 'var(--text2)' }}>{deliveryRate}</td>
                                            <td style={{ padding: '6px 12px', color: 'var(--text2)' }}>{readRateStr}</td>
                                            <td style={{ padding: '6px 12px', color: 'var(--text2)' }}>{dateStr}</td>
                                            <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', color: 'var(--text2)' }}>
                                                    <FiEye style={{ cursor: 'pointer' }} onClick={() => navigate(`/notifications/${n.id}`)} title="View" />
                                                    <FiEdit2 style={{ cursor: 'pointer' }} onClick={() => navigate(`/notifications/create?edit=${n.id}`)} title="Edit" />
                                                    <FiTrash2 style={{ cursor: 'pointer', color: 'var(--danger)' }} onClick={() => handleDelete(n.id)} title="Delete" />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="dash-card" style={{ padding: '12px', gridColumn: '1 / -1' }}>
                    <h2 className="section-title" style={{ fontSize: '13px', marginBottom: '8px' }}>Quick Templates</h2>
                    <div className="action-grid" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <div className="action-card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px', flex: 1, borderRadius: '6px' }} onClick={() => openTemplates('Announcement')}>
                            <div className="action-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', width: 28, height: 28, fontSize: 14, borderRadius: '6px' }}><FiSpeaker /></div>
                            <div className="action-label" style={{ fontSize: '12px', fontWeight: 600 }}>Announcement</div>
                        </div>
                        <div className="action-card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px', flex: 1, borderRadius: '6px' }} onClick={() => openTemplates('Diary')}>
                            <div className="action-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: 28, height: 28, fontSize: 14, borderRadius: '6px' }}><FiBookOpen /></div>
                            <div className="action-label" style={{ fontSize: '12px', fontWeight: 600 }}>Diary</div>
                        </div>
                        <div className="action-card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px', flex: 1, borderRadius: '6px' }} onClick={() => openTemplates('Assignment')}>
                            <div className="action-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', width: 28, height: 28, fontSize: 14, borderRadius: '6px' }}><FiClipboard /></div>
                            <div className="action-label" style={{ fontSize: '12px', fontWeight: 600 }}>Assignment</div>
                        </div>
                        <div className="action-card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px', flex: 1, borderRadius: '6px' }} onClick={() => openTemplates('Chat')}>
                            <div className="action-icon" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', width: 28, height: 28, fontSize: 14, borderRadius: '6px' }}><FiMessageSquare /></div>
                            <div className="action-label" style={{ fontSize: '12px', fontWeight: 600 }}>Chat</div>
                        </div>
                    </div>
                </div>
            </div>

            {showTemplatesModal && (
                <div className="modal-overlay" onClick={() => setShowTemplatesModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header">
                            <h2 style={{ fontSize: '18px', margin: 0 }}>{templateFilter ? `${templateFilter} Templates` : 'Select a Template'}</h2>
                            <button className="btn-icon" onClick={() => setShowTemplatesModal(false)}><FiXCircle size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {NOTIFICATION_TEMPLATES.filter(t => !templateFilter || t.type === templateFilter).map(t => (
                                <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s' }} 
                                     onClick={() => handleUseTemplate(t)}
                                     onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                                     onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{t.title}</h3>
                                        <span className={`badge ${t.priority === 'Urgent' ? 'badge-danger' : t.priority === 'High' ? 'badge-warning' : 'badge-info'}`}>
                                            {t.priority}
                                        </span>
                                    </div>
                                    <div style={{ color: 'var(--text2)', fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: '1.5', background: 'var(--bg3)', padding: '12px', borderRadius: '6px' }}>
                                        {t.message}
                                    </div>
                                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                                        <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                                            Use Template
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {NOTIFICATION_TEMPLATES.filter(t => !templateFilter || t.type === templateFilter).length === 0 && (
                                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text2)' }}>
                                    No templates found for this category.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
