import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAppSelector } from '../../store/hooks';
import { Notification } from '../../notifications/types';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FiEdit2, FiArrowLeft, FiClock, FiTarget, FiSend, FiFileText, FiVideo, FiUsers, FiActivity, FiEye, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const PIE_COLORS = ['#34d399', '#60a5fa', '#a78bfa'];

export default function ViewNotification() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [notification, setNotification] = useState<Notification | null>(null);
    const [loading, setLoading] = useState(true);
    
    const { data: teachers } = useAppSelector((state: any) => state.teachers);
    
    const getSenderName = (id: string) => {
        if (!id || id.toLowerCase() === 'admin') return 'Super Admin';
        const teacher = teachers?.find((t: any) => t.id === id);
        return teacher ? teacher.name : (id.length > 20 ? 'Super Admin' : id);
    };

    useEffect(() => {
        const fetchNotif = async () => {
            if (!id) return;
            try {
                const docSnap = await getDoc(doc(db, 'notifications', id));
                if (docSnap.exists()) {
                    setNotification({ id: docSnap.id, ...docSnap.data() } as Notification);
                } else {
                    alert('Notification not found');
                    navigate('/notifications/list');
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchNotif();
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="page">
                <div className="loading">
                    <div className="spinner"></div>
                    <div>Loading analytics...</div>
                </div>
            </div>
        );
    }

    if (!notification) return null;

    const dt = notification.deliveryTracking || { delivered: 0, failed: 0, read: 0, opened: 0 };
    const createdAtStr = notification.createdAt?.toDate ? notification.createdAt.toDate().toLocaleString() : 'N/A';
    const sentTimeStr = notification.scheduledAt ? new Date(notification.scheduledAt).toLocaleString() : createdAtStr;
    const expiryStr = notification.expiryDate ? new Date(notification.expiryDate).toLocaleDateString() : 'Never';

    const engagementData = [
        { time: '0h', views: 0 },
        { time: '2h', views: Math.floor(dt.read * 0.2) },
        { time: '4h', views: Math.floor(dt.read * 0.5) },
        { time: '8h', views: Math.floor(dt.read * 0.7) },
        { time: '12h', views: Math.floor(dt.read * 0.85) },
        { time: '24h', views: dt.read || 0 },
    ];

    const audienceData = [
        { name: 'Students', value: 65 },
        { name: 'Teachers', value: 20 },
        { name: 'Parents', value: 15 },
    ];

    const audiences = Array.isArray(notification.audience) ? notification.audience : [notification.audience];

    return (
        <div className="page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                    <button className="btn btn-ghost" onClick={() => navigate('/notifications/list')} style={{ marginBottom: '12px', padding: '4px 8px', fontSize: '11px', border: 'none' }}>
                        <FiArrowLeft /> Back to Feed
                    </button>
                    <h1 className="page-title">Notification Analytics</h1>
                    <p className="page-sub">Performance and delivery metrics for this notification</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button className="btn btn-primary" onClick={() => navigate(`/notifications/edit/${id}`)}>
                        <FiEdit2 /> Edit Notification
                    </button>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}><FiCheckCircle /></div>
                    <div className="stat-info">
                        <div className="val">{dt.delivered}</div>
                        <div className="lbl">Total Delivered</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}><FiEye /></div>
                    <div className="stat-info">
                        <div className="val">{dt.read}</div>
                        <div className="lbl">Total Read</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa' }}><FiActivity /></div>
                    <div className="stat-info">
                        <div className="val">{dt.delivered > 0 ? Math.round((dt.read / dt.delivered) * 100) : 0}%</div>
                        <div className="lbl">Engagement Rate</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }}><FiAlertCircle /></div>
                    <div className="stat-info">
                        <div className="val">{dt.failed}</div>
                        <div className="lbl">Failed to Deliver</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', '@media (min-width: 1024px)': { gridTemplateColumns: '2fr 1fr' } } as any}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', gridColumn: '1 / -1', '@media (min-width: 1024px)': { gridColumn: 'auto' } } as any}>
                    
                    <div className="dash-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {notification.imageUrl && (
                            <div style={{ height: '140px', width: '100%', background: 'var(--bg3)', position: 'relative' }}>
                                <img src={notification.imageUrl} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--card), transparent)' }}></div>
                            </div>
                        )}
                        <div style={{ padding: '16px', flex: 1, position: 'relative', zIndex: 10, marginTop: notification.imageUrl ? '-40px' : '0' }}>
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                                    <span className={`badge ${notification.published ? 'badge-paid' : 'badge-info'}`}>
                                        {notification.published ? 'Published' : 'Draft'}
                                    </span>
                                    <span className="badge" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>{notification.type}</span>
                                    <span className="badge badge-warning">{notification.priority}</span>
                                </div>
                                <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text)', marginBottom: '8px', lineHeight: 1.2 }}>{notification.title}</h2>
                                {notification.subject && <h3 style={{ fontSize: '16px', color: 'var(--text2)', fontWeight: 500 }}>{notification.subject}</h3>}
                            </div>

                            <div style={{ color: 'var(--text)', background: 'var(--bg3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', lineHeight: 1.5, fontSize: '13px', wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: notification.description }} />

                            <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                {notification.pdfUrl && (
                                    <a href={notification.pdfUrl} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: '12px 20px', display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                                        <FiFileText style={{ color: '#f43f5e' }} size={18} /> View Attached PDF
                                    </a>
                                )}
                                {notification.videoLink && (
                                    <a href={notification.videoLink} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: '12px 20px', display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                                        <FiVideo style={{ color: '#3b82f6' }} size={18} /> Watch Video
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="dash-card" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div>
                                <h3 className="section-title" style={{ margin: 0, fontSize: '14px' }}>Engagement Over Time</h3>
                                <p style={{ fontSize: '11px', color: 'var(--text2)' }}>Views in the first 24 hours</p>
                            </div>
                        </div>
                        <div style={{ height: '180px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={engagementData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                    <XAxis dataKey="time" stroke="var(--text2)" tick={{ fill: 'var(--text2)', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis stroke="var(--text2)" tick={{ fill: 'var(--text2)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
                                    <Area type="monotone" dataKey="views" stroke="#a78bfa" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', gridColumn: '1 / -1', '@media (min-width: 1024px)': { gridColumn: 'auto' } } as any}>
                    
                    <div className="dash-card" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <FiTarget style={{ color: '#10b981' }} />
                            <h3 className="section-title" style={{ margin: 0, fontSize: '14px' }}>Targeting</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: '8px' }}>Audience Selected</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {audiences.map((aud, i) => (
                                        <span key={i} className="badge" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>{aud}</span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: '8px' }}>Delivery Mode</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>
                                    <FiSend style={{ color: '#3b82f6' }} />
                                    {notification.deliveryMode}
                                </div>
                            </div>
                            {notification.deepLinkScreen && (
                                <div>
                                    <div style={{ fontSize: '11px', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, marginBottom: '8px' }}>In-App Route</div>
                                    <div style={{ background: 'var(--bg3)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '12px', color: '#a78bfa' }}>
                                        /{notification.deepLinkScreen}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="dash-card" style={{ padding: '16px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <FiUsers style={{ color: '#3b82f6' }} />
                            <h3 className="section-title" style={{ margin: 0, fontSize: '14px' }}>Audience Reach</h3>
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '12px' }}>Estimated distribution</p>
                        <div style={{ height: '140px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={audienceData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none">
                                        {audienceData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                            {audienceData.map((d, i) => (
                                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 500, color: 'var(--text2)' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: PIE_COLORS[i] }}></div>
                                    {d.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="dash-card" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <FiClock style={{ color: '#f59e0b' }} />
                            <h3 className="section-title" style={{ margin: 0, fontSize: '14px' }}>Timeline</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text2)' }}>Created By</span>
                                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{getSenderName(notification.createdBy)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text2)' }}>Dispatched</span>
                                <span style={{ fontSize: '13px', fontWeight: 500, color: '#60a5fa' }}>{sentTimeStr}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text2)' }}>Expires On</span>
                                <span style={{ fontSize: '13px', fontWeight: 500, color: '#f43f5e' }}>{expiryStr}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
