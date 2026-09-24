import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchStudents } from '../../store/slices/studentsSlice';
import { fetchExams, selectAllExams } from '../../store/slices/examsSlice';
import { fetchAttendance } from '../../store/slices/attendanceSlice';
import { fetchWhatsAppSettings, persistWhatsAppSettings } from '../../store/slices/appSettingsSlice';
import { 
    FaWhatsapp, 
    FaCog, 
    FaQuestionCircle, 
    FaUserFriends, 
    FaCheckCircle, 
    FaFileAlt, 
    FaPaperPlane, 
    FaRegClock, 
    FaTimesCircle, 
    FaChevronLeft, 
    FaChevronRight, 
    FaSearch, 
    FaRegCalendarAlt, 
    FaCommentAlt, 
    FaEye, 
    FaPlus,
    FaEdit,
    FaCheck,
    FaExclamationCircle
} from 'react-icons/fa';

const classOrder: Record<string, number> = {
    'Playgroup': 1, 'Nursery': 2, 'Prep': 3,
    '1st': 4, '2nd': 5, '3rd': 6, '4th': 7, '5th': 8,
    '6th': 9, '7th': 10, '8th': 11, '9th': 12, '10th': 13,
    '1st Year': 14, '2nd Year': 15, '3rd Year': 16, '4th Year': 17,
    'O Level': 18, 'A Level': 19,
    'F.Sc Pre': 20, 'F.Sc Medical': 21, 'ICS': 22, 'FA.IT': 23, 'FA': 24,
};

const sortClasses = (clsArray: string[]) => {
    return [...clsArray].sort((a, b) => {
        const orderA = classOrder[a] || 999;
        const orderB = classOrder[b] || 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b);
    });
};

const RESULT_TEMPLATES = [
    { name: 'Detailed Result (Default)', content: 'Assalam-o-Alaikum\n\nDear Parent,\n\nYour child *[Student Name]* has obtained *[Marks]* (*[Percentage]*) in the [Exam Name] Examination.\nCongratulations! 🎉\n\nThe Seeks Academy – Fort Abbas' },
    { name: 'Short Result Message', content: 'Dear Parent,\n\n*[Student Name]* scored *[Marks]* in [Exam Name].\n\nThe Seeks Academy' },
    { name: 'Result with Warning', content: 'Dear Parent,\n\n*[Student Name]* scored *[Marks]* in [Exam Name]. Please visit the school to discuss their performance.\n\nThe Seeks Academy' },
];

const ATTENDANCE_TEMPLATES = [
    { name: 'Daily Attendance (Default)', content: 'Assalam-o-Alaikum\n\nDear Parent,\n\nThis is to inform you that your child *[Student Name]* is marked as *[Attendance Status]* today ([Date]).\n\nPlease contact the administration for any queries.\n\nThe Seeks Academy – Fort Abbas' },
    { name: 'Absence Alert', content: 'URGENT ⚠️\n\nDear Parent,\n*[Student Name]* is absent today ([Date]). Please reply to this message to confirm the reason.\n\nThe Seeks Academy' },
];

// Data will be fetched from Redux state

