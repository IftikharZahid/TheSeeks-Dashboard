import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchStudents } from '../../store/slices/studentsSlice';
import { writeStudentAttendance, writeBulkStudentAttendance, setAdminDb, fetchAttendance } from '../../store/slices/attendanceSlice';
import { RootState } from '../../store/store';

// ── Types ──────────────────────────────────────────────────────────────────────
type StatusType = 'present' | 'absent' | 'pending';

const STATUS_META: Record<StatusType, { label: string; color: string; bg: string; short: string }> = {
    present: { label: 'Present', color: '#16a34a', bg: 'rgba(22,163,74,0.12)',   short: 'P' },
    absent:  { label: 'Absent',  color: '#dc2626', bg: 'rgba(220,38,38,0.12)',   short: 'A' },
    pending: { label: 'Pending', color: '#64748b', bg: 'rgba(100,116,139,0.10)', short: '–' },
};

const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
];
const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const PAGE_SIZE  = 20;

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDaysInMonth(year: number, month: number): Date[] {
    const days: Date[] = [];
    const d = new Date(year, month, 1);
    while (d.getMonth() === month) { days.push(new Date(d)); d.setDate(d.getDate()+1); }
    return days;
}

// ── Reusable style factories ───────────────────────────────────────────────────
const mkChip = (active: boolean): React.CSSProperties => ({
    padding: '3px 11px', fontSize: 11,
    fontWeight: active ? 600 : 400,
    borderRadius: 20,
    border: `1px solid ${active ? 'var(--primary,#6366f1)' : 'var(--border,rgba(255,255,255,0.1))'}`,
    background: active ? 'var(--primary,#6366f1)' : 'transparent',
    color: active ? '#fff' : 'var(--text2)',
    cursor: 'pointer', whiteSpace: 'nowrap' as const,
    transition: 'all 0.15s', flexShrink: 0,
});

const mkActionBtn = (isActive: boolean, color: string, bg: string): React.CSSProperties => ({
    width: 26, height: 26, borderRadius: 5,
    border: `1px solid ${isActive ? color : 'var(--border,rgba(255,255,255,0.1))'}`,
    background: isActive ? bg : 'transparent',
    color: isActive ? color : 'var(--text2)',
    fontWeight: 700, fontSize: 10,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
});

const selectStyle: React.CSSProperties = {
    height: 30, padding: '0 26px 0 12px', fontSize: 12, fontWeight: 500,
    background: 'var(--bg3,rgba(255,255,255,0.05))',
    border: '1px solid var(--border,rgba(255,255,255,0.1))',
    borderRadius: 7, color: 'var(--text)', outline: 'none',
    appearance: 'none',
    backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="%23888888" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>')`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 4px center',
    cursor: 'pointer',
    minWidth: 110,
};

// Defined outside component so object identity is stable
const TH = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    padding: '8px 14px',
    textAlign: 'left',
    fontSize: 10, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.5px',
    color: 'var(--text2)',
    background: 'var(--bg3,rgba(255,255,255,0.03))',
    borderBottom: '1px solid var(--border,rgba(255,255,255,0.07))',
    whiteSpace: 'nowrap',
    ...extra,
});

const TD: React.CSSProperties = {
    padding: '7px 14px',
    borderBottom: '1px solid var(--border,rgba(255,255,255,0.04))',
    color: 'var(--text)', verticalAlign: 'middle',
};

