import React, { useEffect, useState } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchComplaints, addOrUpdateComplaint, removeComplaint } from '../../store/slices/generalSlice';
import { fetchStudents } from '../../store/slices/studentsSlice';
import { RootState } from '../../store/store';

export interface Complaint {
    id: string;
    subject: string;
    description: string;
    category: string;
    status: string;
    userName: string;
    userEmail: string;
    createdAt: any;
}

const CATEGORY_COLORS: Record<string, { color: string; icon: string }> = {
    Academic: { color: '#6366f1', icon: '🎓' },
    Infrastructure: { color: '#0ea5e9', icon: '🏢' },
    Discipline: { color: '#f59e0b', icon: '🛡️' },
    Transport: { color: '#10b981', icon: '🚌' },
    Other: { color: '#8b5cf6', icon: '💬' },
};
const FILTER_OPTIONS = ['All', 'Pending', 'In Progress', 'Resolved'];

export default function ComplaintsPage() {
    const dispatch = useAppDispatch();
    const { complaints, complaintsStatus: status } = useAppSelector((s: any) => s.general);
    const { data: students, status: studentsStatus } = useAppSelector((s: any) => s.students);
    const loading = status === 'loading' || status === 'idle' || studentsStatus === 'loading' || studentsStatus === 'idle';

    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [acting, setActing] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => { 
        if (status === 'idle') {
            dispatch(fetchComplaints()); 
        }
        if (studentsStatus === 'idle') {
            dispatch(fetchStudents());
        }
    }, [dispatch, status, studentsStatus]);

    const enrichedComplaints = complaints.map((c: any) => {
        const student = students.find((s: any) => (s.email && s.email.toLowerCase() === c.userEmail?.toLowerCase()) || (s.uid && s.uid === c.userId));
        return {
            ...c,
            displayUser: student?.name || c.userName,
            displayClass: student?.grade || 'N/A',
            displayRollNo: student?.rollno || 'N/A'
        };
    });

    const globalSearchQuery = useAppSelector((s: any) => s.general.globalSearchQuery);
    const activeSearch = search || globalSearchQuery;

    const filtered = enrichedComplaints.filter((c: any) => {
        const matchFilter = filter === 'All' || c.status === filter;
        const q = activeSearch.toLowerCase();
        return matchFilter && (!q || c.subject.toLowerCase().includes(q) || (c.displayUser || '').toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || (c.displayClass || '').toLowerCase().includes(q) || (c.displayRollNo || '').toLowerCase().includes(q));
    });

    const pendingCount = complaints.filter((c: Complaint) => c.status !== 'Resolved').length;
    const resolvedCount = complaints.filter((c: Complaint) => c.status === 'Resolved').length;

    const resolve = async (id: string) => {
        if (!confirm('Mark this complaint as Resolved?')) return;
        setActing(id);
        const comp = complaints.find((c: Complaint) => c.id === id);
        if (comp) dispatch(addOrUpdateComplaint({ ...comp, status: 'Resolved' }));
        await updateDoc(doc(db, 'complaints', id), { status: 'Resolved' });
        setActing(null);
    };

    const markInProgress = async (id: string) => {
        setActing(id);
        const comp = complaints.find((c: Complaint) => c.id === id);
        if (comp) dispatch(addOrUpdateComplaint({ ...comp, status: 'In Progress' }));
        await updateDoc(doc(db, 'complaints', id), { status: 'In Progress' });
        setActing(null);
    };

    const remove = async (id: string) => {
        if (!confirm('Permanently delete this complaint?')) return;
        setActing(id);
        dispatch(removeComplaint(id));
        await deleteDoc(doc(db, 'complaints', id));
        setActing(null);
    };

    const formatDate = (ts: any) => {
        if (!ts?.seconds) return '';
        return new Date(ts.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="page" style={{ padding: '0px', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="page-header" style={{ padding: '10px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)', zIndex: 10, flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>📝 Complaints</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>Track and manage student complaints</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {[
                            { label: 'Total', val: complaints.length, color: '#818cf8' },
                            { label: 'Pending', val: pendingCount, color: '#f59e0b' },
                            { label: 'Resolved', val: resolvedCount, color: '#10b981' },
                        ].map(item => (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px' }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: item.color }}>{item.val}</span>
                                <span style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? <div className="loading" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" />Loading...</div> : (
                <div className="table-wrap" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: '10px 16px', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div className="table-toolbar" style={{ padding: '6px 12px', gap: 6, flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
                        <div className="search-box" style={{ flex: 1.5, background: 'var(--bg3)', margin: 0, height: 30, minHeight: 'unset' }}>
                            <span className="search-icon" style={{ fontSize: 12 }}>🔍</span>
                            <input placeholder="Search subject, name..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: 'transparent', fontSize: 12 }} />
                        </div>
                        <div className="filter-chips">
                            {FILTER_OPTIONS.map(f => <button key={f} className={`chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>{f}</button>)}
                        </div>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text2)' }}>{filtered.length} records</span>
                    </div>
                    <div style={{ overflow: 'auto', flex: 1 }}>

                    {filtered.length === 0
                        ? <div className="empty">No complaints found</div>
                        : filtered.map((c: any) => {
                            const meta = CATEGORY_COLORS[c.category] || CATEGORY_COLORS.Other;
                            const resolved = c.status === 'Resolved';
                            const statusColor = resolved ? '#10b981' : c.status === 'In Progress' ? '#0ea5e9' : '#f59e0b';
                            const isExpanded = expanded === c.id;
                            return (
                                <div key={c.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                        {/* Category icon */}
                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{meta.icon}</div>
                                        {/* Content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                                <span style={{ fontWeight: 700, fontSize: 14 }}>{c.subject}</span>
                                                <span style={{ fontSize: 11, color: meta.color, background: `${meta.color}18`, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{c.category}</span>
                                                <span style={{ fontSize: 11, color: statusColor, background: `${statusColor}18`, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>{c.status}</span>
                                                {c.createdAt && <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 'auto' }}>{formatDate(c.createdAt)}</span>}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
                                                👤 <b>{c.displayUser}</b> <span style={{opacity: 0.6}}>({c.userEmail})</span> &nbsp;•&nbsp; Class: <b>{c.displayClass}</b> &nbsp;•&nbsp; Roll No: <b>{c.displayRollNo}</b>
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, overflow: 'hidden', maxHeight: isExpanded ? 'none' : '40px' }}>
                                                {c.description}
                                            </div>
                                            {c.description.length > 120 && (
                                                <button onClick={() => setExpanded(isExpanded ? null : c.id)} style={{ background: 'none', border: 'none', color: 'var(--primary-light)', fontSize: 11, cursor: 'pointer', padding: '2px 0', marginTop: 2 }}>
                                                    {isExpanded ? 'Show less ▲' : 'Read more ▼'}
                                                </button>
                                            )}
                                        </div>
                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                            {!resolved && c.status !== 'In Progress' && (
                                                <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px', color: '#0ea5e9', borderColor: '#0ea5e933' }} disabled={acting === c.id} onClick={() => markInProgress(c.id)}>⏳ In Progress</button>
                                            )}
                                            {!resolved && (
                                                <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px', color: '#10b981', borderColor: '#10b98133' }} disabled={acting === c.id} onClick={() => resolve(c.id)}>✓ Resolve</button>
                                            )}
                                            {resolved && (
                                                <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px', color: '#ef4444', borderColor: '#ef444433' }} disabled={acting === c.id} onClick={() => remove(c.id)}>🗑 Delete</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
