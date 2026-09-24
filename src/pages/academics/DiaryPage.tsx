import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { saveDiary, deleteDiary } from '../../store/slices/diariesSlice';
import { fetchTeachers } from '../../store/slices/teachersSlice';
import { fetchClasses } from '../../store/slices/appSettingsSlice';

const DEFAULT_SUBJECTS = [
    'Select Subject', 'Tarjuma Tul Quran', 'Islamiyat', 'Urdu', 'English', 'Pak Study',
    'Mathematics', 'Physics', 'Chemistry', 'Computer Science',
    'Biology', 'Sociology', 'Psychology', 'Economics', 'Ethics', 'P.Eduation', 'History'
];

export default function DiaryPage() {
    const dispatch = useAppDispatch();
    const { data: diaries, status } = useAppSelector((state: any) => state.diaries);
    const { data: teachers } = useAppSelector((state: any) => state.teachers);
    const classes = useAppSelector((s: any) => s.appSettings.classes as string[]);
    const classesStatus = useAppSelector((s: any) => s.appSettings.classesStatus);

    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const getWeekDays = (baseDate: Date) => {
        const d = new Date(baseDate);
        d.setHours(0, 0, 0, 0);
        const week = [];
        // Create a rolling window of the past 7 days (6 days ago + baseDate)
        for (let i = 6; i >= 0; i--) {
            const next = new Date(d);
            next.setDate(d.getDate() - i);
            week.push(next);
        }
        return week;
    };

    const getLocalDateStr = (d: Date | string | null) => {
        if (!d) return '';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return '';
        return `${dateObj.getFullYear()}-${(dateObj.getMonth()+1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
    };

    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [weekDays, setWeekDays] = useState(getWeekDays(new Date()));

    const prevWeek = () => {
        const prev = new Date(weekDays[0]);
        prev.setDate(prev.getDate() - 1); // The end date of the previous week is the day before the start of this week
        setWeekDays(getWeekDays(prev));
    };

    const nextWeek = () => {
        const next = new Date(weekDays[weekDays.length - 1]);
        next.setDate(next.getDate() + 7); // The end date of the next week is 7 days after the end of this week
        setWeekDays(getWeekDays(next));
    };

    const [isAdding, setIsAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterAudience, setFilterAudience] = useState('');

    // Form State
    const [editId, setEditId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [teacherName, setTeacherName] = useState('');
    const [teacherId, setTeacherId] = useState('');
    const [date, setDate] = useState('');
    const [className, setClassName] = useState('All');
    const [audience, setAudience] = useState('Both');
    const [subject, setSubject] = useState(DEFAULT_SUBJECTS[0]);
    const [details, setDetails] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (status === 'idle') {
            // Already handled globally by initDiariesListener in App.tsx
        }
    }, [status, dispatch]);

    useEffect(() => {
        if (teachers.length === 0) {
            dispatch(fetchTeachers());
        }
        if (classesStatus === 'idle') {
            dispatch(fetchClasses());
        }
    }, [teachers.length, dispatch, classesStatus]);

    // Auto-fetch teacher name when subject changes
    useEffect(() => {
        const matchingTeacher = teachers.find((t: any) => {
            if (t.subjects && Array.isArray(t.subjects)) {
                return t.subjects.some((s: string) => s.toLowerCase() === subject.toLowerCase());
            }
            if (t.subject && typeof t.subject === 'string') {
                return t.subject.split(',').some((s: string) => s.trim().toLowerCase() === subject.toLowerCase());
            }
            return t.subject === subject;
        });

        if (matchingTeacher) {
            setTeacherName(matchingTeacher.name);
            setTeacherId(matchingTeacher.id);
        } else {
            setTeacherName('');
            setTeacherId('');
        }
    }, [subject, teachers]);

    const handleEdit = (d: any) => {
        setEditId(d.id);
        setTitle(d.title || '');
        setClassName(d.className || 'All');
        setAudience(d.audience || 'Both');
        setSubject(d.subject || DEFAULT_SUBJECTS[0]);
        setTeacherName(d.teacherName || ''); // If we stored teacherName, or we can look it up by ID
        setTeacherId(d.teacherId || '');
        
        // Formate date
        let dateVal = '';
        if (d.date) {
            const dateObj = new Date(d.date);
            if (!isNaN(dateObj.getTime())) {
                dateVal = dateObj.toISOString().split('T')[0];
            }
        }
        setDate(dateVal);
        setDetails(d.details || '');
        setIsAdding(true);
    };

    const handleSave = async () => {
        if (!title || !date || !subject || !className || !details) {
            alert('Please fill out all required fields');
            return;
        }
        setSaving(true);
        try {
            await dispatch(saveDiary({
                id: editId || Date.now().toString(),
                title,
                teacherId,
                teacherName, // Store this for easier searching
                date,
                className,
                audience,
                subject,
                details
            })).unwrap();
            setIsAdding(false);
            resetForm();
        } catch (e: any) {
            alert('Failed to save diary: ' + e.message);
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this diary entry?')) {
            await dispatch(deleteDiary(id));
        }
    };

    const resetForm = () => {
        setEditId(null);
        setTitle('');
        setTeacherName('');
        setTeacherId('');
        setDate('');
        setClassName('All');
        setAudience('Both');
        setSubject(DEFAULT_SUBJECTS[0]);
        setDetails('');
    };

    const filteredDiaries = diaries.filter((d: any) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm ||
            (d.title || '').toLowerCase().includes(q) ||
            (d.teacherName || '').toLowerCase().includes(q);
        const matchesSubject = !filterSubject || d.subject === filterSubject;
        const matchesClass = !filterClass || filterClass === 'All' || d.className === filterClass || (!d.className && filterClass === 'All');
        
        let matchesAudience = true;
        if (filterAudience && filterAudience !== 'All') {
            const dClass = (d.className || '').toLowerCase();
            const dAudience = (d.audience || '').toLowerCase();
            const isMaleEntry = dClass.includes('boy') || dClass.includes('male') || ['boys', 'boy', 'm'].includes(dAudience);
            const isFemaleEntry = dClass.includes('girl') || dClass.includes('female') || ['girls', 'girl', 'f'].includes(dAudience);

            if (filterAudience === 'Boys' && isFemaleEntry && !isMaleEntry) matchesAudience = false;
            if (filterAudience === 'Girls' && isMaleEntry && !isFemaleEntry) matchesAudience = false;
        }
        
        let matchesDate = true;
        if (selectedDate) {
            const dDateStr = getLocalDateStr(d.date);
            const selDateStr = getLocalDateStr(selectedDate);
            matchesDate = dDateStr === selDateStr;
        }

        return matchesSearch && matchesSubject && matchesClass && matchesDate && matchesAudience;
    });

    const loading = status === 'loading' || status === 'idle';

    return (
        <div className="page" style={{ padding: '0px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="page-header" style={{ padding: '4px 16px', background: 'var(--card)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    
                    {/* Left: Title */}
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>📖 Daily Diary</div>
                        <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 1 }}>Manage class diaries and homework</div>
                    </div>

                    {/* Middle: Compact Calendar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 2, justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button className="btn btn-ghost" onClick={prevWeek} style={{ width: 20, height: 20, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg3)', border: '1px solid var(--border)' }}>‹</button>
                            <div style={{ fontWeight: 600, fontSize: 10, color: 'var(--text)', width: 45, textAlign: 'center', whiteSpace: 'nowrap' }}>
                                {MONTH_NAMES[weekDays[0].getMonth()]} '{weekDays[0].getFullYear().toString().substring(2)}
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: 2 }}>
                            {weekDays.map(day => {
                                const selDateStr = getLocalDateStr(selectedDate);
                                const dayStr = getLocalDateStr(day);
                                const isSelected = selDateStr === dayStr;
                                const isToday = getLocalDateStr(new Date()) === dayStr;
                                const isSunday = day.getDay() === 0;
                                const hasDiary = diaries.some((d: any) => getLocalDateStr(d.date) === dayStr);
                                
                                return (
                                    <div 
                                        key={dayStr}
                                        onClick={() => setSelectedDate(day)}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 28,
                                            height: 34,
                                            borderRadius: 6,
                                            cursor: 'pointer',
                                            border: `1px solid ${isSelected ? 'var(--primary)' : isSunday ? 'rgba(239,68,68,0.1)' : 'transparent'}`,
                                            background: isSelected ? 'var(--primary)' : isToday ? 'rgba(99, 102, 241, 0.08)' : isSunday ? 'rgba(239,68,68,0.03)' : 'transparent',
                                            color: isSelected ? '#fff' : isSunday ? '#ef4444' : 'var(--text)',
                                            transition: 'all 0.2s',
                                        }}
                                        title={`${MONTH_NAMES[day.getMonth()]} ${day.getDate()}, ${day.getFullYear()}`}
                                    >
                                        <span style={{ fontSize: 8, fontWeight: isSunday ? 700 : 600, color: isSelected ? 'rgba(255,255,255,0.8)' : isSunday ? '#ef4444' : 'var(--text2)', textTransform: 'uppercase', lineHeight: 1 }}>
                                            {DAY_LABELS[day.getDay()]}
                                        </span>
                                        <span style={{ fontSize: 12, fontWeight: 700, marginTop: 2, lineHeight: 1 }}>
                                            {day.getDate()}
                                        </span>
                                        <div style={{ height: 3, marginTop: 2 }}>
                                            {hasDiary && <div style={{ width: 3, height: 3, borderRadius: 1.5, background: isSelected ? '#fff' : 'var(--primary)' }} />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <button className="btn btn-ghost" onClick={nextWeek} style={{ width: 20, height: 20, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg3)', border: '1px solid var(--border)' }}>›</button>
                    </div>

                    {/* Right: Actions */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px' }}>
                            <span style={{ fontSize: 10, color: 'var(--text2)' }}>Total</span>
                            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary)' }}>{filteredDiaries.length}</span>
                        </div>
                        <button className="btn btn-primary" onClick={() => { resetForm(); setDate(getLocalDateStr(selectedDate)); setIsAdding(true); }} style={{ padding: '4px 10px', fontSize: 11, height: 26 }}>
                            ➕ Add
                        </button>
                    </div>
                </div>
            </div>



            {/* Filter Bar */}
            <div className="responsive-filter-bar" style={{ padding: '6px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
                <div className="search-box" style={{ flex: 1.5, background: 'var(--bg3)', margin: 0, height: 30, minHeight: 'unset', display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <span className="search-icon" style={{ fontSize: 12, marginRight: 6 }}>🔍</span>
                    <input
                        placeholder="Search diaries or teachers..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ background: 'transparent', fontSize: 12, border: 'none', outline: 'none', flex: 1, color: 'var(--text)' }}
                    />
                </div>
                <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }} value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                    <option value="">All Subjects</option>
                    {DEFAULT_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                    <option value="">All Classes</option>
                    {classes.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px', flex: 1 }} value={filterAudience} onChange={e => setFilterAudience(e.target.value)}>
                    <option value="">All Students</option>
                    <option value="Boys">Boys</option>
                    <option value="Girls">Girls</option>
                </select>
                {(searchTerm || filterSubject || filterClass || filterAudience) && (
                    <button className="btn btn-ghost" style={{ height: 30, fontSize: 11, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', padding: '0 10px' }} onClick={() => { setSearchTerm(''); setFilterSubject(''); setFilterClass(''); setFilterAudience(''); }}>
                        ✕ Clear
                    </button>
                )}
            </div>

            {/* Main Table */}
            {loading ? (
                <div className="loading" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /> Loading...</div>
            ) : (
                <div style={{ flex: 1, overflow: 'hidden', padding: '10px 16px', display: 'flex', flexDirection: 'column' }}>
                    <div className="table-wrap" style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', background: 'var(--card)', borderRadius: 8, overflow: 'hidden', margin: 0 }}>
                        <div style={{ overflow: 'auto', flex: 1 }}>
                            <table style={{ background: 'var(--card)', minWidth: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                    <tr style={{ background: 'linear-gradient(90deg, #6b21a8 0%, #9333ea 100%)', color: '#ffffff', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 200, color: '#fff', textAlign: 'left' }}>Diary Title</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 100, color: '#fff', textAlign: 'left' }}>Class</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 140, color: '#fff', textAlign: 'left' }}>Subject</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 160, color: '#fff', textAlign: 'left' }}>Teacher</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 120, color: '#fff', textAlign: 'left' }}>Date</th>
                                        <th style={{ padding: '7px 10px', borderLeft: '1px solid rgba(255,255,255,0.15)', width: 100, color: '#fff', textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDiaries.length === 0 ? (
                                        <tr><td colSpan={6} className="empty" style={{ padding: '40px', fontSize: 13, textAlign: 'center', color: 'var(--text2)' }}>
                                            <div style={{ fontSize: 40, marginBottom: 10 }}>📚</div>
                                            No diary entries for {getLocalDateStr(selectedDate)}
                                        </td></tr>
                                    ) : filteredDiaries.map((d: any, i: number) => {
                                        // Display formatted date
                                        let displayDate = d.date;
                                        if (d.date) {
                                            const dateObj = new Date(d.date);
                                            if (!isNaN(dateObj.getTime())) {
                                                displayDate = dateObj.toLocaleDateString();
                                            }
                                        }
                                        const teacher = teachers.find((t: any) => t.id === d.teacherId);
                                        const displayTeacherName = d.teacherName || (teacher ? teacher.name : d.teacherId);
                                        return (
                                        <tr key={d.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--card)' : 'var(--bg3)' }}>
                                            <td style={{ padding: '8px 10px', borderRight: '1px solid var(--border)' }}>
                                                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>{d.title}</div>
                                                {d.details && <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 300 }}>{d.details}</div>}
                                            </td>
                                            <td style={{ padding: '8px 10px', borderRight: '1px solid var(--border)', fontSize: 12, color: 'var(--text)' }}>
                                                {d.className || 'All'}
                                                {d.audience && (
                                                    <span style={{ marginLeft: 6, padding: '2px 6px', fontSize: 10, borderRadius: 4, background: d.audience === 'Boys' ? 'rgba(59,130,246,0.1)' : d.audience === 'Girls' ? 'rgba(236,72,153,0.1)' : 'rgba(16,185,129,0.1)', color: d.audience === 'Boys' ? '#3b82f6' : d.audience === 'Girls' ? '#ec4899' : '#10b981', fontWeight: 600 }}>
                                                        {d.audience}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '8px 10px', borderRight: '1px solid var(--border)' }}>
                                                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'rgba(147,51,234,0.12)', color: '#a855f7' }}>{d.subject}</span>
                                            </td>
                                            <td style={{ padding: '8px 10px', borderRight: '1px solid var(--border)', fontSize: 12, color: 'var(--text)' }}>{displayTeacherName}</td>
                                            <td style={{ padding: '8px 10px', borderRight: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)' }}>{displayDate}</td>
                                            <td style={{ padding: '8px 10px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                                    <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11, height: 26, color: '#3b82f6', background: 'rgba(59,130,246,0.1)' }} onClick={(e) => { e.stopPropagation(); handleEdit(d); }}>✎ Edit</button>
                                                    <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11, height: 26, color: '#ef4444', background: 'rgba(239,68,68,0.1)' }} onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }}>🗑 Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isAdding && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setIsAdding(false)}>
                    <div className="modal" style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <div className="modal-title">{editId ? 'Edit Diary' : 'Add Diary'}</div>
                            <button className="modal-close" onClick={() => setIsAdding(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Title *</label>
                                    <input className="form-input" placeholder="e.g. Chapter 3 Ex 3.1" value={title} onChange={e => setTitle(e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                                        <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Class *</label>
                                        <select className="form-input" value={className} onChange={e => setClassName(e.target.value)}>
                                            <option value="All">All</option>
                                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                                        <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Audience</label>
                                        <select className="form-input" value={audience} onChange={e => setAudience(e.target.value)}>
                                            <option value="Both">Both</option>
                                            <option value="Boys">Boys</option>
                                            <option value="Girls">Girls</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Subject *</label>
                                    <select className="form-input" value={subject} onChange={e => setSubject(e.target.value)}>
                                        {DEFAULT_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Teacher *</label>
                                    <input className="form-input" disabled style={{ backgroundColor: 'var(--bg3)', cursor: 'not-allowed', color: 'var(--textSecondary)' }} placeholder="Auto-filled from Teacher's Profile" value={teacherName} onChange={e => setTeacherName(e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Date *</label>
                                    <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Homework Details *</label>
                                    <textarea className="form-input" placeholder="Details about the homework..." rows={3} style={{ resize: 'vertical', minHeight: 60 }} value={details} onChange={e => setDetails(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setIsAdding(false)}>Cancel</button>
                            <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save Diary'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
