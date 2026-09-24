import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAssignments, saveAssignment, deleteAssignment } from '../../store/slices/assignmentsSlice';
import { fetchTeachers } from '../../store/slices/teachersSlice';
import { fetchClasses } from '../../store/slices/appSettingsSlice';

const DEFAULT_SUBJECTS = [
    'Select Subject', 'Tarjuma Tul Quran', 'Islamiyat', 'Urdu', 'English', 'Pak Study',
    'Mathematics', 'Physics', 'Chemistry', 'Computer Science',
    'Biology', 'Sociology', 'Psychology', 'Economics', 'Ethics', 'P.Eduation', 'History'
];


export default function AssignmentsPage() {
    const dispatch = useAppDispatch();
    const { data: assignments, status } = useAppSelector((state: any) => state.assignments);
    const { data: teachers } = useAppSelector((state: any) => state.teachers);
    const classes = useAppSelector((s: any) => s.appSettings.classes as string[]);
    const classesStatus = useAppSelector((s: any) => s.appSettings.classesStatus);

    const [isAdding, setIsAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterClass, setFilterClass] = useState('');

    // Form State
    const [editId, setEditId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [teacherName, setTeacherName] = useState('');
    const [deadline, setDeadline] = useState('');
    const [targetClass, setTargetClass] = useState('All');
    const [subject, setSubject] = useState(DEFAULT_SUBJECTS[0]);
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchAssignments());
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
        const matchingTeacher = teachers.find((t: any) => t.subject === subject);
        if (matchingTeacher) {
            setTeacherName(matchingTeacher.name);
        } else {
            setTeacherName('');
        }
    }, [subject, teachers]);

    const handleEdit = (a: any) => {
        setEditId(a.id);
        setTitle(a.title || '');
        setTargetClass(a.targetClass || 'All');
        setSubject(a.subject || DEFAULT_SUBJECTS[0]);
        setTeacherName(a.teacherName || '');
        setDeadline(a.deadline || '');
        setDescription(a.description || '');
        setIsAdding(true);
    };

    const handleSave = async () => {
        if (!title || !teacherName || !deadline || !subject || !targetClass) {
            alert('Please fill out all required fields');
            return;
        }
        setSaving(true);
        try {
            await dispatch(saveAssignment({
                id: editId || Date.now().toString(),
                title,
                teacherName,
                deadline,
                targetClass,
                subject,
                description
            })).unwrap();
            setIsAdding(false);
            resetForm();
        } catch (e: any) {
            alert('Failed to save assignment: ' + e.message);
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this assignment?')) {
            await dispatch(deleteAssignment(id));
        }
    };

    const resetForm = () => {
        setEditId(null);
        setTitle('');
        setTeacherName('');
        setDeadline('');
        setTargetClass('All');
        setSubject(DEFAULT_SUBJECTS[0]);
        setDescription('');
    };

    const filteredAssignments = assignments.filter((a: any) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm ||
            (a.title || '').toLowerCase().includes(q) ||
            (a.teacherName || '').toLowerCase().includes(q);
        const matchesSubject = !filterSubject || a.subject === filterSubject;
        const matchesClass = !filterClass || a.targetClass === filterClass || (!a.targetClass && filterClass === 'All');
        return matchesSearch && matchesSubject && matchesClass;
    });

    const loading = status === 'loading' || status === 'idle';

    return (
        <div className="page" style={{ padding: '0px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="page-header" style={{ padding: '10px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>📓 Assignments</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>Manage coursework and class assignments</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px' }}>
                            <span style={{ fontSize: 11, color: 'var(--text2)' }}>Total</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>{filteredAssignments.length}</span>
                            <span style={{ fontSize: 10, color: 'var(--text2)' }}>{(filterSubject || filterClass || searchTerm) ? 'found' : 'assignments'}</span>
                        </div>
                        <button className="btn btn-primary" onClick={() => { resetForm(); setIsAdding(true); }} style={{ padding: '5px 12px', fontSize: 12, height: 30 }}>
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
                        placeholder="Search assignments or teachers..."
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
                {(searchTerm || filterSubject || filterClass) && (
                    <button className="btn btn-ghost" style={{ height: 30, fontSize: 11, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', padding: '0 10px' }} onClick={() => { setSearchTerm(''); setFilterSubject(''); setFilterClass(''); }}>
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
                                    <tr style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 100%)', color: '#ffffff', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 200, color: '#fff', textAlign: 'left' }}>Assignment Title</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 100, color: '#fff', textAlign: 'left' }}>Class</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 140, color: '#fff', textAlign: 'left' }}>Subject</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 160, color: '#fff', textAlign: 'left' }}>Teacher</th>
                                        <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', minWidth: 120, color: '#fff', textAlign: 'left' }}>Deadline</th>
                                        <th style={{ padding: '7px 10px', borderLeft: '1px solid rgba(255,255,255,0.15)', width: 100, color: '#fff', textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAssignments.length === 0 ? (
                                        <tr><td colSpan={5} className="empty" style={{ padding: '30px', fontSize: 12 }}>No assignments found matching filters</td></tr>
                                    ) : filteredAssignments.map((a: any, i: number) => (
                                        <tr key={a.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--card)' : 'var(--bg3)' }}>
                                            <td style={{ padding: '8px 10px', borderRight: '1px solid var(--border)' }}>
                                                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>{a.title}</div>
                                                {a.description && <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 300 }}>{a.description}</div>}
                                            </td>
                                            <td style={{ padding: '8px 10px', borderRight: '1px solid var(--border)', fontSize: 12, color: 'var(--text)' }}>{a.targetClass || 'All'}</td>
                                            <td style={{ padding: '8px 10px', borderRight: '1px solid var(--border)' }}>
                                                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>{a.subject}</span>
                                            </td>
                                            <td style={{ padding: '8px 10px', borderRight: '1px solid var(--border)', fontSize: 12, color: 'var(--text)' }}>{a.teacherName}</td>
                                            <td style={{ padding: '8px 10px', borderRight: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)' }}>{a.deadline}</td>
                                            <td style={{ padding: '8px 10px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                                    <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11, height: 26, color: '#3b82f6', background: 'rgba(59,130,246,0.1)' }} onClick={(e) => { e.stopPropagation(); handleEdit(a); }}>✎ Edit</button>
                                                    <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11, height: 26, color: '#ef4444', background: 'rgba(239,68,68,0.1)' }} onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }}>🗑 Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
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
                            <div className="modal-title">{editId ? 'Edit Assignment' : 'Add Assignment'}</div>
                            <button className="modal-close" onClick={() => setIsAdding(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Assignment Title *</label>
                                    <input className="form-input" placeholder="e.g. Chapter 1 Exercise" value={title} onChange={e => setTitle(e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Target Class *</label>
                                    <select className="form-input" value={targetClass} onChange={e => setTargetClass(e.target.value)}>
                                        <option value="All">All</option>
                                        {classes.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Subject *</label>
                                    <select className="form-input" value={subject} onChange={e => setSubject(e.target.value)}>
                                        {DEFAULT_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Teacher Name *</label>
                                    <input className="form-input" disabled style={{ backgroundColor: 'var(--bg3)', cursor: 'not-allowed', color: 'var(--textSecondary)' }} placeholder="Auto-filled from Teacher's Profile" value={teacherName} onChange={e => setTeacherName(e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Deadline Date *</label>
                                    <input type="date" className="form-input" value={deadline} onChange={e => setDeadline(e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>Description (Optional)</label>
                                    <textarea className="form-input" placeholder="Additional details..." rows={3} style={{ resize: 'vertical', minHeight: 60 }} value={description} onChange={e => setDescription(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setIsAdding(false)}>Cancel</button>
                            <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save Assignment'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
