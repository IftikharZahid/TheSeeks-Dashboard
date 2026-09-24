import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchNotices, addOrUpdateNotice, removeNotice } from '../../store/slices/generalSlice';
import { fetchTeachers } from '../../store/slices/teachersSlice';
import { fetchClasses } from '../../store/slices/appSettingsSlice';

const DEFAULT_SUBJECTS = [
    'Select Subject', 'Tarjuma Tul Quran', 'Islamiyat', 'Urdu', 'English', 'Pak Study',
    'Mathematics', 'Physics', 'Chemistry', 'Computer Science',
    'Biology', 'Sociology', 'Psychology', 'Economics', 'Ethics', 'P.Eduation', 'History'
];

export interface Notice {
    id: string;
    title: string;
    content: string;
    image?: string;
    category: string;
    target: string;
    targetClass?: string;
    subject?: string;
    teacherName?: string;
    teacherId?: string;
    createdAt: any;
    updatedAt: any;
}

const CATEGORIES = ['General', 'Academic', 'Documents', 'Past Papers', 'Syllabus', 'Quick Notes', 'Audio Lectures', 'Exam', 'Holiday', 'Event', 'Fee', 'Other'];
const TARGETS = ['All', 'Students', 'Teachers', 'Parents'];

const emptyForm = (): Partial<Notice> => ({ title: '', content: '', category: 'General', target: 'All', targetClass: 'All', subject: DEFAULT_SUBJECTS[0] });

const parseRichText = (text: string) => {
    if (!text) return '';
    let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    let lines = escaped.split('\n');
    let formattedLines = lines.map(line => {
        let trimmed = line.trim();
        if (trimmed.startsWith('### ')) return `<h3 style="font-size: 1.15em; font-weight: 700; margin-top: 10px; margin-bottom: 6px; color: var(--text1);">${trimmed.substring(4)}</h3>`;
        if (trimmed.startsWith('## ')) return `<h2 style="font-size: 1.25em; font-weight: 700; margin-top: 12px; margin-bottom: 8px; color: var(--text1);">${trimmed.substring(3)}</h2>`;
        if (trimmed.startsWith('# ')) return `<h1 style="font-size: 1.4em; font-weight: 800; margin-top: 14px; margin-bottom: 8px; color: var(--text1);">${trimmed.substring(2)}</h1>`;
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return `<li style="margin-left: 14px; list-style-type: disc;">${trimmed.substring(2)}</li>`;
        return line;
    });

    let html = formattedLines.join('\n');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    const tokenRegex = /(\[(.*?)\]\(((?:https?:\/\/|www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s)]*)\))|((?:https?:\/\/|www\.)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*)/gi;
    const placeholders: string[] = [];
    html = html.replace(tokenRegex, (match, mdLink, label, url, plainUrl) => {
        const linkUrl = url || plainUrl;
        const linkLabel = label || plainUrl;
        const href = /^https?:\/\//i.test(linkUrl) ? linkUrl : `https://${linkUrl}`;
        const placeholder = `__LINK_PLACEHOLDER_${placeholders.length}__`;
        placeholders.push(`<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); text-decoration: underline; font-weight: 600">${linkLabel}</a>`);
        return placeholder;
    });

    placeholders.forEach((anchorHtml, idx) => { html = html.replace(`__LINK_PLACEHOLDER_${idx}__`, anchorHtml); });
    return html;
};

const getTypeInfo = (content: string) => {
    const c = content?.toLowerCase() || '';
    if (c.includes('.pdf')) return { type: 'PDF', color: '#ef4444', bg: '#fef2f2', icon: '📕' };
    if (c.includes('.ppt') || c.includes('.pptx')) return { type: 'PPT', color: '#f59e0b', bg: '#fffbeb', icon: '📊' };
    if (c.includes('.doc') || c.includes('.docx')) return { type: 'DOC', color: '#10b981', bg: '#ecfdf5', icon: '📝' };
    if (c.includes('.zip') || c.includes('.rar')) return { type: 'ZIP', color: '#8b5cf6', bg: '#f5f3ff', icon: '🗜️' };
    if (c.includes('.png') || c.includes('.jpg')) return { type: 'IMG', color: '#0ea5e9', bg: '#f0f9ff', icon: '🖼️' };
    return { type: 'BOOK', color: '#6366f1', bg: '#eef2ff', icon: '📖' };
};

