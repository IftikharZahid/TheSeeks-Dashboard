import React from 'react';
import { Link } from 'react-router-dom';
import { Icons } from './DashboardIcons';

interface DashboardRightColumnProps {
    filteredNotices: any[];
    filteredComplaints: any[];
    assignmentCount: number;
    galleryCount: number;
    todayDiaries?: any[];
}

export default function DashboardRightColumn({ filteredNotices, filteredComplaints, assignmentCount, galleryCount, todayDiaries = [] }: DashboardRightColumnProps) {
    const catColors: Record<string, string> = { General: '#6366f1', Academic: '#0ea5e9', Exam: '#ef4444', Holiday: '#10b981', Event: '#f59e0b', Fee: '#8b5cf6', Other: '#94a3b8' };
    const formatDate = (ts: any) => ts?.seconds ? new Date(ts.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* E-Library */}
            <div className="dash-card dash-animate" style={{ padding: '14px 16px', animationDelay: '0.2s' }}>
                <div className="dash-section-hdr">
                    <div className="dash-section-title">
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                            {Icons.notices}
                        </div>
                        E-Library
                    </div>
                    <Link to="/library" className="dash-viewall">View all →</Link>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {filteredNotices.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', padding: '16px 0' }}>No items found</div>
                    ) : [...filteredNotices].sort((a: any, b: any) => {
                        const getT = (x: any) => x.createdAt?.seconds !== undefined ? x.createdAt.seconds * 1000 : (typeof x.createdAt === 'number' ? x.createdAt : 0);
                        return getT(b) - getT(a);
                    }).slice(0, 4).map((n: any, i: number) => {
                        const color = catColors[n.category] || '#6366f1';
                        return (
                            <div key={n.id || i} style={{
                                border: '1px solid var(--border)',
                                borderLeft: `2px solid ${color}`,
                                borderRadius: 8, padding: '8px 10px',
                                transition: 'background 0.15s',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{n.title}</div>
                                    <span style={{ background: `${color}12`, color: color, fontSize: 9, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                                        {n.category || 'General'}
                                    </span>
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>{n.target || 'All'}</span>
                                    <span>·</span>
                                    <span>{formatDate(n.createdAt)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Recent Complaints */}
            <div className="dash-card dash-animate" style={{ padding: '14px 16px', animationDelay: '0.25s' }}>
                <div className="dash-section-hdr">
                    <div className="dash-section-title">
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                            {Icons.message}
                        </div>
                        Recent Complaints
                    </div>
                    <Link to="/complaints" className="dash-viewall">View all →</Link>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {filteredComplaints.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', padding: '14px 0' }}>No complaints found</div>
                    ) : filteredComplaints.slice(0, 5).map((c: any, i: number) => {
                        const statusColor = c.status === 'Resolved' ? '#10b981' : c.status === 'In Progress' ? '#0ea5e9' : '#f59e0b';
                        const initials = (c.displayUser || 'U').charAt(0).toUpperCase();
                        const avatarBg = ['#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#0ea5e9', '#f59e0b'][i % 6];
                        const fmtDate = (ts: any) => ts?.seconds ? new Date(ts.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                        return (
                            <div key={c.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                                <div style={{
                                    width: 30, height: 30, borderRadius: '50%', background: avatarBg,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0
                                }}>
                                    {initials}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {c.displayUser || 'Unknown'}
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--text2)' }}>
                                        {c.category} · Class {c.displayClass}{c.createdAt ? ` · ${fmtDate(c.createdAt)}` : ''}
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: 9, fontWeight: 700, padding: '2px 8px',
                                    borderRadius: 10, background: `${statusColor}12`, color: statusColor,
                                    flexShrink: 0
                                }}>
                                    {c.status}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Assignments Quick Card */}
            <div className="dash-card dash-animate" style={{ padding: '12px 14px', animationDelay: '0.35s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: 8,
                        background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', flexShrink: 0
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                            <path d="M14 3v5h5M16 13H8M16 17H8M10 9H8"/>
                        </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Assignments</div>
                        <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 500 }}>{assignmentCount} active</div>
                    </div>
                    <Link to="/assignments" className="dash-viewall" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        Manage {Icons.arrowRight}
                    </Link>
                </div>
            </div>

            {/* Today's Diary List */}
            <div className="dash-card dash-animate" style={{ padding: '14px 16px', animationDelay: '0.36s' }}>
                <div className="dash-section-hdr">
                    <div className="dash-section-title">
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#fce7f3', color: '#be185d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                            {Icons.diary}
                        </div>
                        Today's Diary
                    </div>
                    <Link to="/diary" className="dash-viewall">View all →</Link>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {todayDiaries.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', padding: '14px 0' }}>No diaries added today</div>
                    ) : todayDiaries.slice(0, 4).map((d: any, i: number) => {
                        const initials = (d.className || 'C').charAt(0).toUpperCase();
                        const avatarBg = ['#be185d', '#ec4899', '#db2777', '#9d174d'][i % 4];
                        return (
                            <div key={d.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: i < 3 && i < todayDiaries.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                <div style={{
                                    width: 30, height: 30, borderRadius: '6px', background: avatarBg,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0
                                }}>
                                    {initials}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {d.className} - {d.subject}
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {d.title}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Gallery Quick Card */}
            <div className="dash-card dash-animate" style={{ padding: '12px 14px', animationDelay: '0.4s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: 8,
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', flexShrink: 0
                    }}>
                        {Icons.video}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Video Gallery</div>
                        <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 500 }}>{galleryCount} galleries</div>
                    </div>
                    <Link to="/videos" className="dash-viewall" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        View {Icons.arrowRight}
                    </Link>
                </div>
            </div>

        </div>
    );
}