export default function WhatsAppCommunication() {
    const dispatch = useAppDispatch();
    const { data: studentsRaw } = useAppSelector((s: any) => s.students);
    const exams = useAppSelector(selectAllExams);
    const { adminDb: attendanceDb } = useAppSelector((s: any) => s.attendance);
    const { whatsappSettings } = useAppSelector((s: any) => s.appSettings);

    useEffect(() => {
        dispatch(fetchStudents());
        dispatch(fetchExams());
        dispatch(fetchAttendance());
        dispatch(fetchWhatsAppSettings());
    }, [dispatch]);

    const students = useMemo(() => studentsRaw.map((s: any) => ({
        ...s,
        studentId: s.id,
        resolvedUid: s.uid?.trim() || s.authUid?.trim() || s.id,
        grade: s.grade || s.class || '',
        gender: s.gender || '',
        rollno: s.rollno || s.studentId || '',
        whatsappAvailable: !!s.phone
    })), [studentsRaw]);

    const classOptions = useMemo(() => sortClasses([...new Set(students.map((s: any) => s.grade))].filter(Boolean) as string[]), [students]);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState('results');
    const [filterClass, setFilterClass] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [filterExam, setFilterExam] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterDate, setFilterDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
    const [searchQuery, setSearchQuery] = useState('');
    const [generalMessage, setGeneralMessage] = useState('Dear Parent,\n\nSchool will remain closed tomorrow due to heavy rain. Normal classes will resume from the day after tomorrow.\n\nThe Seeks Academy – Fort Abbas');

    const [isEditingResultTemplate, setIsEditingResultTemplate] = useState(false);
    const [resultTemplate, setResultTemplate] = useState(RESULT_TEMPLATES[0].content);

    const [isEditingAttendanceTemplate, setIsEditingAttendanceTemplate] = useState(false);
    const [attendanceTemplate, setAttendanceTemplate] = useState(ATTENDANCE_TEMPLATES[0].content);

    const [showSettingsModal, setShowSettingsModal] = useState(false);
    
    // Local state for settings modal
    const [localInstanceId, setLocalInstanceId] = useState('');
    const [localApiToken, setLocalApiToken] = useState('');
    const [localWebhookToken, setLocalWebhookToken] = useState('');

    useEffect(() => {
        if (showSettingsModal && whatsappSettings) {
            setLocalInstanceId(whatsappSettings.instanceId || '');
            setLocalApiToken(whatsappSettings.apiToken || '');
            setLocalWebhookToken(whatsappSettings.webhookToken || '');
        }
    }, [showSettingsModal, whatsappSettings]);

    const handleSaveSettings = () => {
        dispatch(persistWhatsAppSettings({
            instanceId: localInstanceId,
            apiToken: localApiToken,
            webhookToken: localWebhookToken
        }));
        setShowSettingsModal(false);
    };

    const sectionOptions = useMemo(() => {
        return [...new Set(students.filter((s: any) => !filterClass || s.grade === filterClass).map((s: any) => s.section))].filter(Boolean).sort() as string[];
    }, [students, filterClass]);

    const categoryOptions = useMemo(() => {
        return [...new Set(exams.filter((e: any) => !filterClass || e.studentClass === filterClass).map((e: any) => e.category || 'Monthly'))].filter(Boolean) as string[];
    }, [exams, filterClass]);

    const examOptions = useMemo(() => {
        return [...new Set(exams.filter((e: any) => (!filterClass || e.studentClass === filterClass) && (!filterCategory || (e.category || 'Monthly') === filterCategory)).map((e: any) => e.title))].filter(Boolean) as string[];
    }, [exams, filterClass, filterCategory]);

    const subjectOptions = useMemo(() => {
        const subjects = new Set<string>();
        exams.filter((e: any) => (!filterClass || e.studentClass === filterClass) && (!filterCategory || (e.category || 'Monthly') === filterCategory) && e.title === filterExam).forEach((e: any) => {
            if (e.bookName) {
                e.bookName.split(',').forEach((s: string) => subjects.add(s.trim()));
            }
            if (e.books) {
                e.books.forEach((b: any) => {
                    if (b.name) {
                        b.name.split(',').forEach((s: string) => subjects.add(s.trim()));
                    }
                });
            }
        });
        return ['All Subjects', ...Array.from(subjects).filter(Boolean)] as string[];
    }, [exams, filterClass, filterExam]);

    useEffect(() => {
        if (!filterExam && examOptions.length > 0) setFilterExam(examOptions[0]);
    }, [examOptions, filterExam]);

    useEffect(() => {
        if (!filterSubject && subjectOptions.length > 0) setFilterSubject(subjectOptions[0]);
    }, [subjectOptions, filterSubject]);

    const filteredStudents = useMemo(() => {
        return students.filter((s: any) => {
            if (filterClass && s.grade !== filterClass) return false;
            if (filterSection && s.section !== filterSection) return false;
            if (searchQuery) {
                const search = searchQuery.toLowerCase();
                const nameStr = (s.name || '').toString().toLowerCase();
                const rollStr = (s.rollno || '').toString().toLowerCase();
                if (!nameStr.includes(search) && !rollStr.includes(search)) return false;
            }
            return true;
        });
    }, [students, filterClass, filterSection, searchQuery]);

    const getStudentMarks = (student: any) => {
        if (!filterExam) return { marks: '-', percentage: '-' };
        
        const sId = (student.id || student.studentId || '').toString().trim().toLowerCase();
        const sRoll = (student.rollno || '').toString().trim().toLowerCase();
        
        const studentExams = exams.filter((e: any) => {
            const eRoll = (e.rollNo || '').toString().trim().toLowerCase();
            const matchUser = eRoll === sId || eRoll === sRoll || (e.studentEmail && e.studentEmail === student.email);
            return matchUser && (!filterCategory || (e.category || 'Monthly') === filterCategory) && e.title === filterExam;
        });
        
        if (studentExams.length === 0) return { marks: '-', percentage: '-' };
        
        let totalObtained = 0;
        let totalMax = 0;
        let hasMarks = false;

        studentExams.forEach((e: any) => {
            if (filterSubject && filterSubject !== 'All Subjects') {
                if (e.bookName && e.bookName === filterSubject) {
                    totalObtained += Number(e.obtainedMarks || 0);
                    totalMax += Number(e.totalMarks || 0);
                    hasMarks = true;
                } else if (e.books) {
                    const b = e.books.find((bk: any) => bk.name === filterSubject);
                    if (b) {
                        totalObtained += Number(b.obtainedMarks || 0);
                        totalMax += Number(b.totalMarks || 0);
                        hasMarks = true;
                    }
                }
            } else {
                totalObtained += Number(e.obtainedMarks || 0);
                totalMax += Number(e.totalMarks || 0);
                hasMarks = true;
            }
        });

        if (!hasMarks) return { marks: '-', percentage: '-' };
        const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) + '%' : '-';
        return { marks: `${totalObtained} / ${totalMax}`, percentage };
    };

    const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) setSelectedIds(filteredStudents.map((s: any) => s.id));
        else setSelectedIds([]);
    }
    
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }

    const getMessageForStudent = (student: any, template: string, tab: 'results' | 'attendance' | 'general') => {
        if (!student) return template;
        
        let message = template;
        message = message.replace(/\[Student Name\]/gi, student.name || 'Student');
        message = message.replace(/\[Roll No\]/gi, student.rollno || '');
        message = message.replace(/\[Class\]/gi, student.grade || '');
        message = message.replace(/\[Section\]/gi, student.section || '');

        if (tab === 'results') {
            const marksData = getStudentMarks(student);
            message = message.replace(/\[Marks\]/gi, marksData.marks);
            message = message.replace(/\[Percentage\]/gi, marksData.percentage);
            message = message.replace(/\[Exam Name\]/gi, filterExam || 'Exam');
        } else if (tab === 'attendance') {
            const attStatus = attendanceDb[student.resolvedUid]?.[filterDate]?.toLowerCase() || 'pending';
            message = message.replace(/\[Attendance Status\]/gi, attStatus.charAt(0).toUpperCase() + attStatus.slice(1));
            message = message.replace(/\[Date\]/gi, filterDate);
        }

        return message;
    };

    const getPreviewMessage = (template: string, tab: 'results' | 'attendance') => {
        const previewStudentId = selectedIds.length > 0 ? selectedIds[0] : (filteredStudents.length > 0 ? filteredStudents[0].id : null);
        const student = students.find((s: any) => s.id === previewStudentId);
        return getMessageForStudent(student, template, tab);
    };

    const handleSend = () => {
        if (selectedIds.length === 0) {
            alert('Please select at least one student to send the message.');
            return;
        }

        const template = activeTab === 'results' ? resultTemplate : (activeTab === 'attendance' ? attendanceTemplate : generalMessage);

        const confirmSend = window.confirm(`Are you sure you want to send this message to ${selectedIds.length} student(s)?\n\nNote: Please allow pop-ups for this site if sending to multiple students at once.`);
        if (!confirmSend) return;

        let sentCount = 0;
        selectedIds.forEach((id, index) => {
            const student = students.find((s: any) => s.id === id);
            if (student && student.phone) {
                const message = getMessageForStudent(student, template, activeTab as any);
                const encodedMessage = encodeURIComponent(message);
                
                // Clean phone number: remove non-digits, ensure it starts with country code (assuming +92 for Pakistan if starting with 0)
                let phone = student.phone.replace(/\D/g, '');
                if (phone.startsWith('0')) {
                    phone = '92' + phone.substring(1);
                }
                
                const url = `https://wa.me/${phone}?text=${encodedMessage}`;
                
                // Open WhatsApp Web links. 
                // Browsers may block multiple popups, so we stagger them slightly and warn the user above.
                setTimeout(() => {
                    window.open(url, '_blank');
                }, index * 600);
                
                sentCount++;
            }
        });
        
        if (sentCount === 0) {
            alert('None of the selected students have a valid phone number.');
        }
    };

    const renderMessageWithFormatting = (text: string) => {
        return text.split(/(\*[^*]+\*)/g).map((part, i) => {
            if (part.startsWith('*') && part.endsWith('*')) {
                return <strong key={i}>{part.slice(1, -1)}</strong>;
            }
            return part;
        });
    };

    return (
        <div className="page" style={{ padding: '0px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <style>
                {`
                    .whatsapp-grid {
                        display: grid;
                        grid-template-columns: 1fr 300px;
                        gap: 12px;
                        align-items: start;
                    }
                    @media (max-width: 1200px) {
                        .whatsapp-grid {
                            grid-template-columns: 1fr;
                        }
                    }
                    .kpi-grid {
                        display: grid;
                        grid-template-columns: repeat(6, 1fr);
                        gap: 10px;
                    }
                    @media (max-width: 1024px) {
                        .kpi-grid {
                            grid-template-columns: repeat(3, 1fr);
                        }
                        .filter-grid-wa {
                            grid-template-columns: repeat(2, 1fr) !important;
                        }
                        .wa-search-wrap {
                            grid-column: 1 / -1;
                            justify-self: end;
                        }
                    }
                    @media (max-width: 768px) {
                        .kpi-grid {
                            grid-template-columns: repeat(2, 1fr);
                        }
                    }
                    .wa-card {
                        background: var(--card);
                        border-radius: 8px;
                        border: 1px solid var(--border);
                        box-shadow: 0 1px 2px rgba(0,0,0,0.03);
                    }
                    .wa-table th {
                        position: sticky;
                        top: 0;
                        z-index: 10;
                        background: var(--card);
                        box-shadow: 0 1px 0 var(--border);
                        padding: 6px 10px;
                        font-size: 10px;
                        color: var(--text2);
                        font-weight: 600;
                    }
                    .wa-table td {
                        padding: 6px 10px;
                        font-size: 12px;
                        border-top: 1px solid var(--border);
                    }
                `}
            </style>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                            <FaFileAlt size={10} /> Home &gt; WhatsApp &gt; <span style={{ color: 'var(--text)', fontWeight: 600 }}>Results</span>
                        </div>
                        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 2 }}>WhatsApp Communication</h1>
                        <p style={{ fontSize: 12, color: 'var(--text2)' }}>Send results, attendance and important messages to students and parents via WhatsApp</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-ghost" style={{ borderRadius: 8, fontSize: 12, padding: '6px 12px' }}>
                            <FaQuestionCircle /> How it works?
                        </button>
                        <button className="btn" style={{ backgroundColor: '#25D366', color: '#fff', borderRadius: 8, fontSize: 12, padding: '6px 12px', border: 'none' }} onClick={() => setShowSettingsModal(true)}>
                            <FaCog /> WhatsApp Settings
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="kpi-grid">
                    <KpiCard icon={<FaUserFriends />} value="176" title="Total Students" subtitle="All Classes" color="#3b82f6" />
                    <KpiCard icon={<FaCheckCircle />} value={selectedIds.length.toString()} title="Selected" subtitle="Students" color="#10b981" />
                    <KpiCard icon={<FaFileAlt />} value={selectedIds.length.toString()} title="Messages Ready" subtitle="To Send" color="#10b981" />
                    <KpiCard icon={<FaPaperPlane />} value="18" title="Sent Today" subtitle="↑ +12%" color="#3b82f6" />
                    <KpiCard icon={<FaRegClock />} value="6" title="Pending" subtitle="In Queue" color="#f59e0b" />
                    <KpiCard icon={<FaTimesCircle />} value="0" title="Failed" subtitle="Try Again" color="#ef4444" />
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                    <TabButton active={activeTab === 'results'} onClick={() => setActiveTab('results')} icon={<FaFileAlt />}>Results</TabButton>
                    <TabButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={<FaRegCalendarAlt />}>Attendance</TabButton>
                    <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} icon={<FaCommentAlt />}>General Message</TabButton>
                </div>

                {/* Main Content Area */}
                {activeTab === 'results' && (
                    <div className="whatsapp-grid">
                        
                        {/* Left Column: Filters & Table */}
                        <div className="wa-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            
                            {/* Filters & Search in single line */}
                            <div className="filter-grid-wa" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) 200px', gap: '8px', alignItems: 'end' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 9, marginBottom: 2 }}>Class</label>
                                    <select className="form-input" style={{ padding: '4px 8px', fontSize: 11, height: '28px', minHeight: '28px' }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                                        <option value="">All Classes</option>
                                        {classOptions.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 9, marginBottom: 2 }}>Section</label>
                                    <select className="form-input" style={{ padding: '4px 8px', fontSize: 11, height: '28px', minHeight: '28px' }} value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                                        <option value="">All Sections</option>
                                        {sectionOptions.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 9, marginBottom: 2 }}>Exam Type</label>
                                    <select className="form-input" style={{ padding: '4px 8px', fontSize: 11, height: '28px', minHeight: '28px' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                                        <option value="">All Types</option>
                                        {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 9, marginBottom: 2 }}>Exam</label>
                                    <select className="form-input" style={{ padding: '4px 8px', fontSize: 11, height: '28px', minHeight: '28px' }} value={filterExam} onChange={e => setFilterExam(e.target.value)}>
                                        <option value="">Select Exam</option>
                                        {examOptions.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 9, marginBottom: 2 }}>Subject</label>
                                    <select className="form-input" style={{ padding: '4px 8px', fontSize: 11, height: '28px', minHeight: '28px' }} value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                                        {subjectOptions.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                    </select>
                                </div>
                                <div className="wa-search-wrap">
                                    <div className="search-box" style={{ width: '100%', height: '28px', minHeight: '28px', padding: '0 8px', display: 'flex', alignItems: 'center' }}>
                                        <FaSearch className="search-icon" style={{ fontSize: 10, margin: 0 }} />
                                        <input type="text" placeholder="Search student..." style={{ fontSize: 11, padding: 0, margin: '0 0 0 6px', height: '100%', border: 'none', background: 'transparent' }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflowY: 'auto', maxHeight: '400px' }}>
                                <table className="wa-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 36, textAlign: 'center' }}><input type="checkbox" onChange={toggleSelectAll} checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length} style={{ cursor: 'pointer' }} /></th>
                                            <th style={{ width: 30 }}>#</th>
                                            <th>Student Name</th>
                                            <th>Roll No</th>
                                            <th>Marks</th>
                                            <th>Percentage</th>
                                            <th>WhatsApp</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text2)' }}>
                                                    No students found matching the selected filters.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredStudents.map((student: any, idx: number) => {
                                                const { marks, percentage } = getStudentMarks(student);
                                                return (
                                                    <tr key={student.id}>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleSelect(student.id)} style={{ cursor: 'pointer' }} />
                                                        </td>
                                                        <td style={{ color: 'var(--text2)' }}>{idx + 1}</td>
                                                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{student.name}</td>
                                                        <td style={{ color: 'var(--text2)' }}>{student.rollno}</td>
                                                        <td style={{ fontWeight: 500 }}>{marks}</td>
                                                        <td style={{ fontWeight: 500 }}>{percentage}</td>
                                                        <td>
                                                            {student.whatsappAvailable ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <FaWhatsapp color="#25D366" size={14} />
                                                                    <span style={{ fontSize: 11, fontWeight: 500 }}>{student.phone}</span>
                                                                </div>
                                                            ) : (
                                                                <span style={{ color: 'var(--text2)', fontSize: 10 }}>No Number</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span style={{ 
                                                                display: 'inline-block',
                                                                padding: '2px 6px',
                                                                borderRadius: '8px',
                                                                fontSize: '9px',
                                                                fontWeight: 700,
                                                                textTransform: 'uppercase',
                                                                background: selectedIds.includes(student.id) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                                                                color: selectedIds.includes(student.id) ? '#10b981' : 'var(--text2)',
                                                            }}>
                                                                {selectedIds.includes(student.id) ? 'Ready' : 'Not Selected'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '4px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text2)', textAlign: 'center' }}>
                                    Showing {filteredStudents.length > 0 ? 1 : 0} to {filteredStudents.length} of {filteredStudents.length} students
                                </div>
                            </div>

                        </div>

                        {/* Right Column: Preview & Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            
                            {/* Message Preview */}
                            <div className="wa-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg2)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12, color: 'var(--text)' }}>
                                        <FaEye color="var(--primary-light)" /> Message Preview
                                    </div>
                                    <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: 10, minHeight: 0 }} onClick={() => setIsEditingResultTemplate(!isEditingResultTemplate)}>
                                        {isEditingResultTemplate ? <FaEye size={8} /> : <FaEdit size={8} />} {isEditingResultTemplate ? 'Preview' : 'Edit Template'}
                                    </button>
                                </div>

                                {isEditingResultTemplate ? (
                                    <textarea 
                                        className="form-input" 
                                        style={{ 
                                            padding: '8px', 
                                            fontSize: 12, 
                                            minHeight: '150px', 
                                            resize: 'vertical',
                                            fontFamily: 'inherit',
                                            lineHeight: 1.5
                                        }}
                                        value={resultTemplate}
                                        onChange={e => setResultTemplate(e.target.value)}
                                        placeholder="Type your message template here... Use [Student Name], [Marks], [Percentage], [Exam Name]"
                                    />
                                ) : (
                                    <div style={{ 
                                        background: '#d9fdd3', 
                                        borderRadius: '6px 6px 6px 0', 
                                        padding: '10px 12px', 
                                        color: '#111b21', 
                                        fontSize: '11.5px', 
                                        lineHeight: '1.4',
                                        position: 'relative',
                                        alignSelf: 'flex-start',
                                        boxShadow: '0 1px 0.5px rgba(11,20,26,.13)',
                                        width: '100%',
                                        fontFamily: 'system-ui, -apple-system, sans-serif'
                                    }}>
                                        <div style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
                                            {renderMessageWithFormatting(getPreviewMessage(resultTemplate, 'results'))}
                                        </div>
                                        <div style={{ textAlign: 'right', fontSize: '9px', color: '#667781', marginTop: 4, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                                            9:26 AM <FaCheck color="#53bdeb" size={10} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Template & Send */}
                            <div className="wa-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)' }}>
                                    Message Template
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <select 
                                        className="form-input" 
                                        style={{ flex: 1, padding: '5px 8px', fontSize: 11 }}
                                        onChange={(e) => {
                                            const t = RESULT_TEMPLATES[parseInt(e.target.value)];
                                            if (t) setResultTemplate(t.content);
                                        }}
                                    >
                                        {RESULT_TEMPLATES.map((t, idx) => (
                                            <option key={idx} value={idx}>{t.name}</option>
                                        ))}
                                    </select>
                                    <button className="btn btn-ghost" style={{ padding: '0 8px', fontSize: 11 }} onClick={() => setIsEditingResultTemplate(!isEditingResultTemplate)}>
                                        <FaEdit /> {isEditingResultTemplate ? 'Preview' : 'Edit'}
                                    </button>
                                </div>

                                <button 
                                    className="btn" 
                                    style={{ 
                                        backgroundColor: '#25D366', 
                                        color: '#fff', 
                                        width: '100%', 
                                        padding: '10px',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        marginTop: '4px',
                                        boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontWeight: 700
                                    }}
                                >
                                    <FaWhatsapp size={14} /> Send ({selectedIds.length}) <FaPaperPlane size={10} style={{ marginLeft: 6 }} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="whatsapp-grid">
                        
                        {/* Left Column: Filters & Table */}
                        <div className="wa-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            
                            {/* Filters & Search in single line */}
                            <div className="filter-grid-wa" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) 200px', gap: '8px', alignItems: 'end' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 9, marginBottom: 2 }}>Class</label>
                                    <select className="form-input" style={{ padding: '4px 8px', fontSize: 11, height: '28px', minHeight: '28px' }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                                        <option value="">All Classes</option>
                                        {classOptions.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 9, marginBottom: 2 }}>Section</label>
                                    <select className="form-input" style={{ padding: '4px 8px', fontSize: 11, height: '28px', minHeight: '28px' }} value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                                        <option value="">All Sections</option>
                                        {sectionOptions.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 9, marginBottom: 2 }}>Date</label>
                                    <input type="date" className="form-input" style={{ padding: '4px 8px', fontSize: 11, height: '28px', minHeight: '28px' }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
                                </div>
                                <div></div>
                                <div className="wa-search-wrap">
                                    <div className="search-box" style={{ width: '100%', height: '28px', minHeight: '28px', padding: '0 8px', display: 'flex', alignItems: 'center' }}>
                                        <FaSearch className="search-icon" style={{ fontSize: 10, margin: 0 }} />
                                        <input type="text" placeholder="Search student..." style={{ fontSize: 11, padding: 0, margin: '0 0 0 6px', height: '100%', border: 'none', background: 'transparent' }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                                <table className="wa-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 36, textAlign: 'center' }}><input type="checkbox" onChange={toggleSelectAll} checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length} style={{ cursor: 'pointer' }} /></th>
                                            <th style={{ width: 30 }}>#</th>
                                            <th>Student Name</th>
                                            <th>Roll No</th>
                                            <th>Attendance</th>
                                            <th>WhatsApp</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text2)' }}>
                                                    No students found matching the selected filters.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredStudents.map((student: any, idx: number) => {
                                                const attStatus = attendanceDb[student.resolvedUid]?.[filterDate]?.toLowerCase() || 'pending';
                                                
                                                let statusColor = '#f59e0b';
                                                if (attStatus === 'present') statusColor = '#10b981';
                                                if (attStatus === 'absent') statusColor = '#ef4444';
                                                
                                                return (
                                                    <tr key={student.id}>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleSelect(student.id)} style={{ cursor: 'pointer' }} />
                                                        </td>
                                                        <td style={{ color: 'var(--text2)' }}>{idx + 1}</td>
                                                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{student.name}</td>
                                                        <td style={{ color: 'var(--text2)' }}>{student.rollno}</td>
                                                        <td style={{ fontWeight: 600, color: statusColor, textTransform: 'capitalize' }}>{attStatus}</td>
                                                        <td>
                                                            {student.whatsappAvailable ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <FaWhatsapp color="#25D366" size={14} />
                                                                    <span style={{ fontSize: 11, fontWeight: 500 }}>{student.phone}</span>
                                                                </div>
                                                            ) : (
                                                                <span style={{ color: 'var(--text2)', fontSize: 10 }}>No Number</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span style={{ 
                                                                display: 'inline-block',
                                                                padding: '2px 6px',
                                                                borderRadius: '8px',
                                                                fontSize: '9px',
                                                                fontWeight: 700,
                                                                textTransform: 'uppercase',
                                                                background: selectedIds.includes(student.id) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                                                                color: selectedIds.includes(student.id) ? '#10b981' : 'var(--text2)',
                                                            }}>
                                                                {selectedIds.includes(student.id) ? 'Ready' : 'Not Selected'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '4px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text2)', textAlign: 'center' }}>
                                    Showing {filteredStudents.length > 0 ? 1 : 0} to {filteredStudents.length} of {filteredStudents.length} students
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Preview & Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            
                            {/* Message Preview */}
                            <div className="wa-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg2)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12, color: 'var(--text)' }}>
                                        <FaEye color="var(--primary-light)" /> Message Preview
                                    </div>
                                    <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: 10, minHeight: 0 }} onClick={() => setIsEditingAttendanceTemplate(!isEditingAttendanceTemplate)}>
                                        {isEditingAttendanceTemplate ? <FaEye size={8} /> : <FaEdit size={8} />} {isEditingAttendanceTemplate ? 'Preview' : 'Edit Template'}
                                    </button>
                                </div>

                                {isEditingAttendanceTemplate ? (
                                    <textarea 
                                        className="form-input" 
                                        style={{ 
                                            padding: '8px', 
                                            fontSize: 12, 
                                            minHeight: '150px', 
                                            resize: 'vertical',
                                            fontFamily: 'inherit',
                                            lineHeight: 1.5
                                        }}
                                        value={attendanceTemplate}
                                        onChange={e => setAttendanceTemplate(e.target.value)}
                                        placeholder="Type your message template here... Use [Student Name], [Attendance Status], [Date]"
                                    />
                                ) : (
                                    <div style={{ 
                                        background: '#d9fdd3', 
                                        borderRadius: '6px 6px 6px 0', 
                                        padding: '10px 12px', 
                                        color: '#111b21', 
                                        fontSize: '11.5px', 
                                        lineHeight: '1.4',
                                        position: 'relative',
                                        alignSelf: 'flex-start',
                                        boxShadow: '0 1px 0.5px rgba(11,20,26,.13)',
                                        width: '100%',
                                        fontFamily: 'system-ui, -apple-system, sans-serif'
                                    }}>
                                        <div style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
                                            {renderMessageWithFormatting(getPreviewMessage(attendanceTemplate, 'attendance'))}
                                        </div>
                                        <div style={{ textAlign: 'right', fontSize: '9px', color: '#667781', marginTop: 4, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                                            9:26 AM <FaCheck color="#53bdeb" size={10} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Template & Send */}
                            <div className="wa-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)' }}>
                                    Message Template
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <select 
                                        className="form-input" 
                                        style={{ flex: 1, padding: '5px 8px', fontSize: 11 }}
                                        onChange={(e) => {
                                            const t = ATTENDANCE_TEMPLATES[parseInt(e.target.value)];
                                            if (t) setAttendanceTemplate(t.content);
                                        }}
                                    >
                                        {ATTENDANCE_TEMPLATES.map((t, idx) => (
                                            <option key={idx} value={idx}>{t.name}</option>
                                        ))}
                                    </select>
                                    <button className="btn btn-ghost" style={{ padding: '0 8px', fontSize: 11 }} onClick={() => setIsEditingAttendanceTemplate(!isEditingAttendanceTemplate)}>
                                        <FaEdit /> {isEditingAttendanceTemplate ? 'Preview' : 'Edit'}
                                    </button>
                                </div>

                                <button 
                                    className="btn" 
                                    style={{ 
                                        backgroundColor: '#25D366', 
                                        color: '#fff', 
                                        width: '100%', 
                                        padding: '10px',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        marginTop: '4px',
                                        boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontWeight: 700
                                    }}
                                >
                                    <FaWhatsapp size={14} /> Send ({selectedIds.length}) <FaPaperPlane size={10} style={{ marginLeft: 6 }} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                {activeTab === 'general' && (
                    <div className="whatsapp-grid">
                        
                        {/* Left Column: Filters & Table */}
                        <div className="wa-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            
                            {/* Filters & Search in single line */}
                            <div className="filter-grid-wa" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) 200px', gap: '8px', alignItems: 'end' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 9, marginBottom: 2 }}>Class</label>
                                    <select className="form-input" style={{ padding: '4px 8px', fontSize: 11, height: '28px', minHeight: '28px' }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                                        <option value="">All Classes</option>
                                        {classOptions.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 9, marginBottom: 2 }}>Section</label>
                                    <select className="form-input" style={{ padding: '4px 8px', fontSize: 11, height: '28px', minHeight: '28px' }} value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                                        <option value="">All Sections</option>
                                        {sectionOptions.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                                    </select>
                                </div>
                                <div></div>
                                <div></div>
                                <div className="wa-search-wrap">
                                    <div className="search-box" style={{ width: '100%', height: '28px', minHeight: '28px', padding: '0 8px', display: 'flex', alignItems: 'center' }}>
                                        <FaSearch className="search-icon" style={{ fontSize: 10, margin: 0 }} />
                                        <input type="text" placeholder="Search student..." style={{ fontSize: 11, padding: 0, margin: '0 0 0 6px', height: '100%', border: 'none', background: 'transparent' }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                                <table className="wa-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 36, textAlign: 'center' }}><input type="checkbox" onChange={toggleSelectAll} checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length} style={{ cursor: 'pointer' }} /></th>
                                            <th style={{ width: 30 }}>#</th>
                                            <th>Student Name</th>
                                            <th>Roll No</th>
                                            <th>WhatsApp</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text2)' }}>
                                                    No students found matching the selected filters.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredStudents.map((student: any, idx: number) => {
                                                return (
                                                    <tr key={student.id}>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleSelect(student.id)} style={{ cursor: 'pointer' }} />
                                                        </td>
                                                        <td style={{ color: 'var(--text2)' }}>{idx + 1}</td>
                                                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{student.name}</td>
                                                        <td style={{ color: 'var(--text2)' }}>{student.rollno}</td>
                                                        <td>
                                                            {student.whatsappAvailable ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <FaWhatsapp color="#25D366" size={14} />
                                                                    <span style={{ fontSize: 11, fontWeight: 500 }}>{student.phone}</span>
                                                                </div>
                                                            ) : (
                                                                <span style={{ color: 'var(--text2)', fontSize: 10 }}>No Number</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span style={{ 
                                                                display: 'inline-block',
                                                                padding: '2px 6px',
                                                                borderRadius: '8px',
                                                                fontSize: '9px',
                                                                fontWeight: 700,
                                                                textTransform: 'uppercase',
                                                                background: selectedIds.includes(student.id) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                                                                color: selectedIds.includes(student.id) ? '#10b981' : 'var(--text2)',
                                                            }}>
                                                                {selectedIds.includes(student.id) ? 'Ready' : 'Not Selected'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '4px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text2)', textAlign: 'center' }}>
                                    Showing {filteredStudents.length > 0 ? 1 : 0} to {filteredStudents.length} of {filteredStudents.length} students
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Preview & Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            
                            {/* Custom Message Input */}
                            <div className="wa-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', display: 'flex', justifyContent: 'space-between' }}>
                                    Compose Message
                                    <button className="btn btn-ghost" style={{ padding: '0', fontSize: 10, minHeight: 0, color: 'var(--primary-light)' }}>
                                        Save as Template
                                    </button>
                                </div>
                                <textarea 
                                    className="form-input" 
                                    style={{ 
                                        padding: '8px', 
                                        fontSize: 12, 
                                        minHeight: '120px', 
                                        resize: 'vertical',
                                        fontFamily: 'inherit',
                                        lineHeight: 1.5
                                    }}
                                    value={generalMessage}
                                    onChange={e => setGeneralMessage(e.target.value)}
                                    placeholder="Type your message here..."
                                />
                            </div>

                            {/* Message Preview */}
                            <div className="wa-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg2)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12, color: 'var(--text)' }}>
                                    <FaEye color="var(--primary-light)" /> Message Preview
                                </div>

                                <div style={{ 
                                    background: '#d9fdd3', 
                                    borderRadius: '6px 6px 6px 0', 
                                    padding: '10px 12px', 
                                    color: '#111b21', 
                                    fontSize: '11.5px', 
                                    lineHeight: '1.4',
                                    position: 'relative',
                                    alignSelf: 'flex-start',
                                    boxShadow: '0 1px 0.5px rgba(11,20,26,.13)',
                                    width: '100%',
                                    fontFamily: 'system-ui, -apple-system, sans-serif'
                                }}>
                                    <div style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
                                        {generalMessage}
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '9px', color: '#667781', marginTop: 4, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
                                        9:26 AM <FaCheck color="#53bdeb" size={10} />
                                    </div>
                                </div>
                            </div>

                            {/* Send Action */}
                            <div className="wa-card" style={{ padding: '12px' }}>
                                <button 
                                    className="btn" 
                                    style={{ 
                                        backgroundColor: '#25D366', 
                                        color: '#fff', 
                                        width: '100%', 
                                        padding: '10px',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontWeight: 700
                                    }}
                                >
                                    <FaWhatsapp size={14} /> Send ({selectedIds.length}) <FaPaperPlane size={10} style={{ marginLeft: 6 }} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State for other tabs */}
                {activeTab !== 'results' && activeTab !== 'attendance' && activeTab !== 'general' && (
                    <div className="wa-card empty" style={{ marginTop: 16, padding: '40px', textAlign: 'center' }}>
                        <FaExclamationCircle size={40} color="var(--text2)" style={{ marginBottom: 12, opacity: 0.5 }} />
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Coming Soon</h3>
                        <p style={{ fontSize: 12, color: 'var(--text2)' }}>This module is under development.</p>
                    </div>
                )}
            </div>

            {/* Settings Modal */}
            {showSettingsModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="wa-card" style={{
                        width: '400px', backgroundColor: 'var(--bg)', padding: '24px', 
                        borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
                                <FaCog color="var(--text2)" /> WhatsApp API Settings
                            </h2>
                            <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowSettingsModal(false)}>
                                <FaTimesCircle size={16} color="var(--text2)" />
                            </button>
                        </div>

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Instance ID / Phone Number ID</label>
                            <input type="text" className="form-input" placeholder="e.g. 1059345719823" style={{ fontSize: '12px' }} value={localInstanceId} onChange={e => setLocalInstanceId(e.target.value)} />
                        </div>

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>API Access Token</label>
                            <input type="password" className="form-input" placeholder="Enter your persistent token" style={{ fontSize: '12px' }} value={localApiToken} onChange={e => setLocalApiToken(e.target.value)} />
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Webhook Verification Token (Optional)</label>
                            <input type="text" className="form-input" placeholder="my_secret_token" style={{ fontSize: '12px' }} value={localWebhookToken} onChange={e => setLocalWebhookToken(e.target.value)} />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                            <button className="btn btn-ghost" style={{ flex: 1, padding: '10px' }} onClick={() => setShowSettingsModal(false)}>
                                Cancel
                            </button>
                            <button 
                                className="btn btn-ghost" 
                                style={{ flex: 1, padding: '10px', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }} 
                                onClick={() => {
                                    setLocalInstanceId('');
                                    setLocalApiToken('');
                                    setLocalWebhookToken('');
                                }}
                            >
                                Clear
                            </button>
                            <button className="btn" style={{ flex: 1.5, padding: '10px', backgroundColor: '#25D366', color: '#fff', border: 'none', fontWeight: 600 }} onClick={handleSaveSettings}>
                                Save Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Subcomponents

function KpiCard({ icon, value, title, subtitle, color }: { icon: React.ReactNode, value: string, title: string, subtitle: string, color: string }) {
    return (
        <div className="wa-card" style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
                width: '32px', height: '32px', 
                borderRadius: '6px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                backgroundColor: color, 
                color: '#fff',
                fontSize: '16px',
                flexShrink: 0
            }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '9px', color: 'var(--text2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '1px' }}>{title}</div>
                <div style={{ fontSize: '16px', fontWeight: 800, lineHeight: 1.1, color: 'var(--text)' }}>{value}</div>
                <div style={{ fontSize: '9px', color: 'var(--text2)', marginTop: '1px', fontWeight: 500 }}>{subtitle}</div>
            </div>
        </div>
    );
}

function TabButton({ children, active, onClick, icon }: { children: React.ReactNode, active: boolean, onClick: () => void, icon: React.ReactNode }) {
    return (
        <button 
            onClick={onClick}
            style={{ 
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', 
                borderRadius: '6px',
                border: 'none',
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? '#fff' : 'var(--text2)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: active ? '0 4px 10px rgba(29, 78, 216, 0.2)' : 'none'
            }}
        >
            {icon} {children}
        </button>
    );
}
