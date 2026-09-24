import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { addOrUpdateSuggestion, removeSuggestion, setSuggestions } from '../../store/slices/generalSlice';

export interface Suggestion {
    id: string;
    title: string;
    suggestion: string;
    teacherName: string;
    teacherId: string;
    status: string;
    createdAt: any;
}

const FILTER_OPTIONS = ['All', 'pending', 'reviewed', 'resolved'];

export default function SuggestionsPage() {
    const dispatch = useAppDispatch();
    
    // Get from Redux instead of local state
    const rawSuggestions = useAppSelector((s: any) => s.general.suggestions) || [];
    const suggestionsStatus = useAppSelector((s: any) => s.general.suggestionsStatus);
    
    // Real-time listener using Redux Toolkit
    useEffect(() => {
        const q = query(collection(db, 'suggestions'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            dispatch(setSuggestions(docs));
        }, (err) => {
            console.error("Error listening to suggestions:", err);
        });
        
        return () => unsubscribe();
    }, [dispatch]);

    const suggestions = [...rawSuggestions].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    const loading = suggestionsStatus === 'loading';

    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [acting, setActing] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);

    const globalSearchQuery = useAppSelector((s: any) => s.general.globalSearchQuery);

    const activeSearch = search || globalSearchQuery;

    const filtered = suggestions.filter((s) => {
        const matchFilter = filter === 'All' || (s.status || 'pending') === filter;
        const q = activeSearch.toLowerCase();
        return matchFilter && (!q || s.title?.toLowerCase().includes(q) || (s.teacherName || '').toLowerCase().includes(q) || s.suggestion?.toLowerCase().includes(q));
    });

    const pendingCount = suggestions.filter(s => (s.status || 'pending') === 'pending').length;
    const reviewedCount = suggestions.filter(s => s.status === 'reviewed').length;
    const resolvedCount = suggestions.filter(s => s.status === 'resolved').length;

    const updateStatus = async (id: string, newStatus: string) => {
        setActing(id);
        try {
            await updateDoc(doc(db, 'suggestions', id), { status: newStatus });
            const s = suggestions.find(x => x.id === id);
            if (s) {
                dispatch(addOrUpdateSuggestion({ ...s, status: newStatus }));
            }
        } catch (e) {
            console.error("Error updating suggestion", e);
        }
        setActing(null);
    };

    const remove = async (id: string) => {
        if (!confirm('Permanently delete this suggestion?')) return;
        setActing(id);
        try {
            await deleteDoc(doc(db, 'suggestions', id));
            dispatch(removeSuggestion(id));
        } catch (e) {
            console.error("Error deleting suggestion", e);
        }
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
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>💡 Teacher Suggestions</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>Review and manage teacher suggestions</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {[
                            { label: 'Total', val: suggestions.length, color: '#8b5cf6' },
                            { label: 'Pending', val: pendingCount, color: '#f59e0b' },
                            { label: 'Reviewed', val: reviewedCount + resolvedCount, color: '#10b981' },
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
                            <input placeholder="Search suggestions, names..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: 'transparent', fontSize: 12 }} />
                        </div>
                        <div className="filter-chips">
                            {FILTER_OPTIONS.map(f => (
                                <button key={f} className={`chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text2)' }}>{filtered.length} records</span>
                    </div>
                    <div style={{ overflow: 'auto', flex: 1 }}>

                    {filtered.length === 0
                        ? <div className="empty">No suggestions found</div>
                        : filtered.map((s) => {
                            const currentStatus = s.status || 'pending';
                            const resolved = currentStatus === 'resolved';
                            const reviewed = currentStatus === 'reviewed';
                            const statusColor = resolved ? '#10b981' : reviewed ? '#0ea5e9' : '#f59e0b';
                            const isExpanded = expanded === s.id;
                            
                            return (
                                <div key={s.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                                            💡
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                                <span style={{ fontWeight: 700, fontSize: 14 }}>{s.title}</span>
                                                <span style={{ fontSize: 11, color: statusColor, background: `${statusColor}18`, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                                                    {currentStatus.toUpperCase()}
                                                </span>
                                                {s.createdAt && <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 'auto' }}>{formatDate(s.createdAt)}</span>}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
                                                👤 Submitted by: <b>{s.teacherName}</b>
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, overflow: 'hidden', maxHeight: isExpanded ? 'none' : '40px' }}>
                                                {s.suggestion}
                                            </div>
                                            {s.suggestion?.length > 120 && (
                                                <button onClick={() => setExpanded(isExpanded ? null : s.id)} style={{ background: 'none', border: 'none', color: 'var(--primary-light)', fontSize: 11, cursor: 'pointer', padding: '2px 0', marginTop: 2 }}>
                                                    {isExpanded ? 'Show less ▲' : 'Read more ▼'}
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                            {currentStatus === 'pending' && (
                                                <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px', color: '#0ea5e9', borderColor: '#0ea5e933' }} disabled={acting === s.id} onClick={() => updateStatus(s.id, 'reviewed')}>👁 Review</button>
                                            )}
                                            {currentStatus !== 'resolved' && (
                                                <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px', color: '#10b981', borderColor: '#10b98133' }} disabled={acting === s.id} onClick={() => updateStatus(s.id, 'resolved')}>✓ Resolve</button>
                                            )}
                                            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px', color: '#ef4444', borderColor: '#ef444433' }} disabled={acting === s.id} onClick={() => remove(s.id)}>🗑 Delete</button>
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