const TDm: React.CSSProperties = {
    ...TD, color: 'var(--text2)', fontSize: 11,
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AttendancePage() {
    const dispatch = useAppDispatch();
    const { data: studentsRaw, status: studentsStatus } = useAppSelector((s: RootState) => s.students);
    const adminDb: Record<string, Record<string, string>> =
        useAppSelector((s: RootState) => s.attendance?.adminDb) ?? {};
    const markedByDb: Record<string, Record<string, string>> =
        useAppSelector((s: RootState) => s.attendance?.markedByDb) ?? {};
    const adminLoading = useAppSelector((s: RootState) => s.attendance?.adminLoading);
    const { data: teachersRaw } = useAppSelector((s: RootState) => s.teachers);

    useEffect(() => {
        if (studentsStatus === 'idle') dispatch(fetchStudents());
    }, [dispatch, studentsStatus]);

    // Resolve Auth UIDs for correct Firebase tracking
    const [students, setStudents] = useState<any[]>([]);

    useEffect(() => {
        if (!studentsRaw || studentsRaw.length === 0) return;
        const resolved = studentsRaw.map((s: any) => {
            const resolvedUid = s.uid?.trim() || s.authUid?.trim() || s.id;
            return { ...s, id: resolvedUid, profileDocId: s.id };
        });
        setStudents(resolved);
    }, [studentsRaw]);

    // ── Date / calendar ────────────────────────────────────────────────────────
    const now        = useMemo(() => new Date(), []);
    const todayStr   = useMemo(() => fmt(now), [now]);
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);
    const getWeekDays = (baseDate: Date) => {
        const d = new Date(baseDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday based
        const monday = new Date(d.setDate(diff));
        const week = [];
        for (let i = 0; i < 7; i++) {
            const next = new Date(monday);
            next.setDate(monday.getDate() + i);
            week.push(next);
        }
        return week;
    };

    const [weekDays, setWeekDays] = useState(getWeekDays(now));

    // ── Filters ────────────────────────────────────────────────────────────────
    const [search,      setSearch]      = useState('');
    const [filterClass, setFilterClass] = useState('All');
    const [filterSection, setFilterSection] = useState('All');
    const [filterGender, setFilterGender] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');

    const STATUS_OPTIONS = ['All', 'Present', 'Absent', 'Pending'];
    const GENDER_OPTIONS = ['All', 'Boys', 'Girls'];

    // ── Selection State ────────────────────────────────────────────────────────
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, string>>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Clear selection when navigating dates
    useEffect(() => {
        setSelectedStudents([]);
    }, [selectedDate]);

    // ── Week navigation ───────────────────────────────────────────────────────
    const prevWeek = () => {
        const prev = new Date(weekDays[0]);
        prev.setDate(prev.getDate() - 7);
        setWeekDays(getWeekDays(prev));
    };

    const nextWeek = () => {
        const next = new Date(weekDays[0]);
        next.setDate(next.getDate() + 7);
        setWeekDays(getWeekDays(next));
    };

    // Fetch attendance once on mount
    useEffect(() => {
        dispatch(fetchAttendance());
    }, [dispatch]);

    // ── Derived lists ──────────────────────────────────────────────────────────
    const classOptions = useMemo(() => {
        const set = new Set<string>();
        (students || []).forEach((s: any) => {
            const cls = String(s.class || s.grade || s.studentClass || '').trim();
            if (cls && cls !== 'N/A') set.add(cls);
        });
        // Natural numeric sort: "9th" before "10th" before "11th"
        const sorted = Array.from(set).sort((a, b) => {
            const na = parseInt(a, 10) || 0;
            const nb = parseInt(b, 10) || 0;
            return na !== nb ? na - nb : a.localeCompare(b);
        });
        return ['All', ...sorted];
    }, [students]);

    const sectionOptions = useMemo(() => {
        const set = new Set<string>();
        (students || []).forEach((s: any) => {
            const sec = String(s.section || '').trim();
            if (sec && sec !== 'N/A') set.add(sec);
        });
        const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
        return ['All', ...sorted];
    }, [students]);

    const globalSearchQuery = useAppSelector((s: RootState) => s.general?.globalSearchQuery || '');
    
    const filteredStudents = useMemo(() => {
        let list: any[] = students ?? [];
        if (filterClass !== 'All')
            list = list.filter((s: any) => String(s.class || s.grade || s.studentClass || '').trim() === filterClass);
        if (filterSection !== 'All')
            list = list.filter((s: any) => String(s.section || '').trim() === filterSection);
        if (filterGender !== 'All') {
            list = list.filter((s: any) => {
                const g = String(s.gender || '').toLowerCase();
                if (filterGender === 'Boys') return g === 'male' || g === 'boy';
                if (filterGender === 'Girls') return g === 'female' || g === 'girl';
                return true;
            });
        }
        
        const activeSearch = search || globalSearchQuery;
        if (activeSearch.trim()) {
            const q = activeSearch.toLowerCase().trim();
            list = list.filter((s: any) =>
                String(s.fullname || s.name || '').toLowerCase().includes(q) ||
                String(s.rollno ?? '').toLowerCase().includes(q)
            );
        }
        
        if (filterStatus !== 'All' && selectedDate) {
            const loweredTarget = filterStatus.toLowerCase() as StatusType;
            list = list.filter((s: any) => {
                const currentStatus = pendingChanges[s.id]?.[selectedDate] || adminDb[s.id]?.[selectedDate] || 'pending';
                return currentStatus.toLowerCase() === loweredTarget;
            });
        }
        
        return list;
    }, [students, filterClass, filterSection, filterGender, search, globalSearchQuery, filterStatus, adminDb, selectedDate, pendingChanges]);

    // ── Infinite scroll ────────────────────────────────────────────────────────
    const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Reset to first page whenever filters change
    useEffect(() => { 
        setVisibleCount(PAGE_SIZE); 
        setSelectedStudents([]);
    }, [search, filterClass, filterSection, filterGender, filterStatus]);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setVisibleCount(prev => prev + PAGE_SIZE); },
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [adminLoading, filteredStudents]);  // eslint-disable-line react-hooks/exhaustive-deps

    const visibleStudents = useMemo(
        () => filteredStudents.slice(0, visibleCount),
        [filteredStudents, visibleCount]
    );
    const hasMore = visibleCount < filteredStudents.length;

    // Summary counts for selected date
    const counts = useMemo(() => {
        const c = { present: 0, absent: 0, pending: 0 };
        if (!selectedDate) return c;
        filteredStudents.forEach((s: any) => {
            const st = (pendingChanges[s.id]?.[selectedDate] || adminDb[s.id]?.[selectedDate] || 'pending').toLowerCase() as StatusType;
            if (st in c) (c as any)[st]++;
            else c.pending++;
        });
        return c;
    }, [filteredStudents, adminDb, selectedDate, pendingChanges]);

    // Attendance % per day for progress bar in calendar strip
    const dayRate = useCallback((dStr: string): number => {
        if (!filteredStudents.length) return 0;
        const n = filteredStudents.filter((s: any) => {
            const status = pendingChanges[s.id]?.[dStr] || adminDb[s.id]?.[dStr];
            return status === 'present';
        }).length;
        return Math.round((n / filteredStudents.length) * 100);
    }, [filteredStudents, adminDb, selectedDate, pendingChanges]);

    // ── Actions ────────────────────────────────────────────────────────────────
    const toggleSelectAll = (checked: boolean) => {
        if (checked) setSelectedStudents(filteredStudents.map((s: any) => s.id));
        else setSelectedStudents([]);
    };

    const toggleSelectStudent = (id: string, checked: boolean) => {
        if (checked) setSelectedStudents(prev => [...prev, id]);
        else setSelectedStudents(prev => prev.filter(sId => sId !== id));
    };

    const handleMark = (studentId: string, status: StatusType) => {
        if (!selectedDate) return;
        setPendingChanges(prev => {
            const studentChanges = prev[studentId] || { ...adminDb[studentId] } || {};
            return { ...prev, [studentId]: { ...studentChanges, [selectedDate]: status } };
        });
    };

    const handleMarkAll = (status: StatusType) => {
        if (!selectedDate) return;
        const targetStudents = selectedStudents.length > 0 
            ? filteredStudents.filter(s => selectedStudents.includes(s.id))
            : filteredStudents;

        const confirmMsg = selectedStudents.length > 0 
            ? `Mark ${selectedStudents.length} selected students as ${status.toUpperCase()}?`
            : `Mark all ${filteredStudents.length} students as ${status.toUpperCase()}?`;

        if (!window.confirm(confirmMsg)) return;
        
        setPendingChanges(prev => {
            const next = { ...prev };
            targetStudents.forEach(s => {
                const studentChanges = next[s.id] || { ...adminDb[s.id] } || {};
                next[s.id] = { ...studentChanges, [selectedDate]: status };
            });
            return next;
        });
        
        if (selectedStudents.length > 0) setSelectedStudents([]);
    };

    const handleSave = async () => {
        if (Object.keys(pendingChanges).length === 0) return;
        setIsSaving(true);
        try {
            await dispatch(writeBulkStudentAttendance({ updates: pendingChanges })).unwrap();
            setPendingChanges({});
        } catch (error) {
            console.error("Failed to save attendance:", error);
            alert("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    const summaryItems = [
        { label: 'Students', val: filteredStudents.length, color: '#818cf8', bg: 'rgba(129,140,248,0.12)', icon: '👥' },
        { label: 'Present',  val: counts.present,          color: '#16a34a', bg: 'rgba(22,163,74,0.12)',   icon: '✓'  },
        { label: 'Absent',   val: counts.absent,           color: '#dc2626', bg: 'rgba(220,38,38,0.12)',   icon: '✕'  },
    ];

    return (
        <div className="page" style={{ padding: '0px', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>

            {/* ── Page Header ── */}
            <div className="page-header" style={{ padding: '10px 24px', background: 'var(--card)', borderBottom: '1px solid var(--border)', zIndex: 10, flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    
                    {/* ── Left: Title ── */}
                    <div style={{ flex: 1, minWidth: 150 }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>📋 Attendance Register</div>
                        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Daily student attendance tracking</div>
                    </div>

                    {/* ── Middle: Compact Calendar ── */}
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                        <div style={{ 
                            display: 'flex', alignItems: 'center', background: 'var(--bg2)', 
                            borderRadius: 12, padding: '4px 6px', border: '1px solid var(--border)',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                        }}>
                            <div style={{ padding: '0 12px', fontSize: 11, fontWeight: 700, color: 'var(--text)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text2)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{weekDays[0].getFullYear()}</span>
                                <span>{MONTH_NAMES[weekDays[0].getMonth()]}</span>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 8 }}>
                                <button onClick={prevWeek} style={{ width: 24, height: 24, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', border: 'none', background: 'var(--bg3)', cursor: 'pointer' }}>‹</button>
                                
                                <div style={{ display: 'flex', gap: 2 }}>
                                    {weekDays.map(day => {
                                        const dStr    = fmt(day);
                                        const isSel     = dStr === selectedDate;
                                        const isToday   = dStr === todayStr;
                                        const isSunday  = day.getDay() === 0;
                                        const isFuture  = day > now;
                                        const blocked   = isFuture || isSunday;
                                        const pct       = dayRate(dStr);
                                        
                                        return (
                                            <div 
                                                key={dStr}
                                                onClick={() => !blocked && setSelectedDate(dStr)}
                                                title={blocked ? (isSunday ? 'Sunday — off' : 'Future date') : dStr}
                                                style={{
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                    width: 34, height: 38, borderRadius: 8,
                                                    cursor: blocked ? 'not-allowed' : 'pointer',
                                                    background: isSel    ? 'var(--primary,#6366f1)' :
                                                                isToday  ? 'rgba(99,102,241,0.08)' : 'transparent',
                                                    color: isSel ? '#fff' : isSunday ? '#ef4444' : 'var(--text)',
                                                    opacity: isFuture ? 0.35 : 1,
                                                    transition: 'all 0.2s', position: 'relative', overflow: 'hidden', flexShrink: 0
                                                }}
                                            >
                                                <span style={{ fontSize: 10, fontWeight: isSunday ? 700 : 600, color: isSel ? 'rgba(255,255,255,0.8)' : isSunday ? '#ef4444' : 'var(--text2)', textTransform: 'uppercase', lineHeight: 1 }}>
                                                    {DAY_LABELS[day.getDay()][0]}
                                                </span>
                                                <span style={{ fontSize: 13, fontWeight: 700, marginTop: 2, lineHeight: 1 }}>
                                                    {day.getDate()}
                                                </span>
                                                {pct > 0 && !isSel && (
                                                    <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:'rgba(22,163,74,0.15)' }}>
                                                        <div style={{ height:'100%', width:`${pct}%`, background:'#16a34a', borderRadius:1.5 }} />
                                                    </div>
                                                )}
                                                {isToday && !isSel && (
                                                    <div style={{ position:'absolute', top:4, right:4, width:4, height:4, borderRadius:'50%', background:'var(--primary)' }} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                <button onClick={nextWeek} style={{ width: 24, height: 24, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', border: 'none', background: 'var(--bg3)', cursor: 'pointer' }}>›</button>
                            </div>
                        </div>
                    </div>

                    {/* ── Right: Summary & Actions ── */}
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1, justifyContent: 'flex-end', minWidth: 150 }}>
                        {/* Compact Summary */}
                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg2)', borderRadius: 6, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                            {summaryItems.map((item, idx) => (
                                <div key={item.label} style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', background: idx % 2 === 0 ? 'var(--bg3)' : 'transparent', borderRight: idx < summaryItems.length - 1 ? '1px solid var(--border)' : 'none', whiteSpace: 'nowrap' }}>
                                    <span style={{ fontSize: 13, marginRight: 4 }}>{item.icon}</span>
                                    <span style={{ fontSize: 11, color: 'var(--text2)', marginRight: 6, fontWeight: 500 }}>{item.label}</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.val}</span>
                                </div>
                            ))}
                        </div>

                        {Object.keys(pendingChanges).length > 0 && (
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                style={{
                                    padding: '6px 16px', fontSize: 13, fontWeight: 700,
                                    borderRadius: 6, background: '#3b82f6', color: '#fff',
                                    border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 2px 8px rgba(59,130,246,0.3)'
                                }}
                            >
                                {isSaving ? 'Saving...' : `💾 Save (${Object.keys(pendingChanges).length})`}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Main Content Scroll Area ── */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0px 24px 20px', background: 'var(--bg)' }}>

            {/* ── Table + Toolbar ── */}
            <div className="table-wrap" style={{
                flex: 1, display: 'flex', flexDirection: 'column', margin: 0,
                background:'var(--card)',
                border:'1px solid var(--border,rgba(255,255,255,0.07))',
                borderRadius:10, overflow:'hidden',
            }}>

                {/* Toolbar */}
                <div style={{
                    display:'flex', alignItems:'center', flexWrap:'wrap',
                    gap:8, padding:'10px 14px',
                    borderBottom:'1px solid var(--border,rgba(255,255,255,0.07))',
                }}>
                    {/* Search box */}
                    <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
                        <span style={{
                            position:'absolute', left:9, fontSize:11,
                            color:'var(--text2)', pointerEvents:'none',
                        }}>🔍</span>
                        <input
                            placeholder="Search name or roll…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                height:30, paddingLeft:26, paddingRight:26,
                                fontSize:12, width:180,
                                background:'var(--bg3,rgba(255,255,255,0.05))',
                                border:'1px solid var(--border,rgba(255,255,255,0.1))',
                                borderRadius:7, color:'var(--text)', outline:'none',
                            }}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                style={{
                                    position:'absolute', right:6, 
                                    background:'transparent', border:'none',
                                    color:'var(--text2)', cursor:'pointer',
                                    fontSize:12, padding:2, display:'flex',
                                    alignItems:'center', justifyContent:'center',
                                    borderRadius:'50%'
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}
                                title="Clear search"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Class filter */}
                    <select value={filterClass} onChange={e => setFilterClass(e.target.value)} style={selectStyle}>
                        {classOptions.map(c => <option key={c} value={c} style={{ background: 'var(--card)', color: 'var(--text)' }}>{c === 'All' ? 'All Classes' : c}</option>)}
                    </select>

                    {/* Section filter */}
                    <select value={filterSection} onChange={e => setFilterSection(e.target.value)} style={selectStyle}>
                        {sectionOptions.map(c => <option key={c} value={c} style={{ background: 'var(--card)', color: 'var(--text)' }}>{c === 'All' ? 'All Sections' : c}</option>)}
                    </select>

                    {/* Gender filter */}
                    <select value={filterGender} onChange={e => setFilterGender(e.target.value)} style={selectStyle}>
                        {GENDER_OPTIONS.map(g => <option key={g} value={g} style={{ background: 'var(--card)', color: 'var(--text)' }}>{g === 'All' ? 'All Genders' : g}</option>)}
                    </select>

                    {/* Status filter */}
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...selectStyle, flex: 1, maxWidth: 140 }}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s} style={{ background: 'var(--card)', color: 'var(--text)' }}>{s === 'All' ? 'All Status' : s}</option>)}
                    </select>

                    {/* Bulk Actions: Mark All P, A, L */}
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                        <button
                            disabled={!selectedDate}
                            onClick={() => handleMarkAll('present')}
                            title="Mark All Present"
                            style={{
                                width:28, height:28, borderRadius:6, padding:0,
                                fontSize:12, fontWeight:800, border:'1px solid rgba(22,163,74,0.4)',
                                background:'rgba(22,163,74,0.15)', color:'#4ade80',
                                cursor: selectedDate ? 'pointer' : 'not-allowed',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                opacity: selectedDate ? 1 : 0.4, transition:'all 0.15s',
                            }}
                        >
                            P
                        </button>
                        <button
                            disabled={!selectedDate}
                            onClick={() => handleMarkAll('absent')}
                            title="Mark All Absent"
                            style={{
                                width:28, height:28, borderRadius:6, padding:0,
                                fontSize:12, fontWeight:800, border:'1px solid rgba(220,38,38,0.4)',
                                background:'rgba(220,38,38,0.15)', color:'#f87171',
                                cursor: selectedDate ? 'pointer' : 'not-allowed',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                opacity: selectedDate ? 1 : 0.4, transition:'all 0.15s',
                            }}
                        >
                            A
                        </button>
                        <button
                            disabled={!selectedDate}
                            onClick={() => handleMarkAll('pending')}
                            title="Clear All Attendance"
                            style={{
                                width:28, height:28, borderRadius:6, padding:0,
                                fontSize:14, fontWeight:800, border:'1px solid rgba(100,116,139,0.4)',
                                background:'rgba(100,116,139,0.15)', color:'#64748b',
                                cursor: selectedDate ? 'pointer' : 'not-allowed',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                opacity: selectedDate ? 1 : 0.4, transition:'all 0.15s',
                            }}
                        >
                            <span style={{ marginTop: '-2px' }}>&times;</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                {adminLoading ? (
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column', 
                        alignItems: 'center', justifyContent: 'center',
                        gap: 16, padding: '48px 16px', color: 'var(--text2)'
                    }}>
                        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
                        <div style={{ 
                            fontSize: 15, fontWeight: 600, color: 'var(--text)',
                            letterSpacing: '0.03em', textTransform: 'uppercase', opacity: 0.8
                        }}>
                            Loading Attendance...
                        </div>
                    </div>

                ) : filteredStudents.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'32px 16px', color:'var(--text2)', fontSize:13 }}>
                        <div style={{ fontSize:28, marginBottom:8 }}>🔍</div>
                        No students match your filters.
                    </div>

                ) : (
                    <>
                        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', width: '100%' }}>
                            <table style={{ background: 'var(--card)', width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 100%)', color: '#ffffff', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', width: 30, textAlign: 'center' }}>
                                        <input type="checkbox" 
                                            checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0} 
                                            onChange={e => toggleSelectAll(e.target.checked)} 
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </th>
                                    <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', width: '5%', textAlign: 'center', color: '#ffffff' }}>#</th>
                                    <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', width: 80, textAlign: 'left' }}>Roll No</th>
                                    <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', width: '23%', textAlign: 'left' }}>Student</th>
                                    <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', width: '10%', textAlign: 'left' }}>Class</th>
                                    <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', width: '10%', textAlign: 'left' }}>Section</th>
                                    <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', width: '15%', textAlign: 'left' }}>Attendance By</th>
                                    <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', width: '22%', textAlign: 'left' }}>Status</th>
                                    <th style={{ padding: '7px 10px', borderLeft: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', width: '15%', textAlign: 'center' }}>Mark</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleStudents.map((s: any, i: number) => {
                                    const rawSt = pendingChanges[s.id]?.[selectedDate] || adminDb[s.id]?.[selectedDate] || 'pending';
                                    const actSt = rawSt.toLowerCase() as StatusType;
                                    const meta  = STATUS_META[actSt] ?? STATUS_META.pending;
                                    const name  = s.fullname ?? s.name ?? 'Unknown';
                                    const rowNum = i + 1;

                                    const markedByStr = markedByDb[s.id]?.[selectedDate] || '';
                                    let markedByName = '—';
                                    let markedByTime = '';
                                    let markedBySubject = '';
                                    
                                    if (markedByStr) {
                                        const parts = markedByStr.split('|||');
                                        markedByName = parts[0] || '—';
                                        markedByTime = parts[1] || '';
                                        
                                        const teacher = teachersRaw?.find((t: any) => t.name === markedByName);
                                        if (teacher) {
                                            markedBySubject = teacher.subject || (teacher.subjects ? teacher.subjects.join(', ') : '');
                                        }
                                    }

                                    return (
                                        <tr
                                            key={s.id}
                                            onClick={() => toggleSelectStudent(s.id, !selectedStudents.includes(s.id))}
                                            style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)', background: selectedStudents.includes(s.id) ? 'rgba(99,102,241,0.1)' : (i % 2 === 0 ? 'var(--card)' : 'var(--bg3)') }}
                                            onMouseEnter={e => { if (!selectedStudents.includes(s.id)) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                                            onMouseLeave={e => { if (!selectedStudents.includes(s.id)) e.currentTarget.style.background = i % 2 === 0 ? 'var(--card)' : 'var(--bg3)' }}
                                        >
                                            {/* Checkbox */}
                                            <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', textAlign: 'center' }}>
                                                <input type="checkbox" 
                                                    checked={selectedStudents.includes(s.id)} 
                                                    onChange={e => toggleSelectStudent(s.id, e.target.checked)} 
                                                    onClick={e => e.stopPropagation()} 
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            </td>

                                            {/* # */}
                                            <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', textAlign: 'center', fontSize: 11, color: 'var(--text2)' }}>
                                                {rowNum}
                                            </td>

                                            {/* Roll No */}
                                            <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontFamily: 'monospace', color: 'var(--primary-light)', fontSize: 12 }}>
                                                {s.rollno ?? '—'}
                                            </td>

                                            {/* Name & Father */}
                                            <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{
                                                        width: 26, height: 26, fontSize: 12, flexShrink: 0, borderRadius: '50%',
                                                        background: meta.bg, color: meta.color,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700
                                                    }}>
                                                        {name[0]?.toUpperCase() ?? '?'}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>{name}</div>
                                                        <div style={{ fontSize: 10, color: 'var(--text2)' }}>
                                                            {(s.gender?.toLowerCase() === 'female' || s.gender?.toLowerCase() === 'girl') ? 'D/o' : 'S/o'} {s.fatherName || s.fathername || '—'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Class badge */}
                                            <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 12 }}>
                                                {(s.class || s.grade || s.studentClass) ? (
                                                    <span style={{
                                                        display:'inline-block', padding:'1px 7px',
                                                        borderRadius:4, fontSize:10, fontWeight:600,
                                                        background:'rgba(129,140,248,0.12)',
                                                        color:'#818cf8',
                                                        border:'1px solid rgba(129,140,248,0.2)',
                                                    }}>
                                                        {s.class || s.grade || s.studentClass}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            
                                            {/* Section badge */}
                                            <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)', fontSize: 12 }}>
                                                {s.section ? (
                                                    <span style={{
                                                        display:'inline-block', padding:'1px 7px',
                                                        borderRadius:4, fontSize:10, fontWeight:600,
                                                        background:'rgba(56,189,248,0.12)',
                                                        color:'#38bdf8',
                                                        border:'1px solid rgba(56,189,248,0.2)',
                                                    }}>
                                                        {s.section}
                                                    </span>
                                                ) : '—'}
                                            </td>

                                            {/* Attendance By */}
                                            <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
                                                    {markedByName}
                                                </div>
                                                {markedBySubject && (
                                                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, fontStyle: 'italic' }}>
                                                        {markedBySubject}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Status badge */}
                                            <td style={{ padding: '5px 10px', borderRight: '1px solid var(--border)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                                                    <span style={{
                                                        display:'inline-flex', alignItems:'center',
                                                        padding:'2px 8px', borderRadius:20,
                                                        fontSize:10, fontWeight:600,
                                                        color:meta.color, background:meta.bg,
                                                        border:`1px solid ${meta.color}33`,
                                                        textTransform:'uppercase', letterSpacing:'0.3px',
                                                    }}>
                                                        {meta.label}
                                                    </span>
                                                    {actSt !== 'pending' && markedByTime && (
                                                        <span style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '0.02em', fontWeight: 500 }}>
                                                            {new Date(selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at {markedByTime}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Action buttons */}
                                            <td style={{ padding: '5px 10px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                                                <div style={{ display:'flex', gap:4, justifyContent:'center' }}>
                                                    {(['present','absent','pending'] as StatusType[]).map(action => {
                                                        const m = STATUS_META[action];
                                                        const icon = action === 'pending' ? <span style={{ fontSize:14 }}>&times;</span> : m.short;
                                                        return (
                                                            <button
                                                                key={action}
                                                                title={`Mark ${m.label}`}
                                                                disabled={!selectedDate}
                                                                onClick={() => handleMark(s.id, action)}
                                                                style={mkActionBtn(actSt === action, m.color, m.bg)}
                                                            >
                                                                {icon}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {/* ── Infinite-scroll sentinel ── */}
                        {hasMore && (
                            <div
                                ref={sentinelRef}
                                style={{
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    gap:8, padding:'14px 16px', color:'var(--text2)', fontSize:12,
                                    borderTop:'1px solid var(--border,rgba(255,255,255,0.05))',
                                }}
                            >
                                <div className="spinner" style={{ width:14, height:14 }} />
                                Loading {Math.min(PAGE_SIZE, filteredStudents.length - visibleCount)} more…
                            </div>
                        )}
                        </div>

                        {/* ── Footer ── */}
                        <div style={{
                            padding:'8px 14px', fontSize:11, color:'var(--text2)',
                            borderTop:'1px solid var(--border,rgba(255,255,255,0.06))',
                            display:'flex', alignItems:'center', justifyContent:'space-between',
                        }}>
                            <span>
                                Showing{' '}
                                <strong style={{ color:'var(--text)' }}>{visibleStudents.length}</strong>
                                {' '}of{' '}
                                <strong style={{ color:'var(--text)' }}>{filteredStudents.length}</strong>
                                {' '}student{filteredStudents.length !== 1 ? 's' : ''}
                            </span>
                            {selectedDate && (
                                <span style={{ display:'flex', gap:12 }}>
                                    {(['present','absent'] as StatusType[]).map(st => (
                                        <span key={st} style={{ color:STATUS_META[st].color, fontWeight:600 }}>
                                            {STATUS_META[st].short} {counts[st]}
                                        </span>
                                    ))}
                                </span>
                            )}
                        </div>
                    </>
                )}
            </div>
            </div>
        </div>
    );
}