const getSubjectColor = (subject: string) => {
    if (!subject || subject === 'Select Subject') return { color: '#64748b', bg: '#f1f5f9' };
    const s = subject.toLowerCase();
    if (s.includes('math')) return { color: '#3b82f6', bg: '#eff6ff' };
    if (s.includes('physic')) return { color: '#8b5cf6', bg: '#f5f3ff' };
    if (s.includes('english')) return { color: '#10b981', bg: '#ecfdf5' };
    if (s.includes('chemist')) return { color: '#f59e0b', bg: '#fffbeb' };
    if (s.includes('biolog')) return { color: '#ef4444', bg: '#fef2f2' };
    if (s.includes('urdu')) return { color: '#0ea5e9', bg: '#f0f9ff' };
    if (s.includes('islam')) return { color: '#10b981', bg: '#ecfdf5' };
    if (s.includes('quran')) return { color: '#059669', bg: '#d1fae5' };
    return { color: '#6366f1', bg: '#eef2ff' };
};

const getClassColor = (c: string) => {
    if (!c || c === 'All') return { color: '#64748b', bg: '#f1f5f9' };
    const cl = c.toLowerCase();
    if (cl.includes('9')) return { color: '#3b82f6', bg: '#eff6ff' };
    if (cl.includes('10')) return { color: '#8b5cf6', bg: '#f5f3ff' };
    if (cl.includes('1st')) return { color: '#10b981', bg: '#ecfdf5' };
    if (cl.includes('2nd')) return { color: '#f59e0b', bg: '#fffbeb' };
    return { color: '#0ea5e9', bg: '#f0f9ff' };
};

