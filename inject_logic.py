import os

filepath = r"c:\Users\USER\Desktop\Mobile App Dev\TheSeeks Projects\TheSeeks-Dashboard\src\pages\academics\LibraryPage.tsx"

code = """import React, { useEffect, useState, useRef } from 'react';
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
    category: string;
    target: string;
    targetClass?: string;
    subject?: string;
    teacherName?: string;
    teacherId?: string;
    createdAt: any;
    updatedAt: any;
}

const CATEGORIES = ['General', 'Academic', 'Exam', 'Holiday', 'Event', 'Fee', 'Other'];
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

    let lines = escaped.split('\\n');
    let formattedLines = lines.map(line => {
        let trimmed = line.trim();
        if (trimmed.startsWith('### ')) return `<h3 style="font-size: 1.15em; font-weight: 700; margin-top: 10px; margin-bottom: 6px; color: var(--text1); list-style-type: none;">${trimmed.substring(4)}</h3>`;
        if (trimmed.startsWith('## ')) return `<h2 style="font-size: 1.25em; font-weight: 700; margin-top: 12px; margin-bottom: 8px; color: var(--text1); list-style-type: none;">${trimmed.substring(3)}</h2>`;
        if (trimmed.startsWith('# ')) return `<h1 style="font-size: 1.4em; font-weight: 800; margin-top: 14px; margin-bottom: 8px; color: var(--text1); list-style-type: none;">${trimmed.substring(2)}</h1>`;
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return `<li style="margin-left: 14px; list-style-type: disc;">${trimmed.substring(2)}</li>`;
        return line;
    });
    
    let html = formattedLines.join('\\n');
    html = html.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    html = html.replace(/\\*(.*?)\\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    const tokenRegex = /(\\[(.*?)\\]\\(((?:https?:\\/\\/|www\\.)?[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}[^\\s)]*)\\))|((?:https?:\\/\\/|www\\.)[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}[^\\s]*)/gi;
    const placeholders: string[] = [];
    html = html.replace(tokenRegex, (match, mdLink, label, url, plainUrl) => {
        const linkUrl = url || plainUrl;
        const linkLabel = label || plainUrl;
        const href = /^https?:\\/\\//i.test(linkUrl) ? linkUrl : `https://${linkUrl}`;
        const placeholder = `__LINK_PLACEHOLDER_${placeholders.length}__`;
        placeholders.push(`<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); text-decoration: underline; font-weight: 600">${linkLabel}</a>`);
        return placeholder;
    });

    placeholders.forEach((anchorHtml, idx) => { html = html.replace(`__LINK_PLACEHOLDER_${idx}__`, anchorHtml); });
    return html;
};

const StatCard = ({ icon, value, label }: { icon: React.ReactNode, value: string | number, label: string }) => (
  <div style={{
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    borderRadius: 8,
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 150
  }}>
    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255, 255, 255, 0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 16 }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)' }}>{label}</div>
    </div>
  </div>
);

const Tab = ({ active, children, onClick }: { active?: boolean, children: React.ReactNode, onClick: () => void }) => (
  <div 
    onClick={onClick}
    style={{ 
      paddingBottom: 12, 
      color: active ? '#1d4ed8' : 'var(--text2)', 
      fontWeight: active ? 700 : 500,
      borderBottom: `2px solid ${active ? '#1d4ed8' : 'transparent'}`,
      cursor: 'pointer',
      fontSize: 14
    }}
  >
    {children}
  </div>
);

const PageButton = ({ active, disabled, children }: { active?: boolean, disabled?: boolean, children: React.ReactNode }) => (
  <button style={{
    width: 32, height: 32, 
    borderRadius: 6, border: 'none',
    background: active ? '#e0e7ff' : 'transparent',
    color: active ? '#4f46e5' : (disabled ? '#9ca3af' : 'var(--text)'),
    fontWeight: active ? 700 : 500,
    cursor: disabled ? 'default' : 'pointer',
    display: 'flex', justifyContent: 'center', alignItems: 'center'
  }}>
    {children}
  </button>
);

export default function LibraryPage() {
    const dispatch = useAppDispatch();
    const { notices, noticesStatus: status } = useAppSelector((s: any) => s.general);
    const { data: teachers } = useAppSelector((state: any) => state.teachers);
    const classes = useAppSelector((s: any) => s.appSettings.classes as string[]);
    const classesStatus = useAppSelector((s: any) => s.appSettings.classesStatus);
    const loading = status === 'loading' || status === 'idle';

    const [activeTab, setActiveTab] = useState('All Materials');
    const [search, setSearch] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Notice | null>(null);
    const [form, setForm] = useState<Partial<Notice>>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    
    const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    const insertFormat = (type: 'bold' | 'italic' | 'heading' | 'list' | 'link') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);
        
        let replacement = '';
        let newCursorPos = start;

        if (type === 'bold') { replacement = `**${selected || 'bold text'}**`; newCursorPos = selected ? end + 4 : start + 2; }
        else if (type === 'italic') { replacement = `*${selected || 'italic text'}*`; newCursorPos = selected ? end + 2 : start + 1; }
        else if (type === 'heading') { replacement = `\\n### ${selected || 'Heading'}\\n`; newCursorPos = selected ? end + 6 : start + 5; }
        else if (type === 'list') { replacement = `\\n- ${selected || 'list item'}\\n`; newCursorPos = selected ? end + 4 : start + 3; }
        else if (type === 'link') {
            const url = prompt('Enter the link URL:', 'https://');
            if (url === null) return;
            const linkText = selected || prompt('Enter link display text:', 'Click here') || 'link';
            replacement = `[${linkText}](${url})`;
            newCursorPos = start + replacement.length;
        }

        const newValue = text.substring(0, start) + replacement + text.substring(end);
        setForm(p => ({ ...p, content: newValue }));
        setTimeout(() => { textarea.focus(); textarea.setSelectionRange(newCursorPos, newCursorPos); }, 50);
    };

    const filtered = notices.filter((n: Notice) => {
        const matchesSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
        const matchesClass = !filterClass || n.targetClass === filterClass || (n.targetClass === 'All' && filterClass === '');
        const matchesSubject = !filterSubject || n.subject === filterSubject || (n.subject === 'Select Subject' && filterSubject === '');
        return matchesSearch && matchesClass && matchesSubject;
    });

    const openAdd = () => { setEditing(null); setForm(emptyForm()); setModalOpen(true); };
    const openEdit = (n: Notice) => { setEditing(n); setForm({ ...n }); setModalOpen(true); };

    const save = async () => {
        if (!form.title || !form.content) { alert('Title and Content are required.'); return; }
        setSaving(true);
        try {
            const id = editing?.id || Date.now().toString();
            const cat = form.category || 'General';
            
            const payload = {
                id,
                title: form.title,
                content: form.content,
                category: cat,
                target: form.target || 'All',
                targetClass: form.targetClass || 'All',
                subject: form.subject || DEFAULT_SUBJECTS[0],
                teacherName: form.teacherName || '',
                teacherId: form.teacherId || '',
                ...(editing ? { createdAt: editing.createdAt, updatedAt: { seconds: Date.now() / 1000 } } : { createdAt: { seconds: Date.now() / 1000 }, updatedAt: null })
            } as Notice;

            dispatch(addOrUpdateNotice(payload));
            setModalOpen(false);

            await setDoc(doc(db, 'notices', id), {
                title: form.title,
                content: form.content,
                message: form.content,
                category: cat,
                target: form.target || 'All',
                targetClass: form.targetClass || 'All',
                subject: form.subject || DEFAULT_SUBJECTS[0],
                teacherName: form.teacherName || '',
                teacherId: form.teacherId || '',
                type: 'icon',
                iconName: 'document-text',
                iconColor: '#6366f1',
                iconBgColor: '#e0e7ff',
                updatedAt: serverTimestamp(),
                ...(!editing ? { createdAt: serverTimestamp() } : {}),
            }, { merge: true });
        } catch (e) { alert('Failed to save.'); }
        setSaving(false);
    };

    const remove = async (id: string, e: any) => {
        e.stopPropagation();
        if (!confirm('Delete this library note?')) return;
        setDeleting(id);
        dispatch(removeNotice(id));
        await deleteDoc(doc(db, 'notices', id));
        setDeleting(null);
    };

    const formatDate = (ts: any) => {
        if (!ts?.seconds) return { dateStr: '', timeStr: '' };
        const d = new Date(ts.seconds * 1000);
        return {
            dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            timeStr: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
    };

    const getTypeInfo = (content: string) => {
        const c = content?.toLowerCase() || '';
        if (c.includes('.pdf')) return { type: 'PDF', color: '#ef4444' };
        if (c.includes('.ppt') || c.includes('.pptx')) return { type: 'PPT', color: '#f59e0b' };
        if (c.includes('.doc') || c.includes('.docx')) return { type: 'DOC', color: '#10b981' };
        if (c.includes('.zip') || c.includes('.rar')) return { type: 'ZIP', color: '#8b5cf6' };
        if (c.includes('.png') || c.includes('.jpg')) return { type: 'IMG', color: '#0ea5e9' };
        return { type: 'DOC', color: '#6366f1' };
    };

    const getSubjectColor = (subject: string) => {
        if (!subject || subject === 'Select Subject') return '#64748b';
        const s = subject.toLowerCase();
        if (s.includes('math')) return '#3b82f6';
        if (s.includes('physic')) return '#8b5cf6';
        if (s.includes('english')) return '#10b981';
        if (s.includes('chemist')) return '#f59e0b';
        if (s.includes('biolog')) return '#ef4444';
        return '#0ea5e9';
    };

    const getClassColor = (c: string) => {
        if (!c || c === 'All') return '#64748b';
        const cl = c.toLowerCase();
        if (cl.includes('9')) return '#3b82f6';
        if (cl.includes('10')) return '#8b5cf6';
        if (cl.includes('1st')) return '#10b981';
        if (cl.includes('2nd')) return '#f59e0b';
        return '#0ea5e9';
    };

    const uniqueClasses = new Set(notices.map(n => n.targetClass).filter(c => c && c !== 'All')).size;
    const uniqueSubjects = new Set(notices.map(n => n.subject).filter(s => s && s !== 'Select Subject')).size;

    return (
        <div className="page" style={{ padding: '24px', background: 'var(--bg)', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', borderRadius: 16, padding: '36px 40px', position: 'relative', overflow: 'hidden', color: 'white', marginBottom: 24, boxShadow: '0 10px 25px -5px rgba(29, 78, 216, 0.4)' }}>
                <div style={{ position: 'relative', zIndex: 2 }}>
                    <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, color: '#fff', letterSpacing: '-0.5px' }}>e-Library</h1>
                    <p style={{ fontSize: 15, opacity: 0.9, maxWidth: 400, marginBottom: 28, lineHeight: 1.5 }}>Share study material, notes, and resources<br/>with all classes</p>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                        <StatCard icon="📄" value={notices.length} label="Total Materials" />
                        <StatCard icon="👥" value={uniqueClasses} label="Classes" />
                        <StatCard icon="🎓" value={uniqueSubjects} label="Subjects" />
                        <StatCard icon="💾" value="1.2 GB" label="Storage Used" />
                    </div>
                </div>
                <div style={{ position: 'absolute', right: 40, bottom: -20, opacity: 0.9, display: 'flex', alignItems: 'flex-end', gap: 20 }}>
                    <div style={{ width: 220, height: 180, background: 'rgba(255,255,255,0.1)', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><span style={{ fontSize: 100 }}>📖</span></div>
                    <div style={{ width: 80, height: 80, borderRadius: 40, background: '#6366f1', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 60, boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}><span style={{ fontSize: 32, color: '#fff' }}>☁️</span></div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 32, paddingLeft: 8 }}>
                    {['All Materials', 'By Class', 'By Subject', 'My Uploads', 'Shared With Me', 'Trash'].map(tab => (
                        <Tab key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>{tab}</Tab>
                    ))}
                </div>
                <button onClick={openAdd} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 12, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
                    + Upload Material
                </button>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                <div style={{ flex: 1, maxWidth: 400, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 12px', height: 42 }}>
                    <span style={{ opacity: 0.5, marginRight: 8 }}>🔍</span>
                    <input placeholder="Search materials..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 14, color: 'var(--text)' }} />
                </div>
                <select value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{ width: 160, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', height: 42, fontSize: 14, color: 'var(--text)', outline: 'none', cursor: 'pointer' }}>
                    <option value="">All Classes</option>
                    {classes?.filter((c: string) => c !== 'All').map((c: string) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} style={{ width: 160, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', height: 42, fontSize: 14, color: 'var(--text)', outline: 'none', cursor: 'pointer' }}>
                    <option value="">All Subjects</option>
                    {DEFAULT_SUBJECTS.filter((s: string) => s !== 'Select Subject').map((s: string) => <option key={s} value={s}>{s}</option>)}
                </select>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                    <button style={{ background: 'transparent', border: 'none', color: '#4f46e5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}><span style={{ fontSize: 16 }}>⇅</span> Sort by: Latest</button>
                </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '16px 20px', textAlign: 'left', color: 'var(--text2)', fontWeight: 600, fontSize: 13 }}>Material</th>
                                <th style={{ padding: '16px 20px', textAlign: 'left', color: 'var(--text2)', fontWeight: 600, fontSize: 13 }}>Class</th>
                                <th style={{ padding: '16px 20px', textAlign: 'left', color: 'var(--text2)', fontWeight: 600, fontSize: 13 }}>Subject</th>
                                <th style={{ padding: '16px 20px', textAlign: 'left', color: 'var(--text2)', fontWeight: 600, fontSize: 13 }}>Type</th>
                                <th style={{ padding: '16px 20px', textAlign: 'left', color: 'var(--text2)', fontWeight: 600, fontSize: 13 }}>Uploaded By</th>
                                <th style={{ padding: '16px 20px', textAlign: 'left', color: 'var(--text2)', fontWeight: 600, fontSize: 13 }}>Date</th>
                                <th style={{ padding: '16px 20px', textAlign: 'center', color: 'var(--text2)', fontWeight: 600, fontSize: 13 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20 }}>Loading...</td></tr> : null}
                            {!loading && filtered.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20 }}>No materials found</td></tr> : null}
                            
                            {filtered.map((row: Notice, idx: number) => {
                                const { dateStr, timeStr } = formatDate(row.createdAt);
                                const { type, color: typeColor } = getTypeInfo(row.content);
                                const subjectColor = getSubjectColor(row.subject || '');
                                const classColor = getClassColor(row.targetClass || '');

                                // Simple excerpt for subtitle
                                const subtitle = row.content ? row.content.replace(/<[^>]*>?/gm, '').substring(0, 40) + '...' : 'No description';

                                return (
                                <tr key={row.id} onClick={() => openEdit(row)} style={{ borderBottom: idx === filtered.length - 1 ? 'none' : '1px solid var(--border)', transition: 'background 0.2s', cursor: 'pointer' }}>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 8, background: `${typeColor}15`, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: `1px solid ${typeColor}30` }}>
                                                <span style={{ fontSize: 16 }}>📄</span>
                                                <span style={{ fontSize: 9, fontWeight: 800, color: typeColor, marginTop: -2 }}>{type}</span>
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14, marginBottom: 2 }}>{row.title}</div>
                                                <div style={{ color: 'var(--text2)', fontSize: 12 }}>{subtitle}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <span style={{ background: `${classColor}10`, color: classColor, padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 600 }}>{row.targetClass || 'All'}</span>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <span style={{ background: `${subjectColor}10`, color: subjectColor, padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 600 }}>{row.subject || 'General'}</span>
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <span style={{ background: `${typeColor}15`, color: typeColor, padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{type}</span>
                                    </td>
                                    <td style={{ padding: '16px 20px', color: 'var(--text2)', fontSize: 13 }}>{row.teacherName || 'Super Admin'}</td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <div style={{ color: 'var(--text)', fontSize: 13, marginBottom: 2 }}>{dateStr}</div>
                                        <div style={{ color: 'var(--text2)', fontSize: 12 }}>{timeStr}</div>
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                                            <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: 16 }}>👁️</button>
                                            <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: 16 }}>📥</button>
                                            <button onClick={(e) => remove(row.id, e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: 16, color: deleting === row.id ? 'red' : 'inherit' }}>{deleting === row.id ? '⏳' : '🗑️'}</button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', background: '#fff' }}>
                    <span style={{ color: 'var(--text2)', fontSize: 13 }}>Showing {filtered.length} materials</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                        <PageButton disabled>&lt;</PageButton>
                        <PageButton active>1</PageButton>
                        <PageButton disabled>&gt;</PageButton>
                    </div>
                    <select style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: 13, background: '#fff', color: 'var(--text)', cursor: 'pointer', outline: 'none' }}>
                        <option>25 per page</option>
                    </select>
                </div>
            </div>

            {/* Modal for adding/editing */}
            {modalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <div className="modal-title">{editing ? 'Edit Material' : 'Upload Material'}</div>
                            <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input className="form-input" placeholder="Material title..." value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select className="form-input" value={form.category || 'General'} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Target Audience</label>
                                    <select className="form-input" value={form.target || 'All'} onChange={e => setForm(p => ({ ...p, target: e.target.value }))}>
                                        {TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
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
                                        {DEFAULT_SUBJECTS.map((s: string) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Content / Description *</span>
                                    <span style={{ fontSize: 10, color: 'var(--text2)', opacity: 0.7 }}>Supports links and rich text</span>
                                </label>
                                <div className="rich-editor-toolbar" style={{ display: 'flex', gap: 6, padding: '6px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderBottom: 'none', borderTopLeftRadius: 6, borderTopRightRadius: 6, alignItems: 'center' }}>
                                    <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, minWidth: 28, height: 28, border: '1px solid var(--border)', background: 'var(--card)' }} onClick={() => insertFormat('bold')} title="Bold"><strong>B</strong></button>
                                    <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, minWidth: 28, height: 28, border: '1px solid var(--border)', background: 'var(--card)' }} onClick={() => insertFormat('italic')} title="Italic"><em>I</em></button>
                                    <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, minWidth: 28, height: 28, border: '1px solid var(--border)', background: 'var(--card)' }} onClick={() => insertFormat('heading')} title="Heading">H</button>
                                    <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, minWidth: 28, height: 28, border: '1px solid var(--border)', background: 'var(--card)' }} onClick={() => insertFormat('list')} title="List">• List</button>
                                    <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, minWidth: 28, height: 28, border: '1px solid var(--border)', background: 'var(--card)' }} onClick={() => insertFormat('link')} title="Insert Link">🔗 Link</button>
                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, background: 'var(--bg2)', padding: 2, borderRadius: 4, border: '1px solid var(--border)' }}>
                                        <button type="button" className={`btn ${editorTab === 'write' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '2px 8px', fontSize: 10, height: 22, border: 'none', borderRadius: 3 }} onClick={() => setEditorTab('write')}>Write</button>
                                        <button type="button" className={`btn ${editorTab === 'preview' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '2px 8px', fontSize: 10, height: 22, border: 'none', borderRadius: 3 }} onClick={() => setEditorTab('preview')}>Preview</button>
                                    </div>
                                </div>
                                {editorTab === 'write' ? (
                                    <textarea ref={textareaRef} className="form-input" style={{ resize: 'vertical', minHeight: 120, borderTopLeftRadius: 0, borderTopRightRadius: 0 }} placeholder="Write material description or paste PDF URLs here..." value={form.content || ''} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
                                ) : (
                                    <div className="form-input" style={{ minHeight: 120, background: 'var(--bg2)', borderTopLeftRadius: 0, borderTopRightRadius: 0, overflowY: 'auto', padding: '10px 14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: parseRichText(form.content || '') || '<em style="color: var(--text3)">No preview</em>' }} />
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Publishing...' : 'Publish Material'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
"""

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated LibraryPage.tsx successfully.")