export default function BooksPage() {
    const dispatch = useAppDispatch();
    const { notices, noticesStatus: status } = useAppSelector((s: any) => s.general);
    const { data: teachers } = useAppSelector((state: any) => state.teachers);
    const classes = useAppSelector((s: any) => s.appSettings.classes as string[]);
    const classesStatus = useAppSelector((s: any) => s.appSettings.classesStatus);
    const loading = status === 'loading' || status === 'idle';

    const location = useLocation();
    const [search, setSearch] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const cat = queryParams.get('category');
        setFilterCategory(cat || '');
    }, [location.search]);

    const libraryCategories = useAppSelector((s: any) => s.appSettings.libraryCategories || []);
    const libraryCategoryNames = libraryCategories.map((c: any) => typeof c === 'string' ? c : c.name);
    const ALL_CATEGORIES = [...new Set([...CATEGORIES, ...libraryCategoryNames])];

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Notice | null>(null);
    const [form, setForm] = useState<Partial<Notice>>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'idle') dispatch(fetchNotices());
    }, [dispatch, status]);

    useEffect(() => {
        if (teachers?.length === 0) dispatch(fetchTeachers());
        if (classesStatus === 'idle') dispatch(fetchClasses());
    }, [teachers?.length, dispatch, classesStatus]);

    useEffect(() => {
        if (form.subject) {
            const matchingTeacher = teachers.find((t: any) => {
                if (t.subjects && Array.isArray(t.subjects)) return t.subjects.some((s: string) => s.toLowerCase() === form.subject!.toLowerCase());
                if (t.subject && typeof t.subject === 'string') return t.subject.split(',').some((s: string) => s.trim().toLowerCase() === form.subject!.toLowerCase());
                return t.subject === form.subject;
            });
            if (matchingTeacher) setForm(p => ({ ...p, teacherName: matchingTeacher.name, teacherId: matchingTeacher.id }));
            else setForm(p => ({ ...p, teacherName: '', teacherId: '' }));
        }
    }, [form.subject, teachers]);

    const filtered = notices.filter((n: Notice) => {
        const matchesSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
        const matchesClass = !filterClass || n.targetClass === filterClass || (n.targetClass === 'All' && filterClass === '');
        const matchesSubject = !filterSubject || n.subject === filterSubject;
        const matchesCategory = !filterCategory || n.category === filterCategory;
        return matchesSearch && matchesClass && matchesSubject && matchesCategory;
    });

    const openAdd = () => { setEditing(null); setForm(emptyForm()); setModalOpen(true); };
    const openEdit = (n: Notice) => { setEditing(n); setForm({ ...n }); setModalOpen(true); };

    const save = async () => {
        if (!form.title || !form.content) { alert('Title and Document Link are required.'); return; }
        setSaving(true);
        try {
            const id = editing?.id || Date.now().toString();
            const cat = form.category || 'General';
            const payload = {
                id, title: form.title, content: form.content, image: form.image || '', category: cat,
                target: form.target || 'All', targetClass: form.targetClass || 'All',
                subject: form.subject || DEFAULT_SUBJECTS[0],
                teacherName: form.teacherName || '', teacherId: form.teacherId || '',
                ...(editing ? { createdAt: editing.createdAt, updatedAt: { seconds: Date.now() / 1000 } } : { createdAt: { seconds: Date.now() / 1000 }, updatedAt: null })
            } as Notice;
            dispatch(addOrUpdateNotice(payload));
            setModalOpen(false);
            await setDoc(doc(db, 'notices', id), {
                title: form.title, content: form.content, message: form.content,
                image: form.image || '',
                category: cat, target: form.target || 'All', targetClass: form.targetClass || 'All',
                subject: form.subject || DEFAULT_SUBJECTS[0],
                teacherName: form.teacherName || '', teacherId: form.teacherId || '',
                type: 'icon', iconName: 'document-text', iconColor: '#6366f1', iconBgColor: '#e0e7ff',
                updatedAt: serverTimestamp(), ...(!editing ? { createdAt: serverTimestamp() } : {}),
            }, { merge: true });
        } catch (e) { alert('Failed to save.'); }
        setSaving(false);
    };

    const remove = async (id: string, e: any) => {
        e.stopPropagation();
        if (!confirm('Delete this library material?')) return;
        setDeleting(id);
        dispatch(removeNotice(id));
        await deleteDoc(doc(db, 'notices', id));
        setDeleting(null);
    };

    const formatDate = (ts: any) => {
        if (!ts?.seconds) return { dateStr: '—', timeStr: '' };
        const d = new Date(ts.seconds * 1000);
        return {
            dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            timeStr: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
    };

    const uniqueClasses = new Set(notices.map((n: Notice) => n.targetClass).filter((c: any) => c && c !== 'All')).size;
    const uniqueSubjects = new Set(notices.map((n: Notice) => n.subject).filter((s: any) => s && s !== 'Select Subject')).size;

    return (
        <div className="page" style={{ padding: '0px', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>

            {/* ── Compact Header ── */}
            <div className="page-header" style={{ padding: '10px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)', zIndex: 10, flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: 20 }}>📚</span> {filterCategory || 'Books'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>Manage and share study materials across all classes</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {[
                            { label: 'Materials', val: notices.length, color: '#818cf8' },
                            { label: 'Classes', val: uniqueClasses, color: '#10b981' },
                            { label: 'Subjects', val: uniqueSubjects, color: '#f59e0b' },
                        ].map(item => (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px' }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: item.color }}>{item.val}</span>
                                <span style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{item.label}</span>
                            </div>
                        ))}
                        <button onClick={openAdd} className="btn btn-primary" style={{ height: 30, padding: '0 12px', fontSize: 12, fontWeight: 600 }}>
                            + Upload Material
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Filter Bar ── */}
            <div className="responsive-filter-bar" style={{ padding: '6px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div className="search-box" style={{ flex: 1.5, background: 'var(--bg3)', margin: 0, height: 30, minHeight: 'unset' }}>
                    <span className="search-icon" style={{ fontSize: 12 }}>🔍</span>
                    <input placeholder="Search by title or content..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: 'transparent', fontSize: 12 }} />
                    {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>}
                </div>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }}>
                    <option value="">All Categories</option>
                    {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }}>
                    <option value="">All Classes</option>
                    {classes?.filter((c: string) => c !== 'All').map((c: string) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }}>
                    <option value="">All Subjects</option>
                    {DEFAULT_SUBJECTS.filter(s => s !== 'Select Subject').map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{filtered.length} materials</span>
                {(search || filterClass || filterSubject || filterCategory) && (
                    <button onClick={() => { setSearch(''); setFilterClass(''); setFilterSubject(''); setFilterCategory(''); }} className="btn btn-ghost" style={{ height: 30, fontSize: 11, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', padding: '0 10px' }}>
                        ✕ Clear
                    </button>
                )}
            </div>

            {/* ── Materials Grid ── */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', background: 'var(--bg)' }}>
                {/* Loading */}
                {loading && (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text2)' }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>Loading library materials...</div>
                    </div>
                )}

                {/* Empty state */}
                {!loading && filtered.length === 0 && (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text2)' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                            {search || filterClass || filterSubject ? 'No materials match your filters' : 'No materials uploaded yet'}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
                            {search || filterClass || filterSubject
                                ? 'Try adjusting your search or filter criteria.'
                                : 'Start by uploading study material, notes, or resources.'}
                        </div>
                        {!(search || filterClass || filterSubject) && (
                            <button onClick={openAdd} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                                + Upload First Material
                            </button>
                        )}
                    </div>
                )}

                {/* Grid */}
                {!loading && filtered.length > 0 && (
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
                        gap: '20px',
                        paddingBottom: '20px'
                    }}>
                        {filtered.map((row: Notice) => {
                            const { dateStr } = formatDate(row.createdAt);
                            const { type, color: typeColor, bg: typeBg, icon: typeIcon } = getTypeInfo(row.content);
                            const { color: subjectColor, bg: subjectBg } = getSubjectColor(row.subject || '');
                            const { color: classColor, bg: classBg } = getClassColor(row.targetClass || '');
                            
                            return (
                                <div key={row.id} style={{
                                    background: 'var(--card)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    boxShadow: '0 2px 8px -2px rgba(0,0,0,0.05)'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px -8px rgba(0, 0, 0, 0.15)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px -2px rgba(0,0,0,0.05)'; }}
                                >
                                    {/* Cover Image */}
                                    <div 
                                        onClick={() => openEdit(row)}
                                        style={{ 
                                        height: '210px', 
                                        background: row.image ? `url(${row.image}) center/cover` : typeBg, 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid var(--border)'
                                    }}>
                                        {!row.image && (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <span style={{ fontSize: 64, opacity: 0.9 }}>{typeIcon}</span>
                                                <span style={{ fontSize: 14, fontWeight: 800, color: typeColor, marginTop: 8, letterSpacing: '1px' }}>{type}</span>
                                            </div>
                                        )}
                                        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
                                            <span style={{ background: classBg, color: classColor, padding: '4px 10px', borderRadius: '12px', fontSize: 11, fontWeight: 700, border: `1px solid ${classColor}25`, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                                {row.targetClass || 'All'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Details */}
                                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {row.title}
                                            </h3>
                                            <span style={{ background: subjectBg, color: subjectColor, padding: '3px 8px', borderRadius: '6px', fontSize: 10, fontWeight: 700, border: `1px solid ${subjectColor}20`, flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                {(!row.subject || row.subject === 'Select Subject') ? 'General' : row.subject}
                                            </span>
                                        </div>
                                        
                                        <div style={{ flex: 1 }}></div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 12, color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                                                    {(row.teacherName || 'A')[0].toUpperCase()}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', lineHeight: 1, marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.teacherName || 'Admin'}</span>
                                                    <span style={{ fontSize: '10px', color: 'var(--text2)' }}>{dateStr}</span>
                                                </div>
                                            </div>
                                            
                                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                                {row.content && (
                                                    <a
                                                        href={row.content}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Open Document Link"
                                                        style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, transition: 'all 0.2s', textDecoration: 'none' }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#e0e7ff'; e.currentTarget.style.borderColor = '#6366f1'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                                    >🔗</a>
                                                )}
                                                <button
                                                    onClick={e => { e.stopPropagation(); openEdit(row); }}
                                                    title="Edit"
                                                    style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, transition: 'all 0.2s' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#e0e7ff'; e.currentTarget.style.borderColor = '#6366f1'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                                >✏️</button>
                                                <button
                                                    onClick={e => remove(row.id, e)}
                                                    title="Delete"
                                                    disabled={deleting === row.id}
                                                    style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, transition: 'all 0.2s', opacity: deleting === row.id ? 0.5 : 1 }}
                                                    onMouseEnter={e => { if (deleting !== row.id) { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#ef4444'; } }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                                >{deleting === row.id ? '⏳' : '🗑️'}</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Add / Edit Modal ── */}
            {modalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: 580, width: '100%' }}>
                        <div className="modal-header">
                            <div>
                                <div className="modal-title" style={{ fontSize: 16, fontWeight: 700 }}>
                                    {editing ? '✏️ Edit Material' : '📤 Upload Material'}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                                    {editing ? 'Update the material details below' : 'Fill in the details to publish a new material'}
                                </div>
                            </div>
                            <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
                        </div>

                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '65vh', overflowY: 'auto' }}>
                            {/* Title */}
                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input className="form-input" placeholder="e.g. Chapter 3 Notes — Thermodynamics" value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                            </div>

                            {/* Row: Category & Target */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select className="form-input" value={form.category || 'General'} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                                        {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Target Audience</label>
                                    <select className="form-input" value={form.target || 'All'} onChange={e => setForm(p => ({ ...p, target: e.target.value }))}>
                                        {TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Row: Class & Subject */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Target Class</label>
                                    <select className="form-input" value={form.targetClass || 'All'} onChange={e => setForm(p => ({ ...p, targetClass: e.target.value }))}>
                                        <option value="All">All Classes</option>
                                        {classes?.filter((c: string) => c !== 'All').map((c: string) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Subject</label>
                                    <select className="form-input" value={form.subject || DEFAULT_SUBJECTS[0]} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}>
                                        {DEFAULT_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Document & Image Links */}
                            <div className="form-group">
                                <label className="form-label">Document Link *</label>
                                <input className="form-input" placeholder="e.g. https://drive.google.com/..." value={form.content || ''} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Cover Image Link</label>
                                <input className="form-input" placeholder="e.g. https://example.com/cover.jpg" value={form.image || ''} onChange={e => setForm(p => ({ ...p, image: e.target.value }))} />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" disabled={saving} onClick={save}>
                                {saving ? 'Publishing...' : editing ? '✓ Save Changes' : '📤 Publish Material'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
