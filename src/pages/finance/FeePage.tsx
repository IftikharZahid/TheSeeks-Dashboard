import React, { useEffect, useState, useMemo } from 'react';
import { doc, setDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchFees, addOrUpdateFee } from '../../store/slices/feesSlice';
import { fetchStudents } from '../../store/slices/studentsSlice';
import { fetchClasses, fetchDefaultFees } from '../../store/slices/appSettingsSlice';
import { RootState } from '../../store/store';
import { ResizableTh } from '../../components/common/ResizableTh';

interface Student {
    id: string;
    name: string;
    fatherName: string;
    grade: string;
    rollno: string;
    email: string;
}

interface FeeRecord {
    id: string;             // UID matching student
    studentId: string;      // Legacy UI mapping
    studentName: string;
    rollno: string;
    grade: string;
    fatherName: string;
    totalFee: number;
    paidAmount: number;
    pendingAmount: number;
    amount?: number;        // From Redux type slice
    datePaid?: string;      // From Redux type slice
    months?: string[];      // From Redux type slice
    status: 'Paid' | 'Unpaid' | string;
    month: string;
    lastUpdated?: string;
    history?: { id: string; date: string; amountPaid: number; months: string[]; type?: string }[];
    monthlyFees?: Record<string, { total: number; paid: number }> | null; // Explicit per-month breakdown
}

const MONTH_OPTIONS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function fmt(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function statusClass(s: string) {
    if (s === 'paid') return 'badge-paid';
    if (s === 'partial') return 'badge-partial';
    return 'badge-pending';
}

export default function FeePage() {
    const dispatch = useAppDispatch();

    // REDUX STATE
    const { data: feesData, status: feesStatus } = useAppSelector((s: RootState) => s.fees);
    const { data: studentsData, status: studentsStatus } = useAppSelector((s: RootState) => s.students);
    const classes = useAppSelector((s: any) => s.appSettings.classes as string[]);
    const classesStatus = useAppSelector((s: any) => s.appSettings.classesStatus);
    const defaultFees = useAppSelector((s: any) => s.appSettings.defaultFees);
    const defaultFeesStatus = useAppSelector((s: any) => s.appSettings.defaultFeesStatus);
    const loading = feesStatus === 'loading' || feesStatus === 'idle' || studentsStatus === 'loading' || defaultFeesStatus === 'loading';

    // UI STATE
    const [search, setSearch] = useState('');
    const [classFilter, setClassFilter] = useState('All Classes');
    const [statusFilter, setStatusFilter] = useState('All Statuses');
    const [editRecord, setEditRecord] = useState<FeeRecord | null>(null);
    const [monthlyFees, setMonthlyFees] = useState<Record<string, { total: number; paid: number }>>({});
    const [originalMonthlyFees, setOriginalMonthlyFees] = useState<Record<string, { total: number; paid: number }>>({});
    const [feeMonths, setFeeMonths] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [showHistory, setShowHistory] = useState<FeeRecord | null>(null);
    const [showGlobalHistory, setShowGlobalHistory] = useState(false);
    const [monthFilter, setMonthFilter] = useState('All Months');
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

    // ── Date / calendar (Decorative matching AttendancePage) ──
    const now        = useMemo(() => new Date(), []);
    const todayStr   = useMemo(() => fmt(now), [now]);
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);
    const getWeekDays = (baseDate: Date) => {
        const d = new Date(baseDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
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

    const handleBulkStatusChange = async (newStatus: string) => {
        if (selectedStudents.length === 0) return;
        if (!confirm(`Are you sure you want to change the status of ${selectedStudents.length} students to ${newStatus}?`)) return;
        
        setSaving(true);
        try {
            const promises = selectedStudents.map(async (studentId) => {
                const rec = records.find((r: any) => r.studentId === studentId);
                if (!rec) return;

                const newPaidAmount = newStatus === 'paid' ? rec.totalFee : 0;
                const pending = rec.totalFee - newPaidAmount;
                const legacyStatus = pending <= 0 ? 'paid' : (newPaidAmount === 0 ? 'pending' : 'partial');

                const newMonthlyFees = { ...(rec.monthlyFees || {}) };
                if (rec.months && rec.months.length > 0) {
                    rec.months.forEach((m: string) => {
                        const mTotal = newMonthlyFees[m]?.total || Math.round(rec.totalFee / (rec.months?.length || 1));
                        newMonthlyFees[m] = {
                            total: mTotal,
                            paid: newStatus === 'paid' ? mTotal : 0
                        };
                    });
                }

                const docId = rec.id;
                const dbHistory = rec.history || [];
                const newlyPaid = newPaidAmount - rec.paidAmount;
                
                const updatedHistory = [...dbHistory];
                if (newlyPaid !== 0) {
                    updatedHistory.push({
                        id: Date.now().toString() + Math.random().toString().slice(2, 6),
                        date: new Date().toISOString(),
                        amountPaid: newlyPaid,
                        months: rec.months || [],
                        type: newlyPaid < 0 ? 'adjustment' : 'payment'
                    });
                }

                const updatedFee = {
                    id: docId,
                    studentId: rec.studentId,
                    studentName: rec.studentName,
                    totalFee: rec.totalFee,
                    paidAmount: newPaidAmount,
                    amount: newPaidAmount,
                    datePaid: new Date().toISOString(),
                    months: rec.months || [],
                    status: legacyStatus === 'paid' ? 'Paid' : 'Unpaid',
                    month: rec.month || '',
                    lastUpdated: new Date().toISOString(),
                    history: updatedHistory,
                    monthlyFees: newMonthlyFees
                };

                dispatch(addOrUpdateFee(updatedFee as any));
                const feeRef = doc(db, 'fees', docId);
                await setDoc(feeRef, updatedFee, { merge: true });
            });
            await Promise.all(promises);
            setSelectedStudents([]);
            alert('Bulk status update successful.');
        } catch (e) {
            console.error(e);
            alert('Error updating bulk status');
        } finally {
            setSaving(false);
        }
    };

    
    const nextWeek = () => {
        const next = new Date(weekDays[0]);
        next.setDate(next.getDate() + 7);
        setWeekDays(getWeekDays(next));
    };

    const calculatedTotalFee = useMemo(() => {
        return Object.values(monthlyFees).reduce((acc, curr) => acc + curr.total, 0);
    }, [monthlyFees]);

    const calculatedPaidAmount = useMemo(() => {
        return Object.values(monthlyFees).reduce((acc, curr) => acc + curr.paid, 0);
    }, [monthlyFees]);

    const CURRENT_MONTH = useMemo(() => MONTH_OPTIONS[new Date().getMonth()], []);

    useEffect(() => {
        if (feesStatus === 'idle') dispatch(fetchFees());
        if (studentsStatus === 'idle') dispatch(fetchStudents());
        if (classesStatus === 'idle') dispatch(fetchClasses());
        if (defaultFeesStatus === 'idle') dispatch(fetchDefaultFees());
    }, [dispatch, feesStatus, studentsStatus, classesStatus, defaultFeesStatus]);

    const records = useMemo(() => {
        const feesMap: Record<string, any> = {};
        feesData.forEach((d: any) => { feesMap[d.id] = d; });

        return studentsData.map((s: any) => {
            const fee = feesMap[s.id];
            const grade = s.grade || s.class || '';
            const rollno = String(s.rollno || s.studentId || s.id || '');
            const fatherName = s.fatherName || s.fathername || '';
            const name = s.name || s.fullname || 'Unknown';
            const defaultFee = defaultFees[grade] || 0;

            if (fee) {
                const total = fee.totalFee || defaultFee;
                const paid = fee.paidAmount || 0;
                const pending = total - paid;
                const legacyStatus = (total > 0 && pending <= 0) ? 'paid' : (paid === 0 ? 'pending' : 'partial');
                return {
                    id: s.id, studentId: s.id, studentName: name, rollno, grade, fatherName,
                    totalFee: total, paidAmount: paid, pendingAmount: pending > 0 ? pending : 0,
                    status: legacyStatus, month: fee.month || '', amount: paid, datePaid: fee.lastUpdated || '', months: fee.month ? fee.month.split(',').map((m: string) => m.trim()) : [], history: fee.history || [],
                    monthlyFees: fee.monthlyFees || null
                } as FeeRecord;
            }
            return {
                id: s.id, studentId: s.id, studentName: name, rollno, grade, fatherName,
                totalFee: defaultFee, paidAmount: 0, pendingAmount: defaultFee, status: 'pending', month: '', amount: 0, datePaid: '', months: [], history: []
            } as FeeRecord;
        });
    }, [studentsData, feesData, defaultFees]);

    const globalSearchQuery = useAppSelector((s: RootState) => s.general.globalSearchQuery);
    const activeSearch = search || globalSearchQuery;

    const filtered = records.filter((r: FeeRecord) => {
        const matchClass = classFilter === 'All Classes' ? true : r.grade === classFilter;
        let matchStatus = true;
        if (statusFilter !== 'All Statuses') {
            const lowTarget = statusFilter.toLowerCase();
            if (lowTarget === 'unpaid') {
                matchStatus = r.status === 'pending' || r.status === 'partial';
            } else {
                matchStatus = r.status === lowTarget;
            }
        }
        const matchMonth = monthFilter === 'All Months' ? true : r.months?.includes(monthFilter);
        const q = activeSearch.toLowerCase().trim();
        return matchClass && matchStatus && matchMonth && (!q ||
            (r.studentName && String(r.studentName).toLowerCase().includes(q)) ||
            (r.rollno && String(r.rollno).toLowerCase().includes(q)));
    });

    const paidCount = records.filter((r: any) => r.status === 'paid').length;

    const allHistory = useMemo(() => {
        const history: any[] = [];
        records.forEach((r) => {
            if (r.history && r.history.length > 0) {
                r.history.forEach((h: any) => {
                    history.push({ ...h, studentName: r.studentName, rollno: r.rollno, grade: r.grade });
                });
            }
        });
        return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [records]);

    const globalStats = useMemo(() => {
        let expected = 0;
        let collected = 0;
        let pending = 0;
        records.forEach(r => {
            expected += (r.totalFee || 0);
            collected += (r.paidAmount || 0);
            pending += (r.pendingAmount || 0);
        });
        return { expected, collected, pending };
    }, [records]);

    const pendingCount = records.filter((r: any) => r.status === 'pending').length;
    const partialCount = records.filter((r: any) => r.status === 'partial').length;

    const handleExportFees = async () => {
        try {
            const XLSX = await import('xlsx');
            
            const exportData = filtered.map((r, i) => ({
                'S.No': i + 1,
                'Student Name': r.studentName,
                'Father Name': r.fatherName || '',
                'Class/Grade': r.grade || '',
                'Roll No': r.rollno || '',
                'Total Fee (PKR)': r.totalFee,
                'Paid Amount (PKR)': r.paidAmount,
                'Pending Amount (PKR)': r.pendingAmount,
                'Status': r.status.toUpperCase(),
                'Billing Months': r.months?.join(', ') || 'None',
                'Recent Payment Date': r.datePaid ? new Date(r.datePaid).toLocaleString() : 'N/A'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Fee Records");
            
            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `TheSeeks_Fees_Backup_${dateStr}.xlsx`);
        } catch (err: any) {
            alert('Failed to export fees: ' + err.message);
        }
    };

    const openEdit = (r: FeeRecord) => {
        setEditRecord(r);
        const months = r.month ? r.month.split(',').map(m => m.trim()).filter(Boolean) : [];
        setFeeMonths(months);

        const initialMonthlyFees: Record<string, { total: number; paid: number }> = {};
        if (months.length > 0) {
            const hasSavedBreakdown = r.monthlyFees && Object.keys(r.monthlyFees).length > 0;
            const defaultTotal = Math.round(r.totalFee / months.length);
            const defaultPaid = Math.round(r.paidAmount / months.length);
            months.forEach(m => {
                if (hasSavedBreakdown && r.monthlyFees && r.monthlyFees[m]) {
                    initialMonthlyFees[m] = {
                        total: typeof r.monthlyFees[m].total === 'number' ? r.monthlyFees[m].total : defaultTotal,
                        paid: typeof r.monthlyFees[m].paid === 'number' ? r.monthlyFees[m].paid : defaultPaid
                    };
                } else {
                    initialMonthlyFees[m] = {
                        total: defaultTotal,
                        paid: defaultPaid
                    };
                }
            });
        }
        setMonthlyFees(initialMonthlyFees);
        setOriginalMonthlyFees(JSON.parse(JSON.stringify(initialMonthlyFees)));
    };

    const toggleMonth = (m: string) => {
        setFeeMonths(prev => {
            const exists = prev.includes(m);
            const next = exists ? prev.filter(x => x !== m) : [...prev, m];

            setMonthlyFees(prevMonthly => {
                const updated = { ...prevMonthly };
                if (exists) {
                    delete updated[m];
                } else {
                    const grade = editRecord?.grade || '';
                    const defaultFee = defaultFees[grade] || 0;
                    updated[m] = { total: defaultFee, paid: 0 };
                }
                return updated;
            });
            return next;
        });
    };

    const save = async () => {
        if (!editRecord || saving) return;
        if (feeMonths.length === 0) { alert('Please select at least one fee month.'); return; }
        setSaving(true);
        try {
            const total = calculatedTotalFee;
            const paid = calculatedPaidAmount;
            const pending = total - paid;
            const status = (total > 0 && pending <= 0) ? 'paid' : (paid === 0 ? 'pending' : 'partial');

            const payloadPlaceholder = {
                id: editRecord.studentId,
                studentId: editRecord.studentId,
                studentName: editRecord.studentName,
                totalFee: total,
                paidAmount: paid,
                amount: paid,
                datePaid: new Date().toISOString(),
                months: feeMonths,
                pendingAmount: pending > 0 ? pending : 0,
                status: (status === 'paid' ? 'Paid' : 'Unpaid') as 'Paid' | 'Unpaid',
                month: feeMonths.join(', '),
                lastUpdated: new Date().toISOString(),
                history: editRecord.history || [], // Will be updated atomically by transaction
                monthlyFees: monthlyFees,
            };

            // Run a Firestore Transaction to guarantee concurrency control and prevent duplicate updates
            await runTransaction(db, async (transaction) => {
                const studentRef = doc(db, 'students', editRecord.studentId);
                const feeRef = doc(db, 'fees', editRecord.studentId);

                const feeSnap = await transaction.get(feeRef);

                let dbHistory = [];
                let dbOldPaid = 0;

                if (feeSnap.exists()) {
                    const feeData = feeSnap.data();
                    dbHistory = feeData.history || [];
                    dbOldPaid = feeData.paidAmount || 0;
                }

                const dbNewlyPaid = paid - dbOldPaid;
                let dbUpdatedHistory = [...dbHistory];

                if (dbNewlyPaid !== 0) {
                    const now = Date.now();
                    // Prevent duplicate payments within a very recent 5-second window
                    let isDuplicate = false;
                    if (dbNewlyPaid > 0) {
                        isDuplicate = dbHistory.some((h: any) => {
                            const diffTime = Math.abs(now - new Date(h.date).getTime());
                            return diffTime < 5000 && h.amountPaid === dbNewlyPaid;
                        });
                    }

                    if (!isDuplicate) {
                        // Find exactly which months have received a new payment or correction (changed paid amount)
                        const newlyPaidMonths = feeMonths.filter(m => {
                            const oldVal = originalMonthlyFees[m]?.paid || 0;
                            const newVal = monthlyFees[m]?.paid || 0;
                            return newVal !== oldVal;
                        });
                        const transactionMonths = newlyPaidMonths.length > 0 ? newlyPaidMonths : feeMonths;

                        dbUpdatedHistory.push({
                            id: now.toString(),
                            date: new Date().toISOString(),
                            amountPaid: dbNewlyPaid,
                            months: transactionMonths,
                            type: dbNewlyPaid < 0 ? 'adjustment' : 'payment'
                        });
                    }
                }

                // Final defensive de-duplication of IDs
                const seenIds = new Set();
                dbUpdatedHistory = dbUpdatedHistory.filter((h: any) => {
                    if (!h.id || seenIds.has(h.id)) return false;
                    seenIds.add(h.id);
                    return true;
                });

                const finalPayload = {
                    ...payloadPlaceholder,
                    history: dbUpdatedHistory,
                };

                // Apply optimistic Redux UI Update with final transaction payload
                dispatch(addOrUpdateFee(finalPayload));

                // Execute atomic transaction writes
                transaction.update(studentRef, { month: feeMonths.join(', ') });
                transaction.set(feeRef, finalPayload);
            });

            setEditRecord(null);
        } catch (e) {
            console.error('Save transaction failed:', e);
            alert('Failed to save fee record concurrently. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const pending = editRecord ? calculatedTotalFee - calculatedPaidAmount : 0;

    const invoiceNumber = useMemo(() => {
        if (!showHistory) return '';
        const latestPayment = showHistory.history && showHistory.history.length > 0
            ? [...showHistory.history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
            : null;

        const targetDate = latestPayment ? new Date(latestPayment.date) : new Date();
        const month = targetDate.getMonth();
        const year = targetDate.getFullYear();

        const monthHistory = allHistory.filter(h => {
            const d = new Date(h.date);
            return d.getMonth() === month && d.getFullYear() === year;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let serial = 1;
        if (latestPayment) {
            const idx = monthHistory.findIndex(h => h.id === latestPayment.id);
            if (idx !== -1) serial = idx + 1;
        } else {
            serial = monthHistory.length + 1;
        }

        const dayStr = String(targetDate.getDate()).padStart(2, '0');
        const monthStr = String(month + 1).padStart(2, '0');
        const yearStr = String(year).slice(-2);
        const serialStr = String(serial).padStart(3, '0');

        return `TheSeeks-FTA-${dayStr}${monthStr}${yearStr}-${serialStr}`;
    }, [showHistory, allHistory]);

    return (
        <div className="page" style={{ padding: '0px', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {saving && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(2px)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="spinner" style={{ width: 48, height: 48, border: '4px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', marginBottom: 16 }}></div>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 16 }}>Processing...</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Saving fee records, please wait</div>
                </div>
            )}
            <div className="page-header no-print" style={{ padding: '10px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)', zIndex: 10, flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>💰 Fee Management</div>
                            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>Track and manage student fee records</div>
                        </div>
                        
                        {/* ── Weekly Calendar Widget (Decorative) ── */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {weekDays.map(day => {
                                    const dStr    = fmt(day);
                                    const isSel     = dStr === selectedDate;
                                    const isToday   = dStr === todayStr;
                                    const isSunday  = day.getDay() === 0;
                                    const isFuture  = day > now;
                                    const blocked   = isFuture || isSunday;
                                    
                                    return (
                                        <div 
                                            key={dStr}
                                            onClick={() => !blocked && setSelectedDate(dStr)}
                                            title={blocked ? (isSunday ? 'Sunday — off' : 'Future date') : dStr}
                                            style={{
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                width: 32, height: 36, borderRadius: 6,
                                                cursor: blocked ? 'not-allowed' : 'pointer',
                                                border: `1px solid ${
                                                    isSel    ? 'var(--primary,#6366f1)' :
                                                    isSunday ? 'rgba(239,68,68,0.2)' :
                                                    'transparent'
                                                }`,
                                                background: isSel    ? 'var(--primary,#6366f1)' :
                                                            isToday  ? 'rgba(99,102,241,0.08)' :
                                                            isSunday ? 'rgba(239,68,68,0.03)' : 'transparent',
                                                color: isSel ? '#fff' : isSunday ? '#ef4444' : 'var(--text)',
                                                opacity: isFuture ? 0.35 : 1,
                                                transition: 'all 0.2s', position: 'relative', overflow: 'hidden', flexShrink: 0
                                            }}
                                        >
                                            <span style={{ fontSize: 9, fontWeight: isSunday ? 700 : 600, color: isSel ? 'rgba(255,255,255,0.8)' : isSunday ? '#ef4444' : 'var(--text2)', textTransform: 'uppercase', lineHeight: 1 }}>
                                                {DAY_LABELS[day.getDay()]}
                                            </span>
                                            <span style={{ fontSize: 13, fontWeight: 700, marginTop: 2, lineHeight: 1 }}>
                                                {day.getDate()}
                                            </span>
                                            {isToday && !isSel && (
                                                <div style={{ position:'absolute', top:3, right:3, width:3, height:3, borderRadius:'50%', background:'var(--primary)' }} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <button className="btn btn-ghost" onClick={nextWeek} style={{ width: 22, height: 22, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg2)', border: '1px solid var(--border)' }}>›</button>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {[
                            { label: 'Total', val: records.length, color: '#818cf8' },
                            { label: 'Paid', val: paidCount, color: '#10b981' },
                            { label: 'Pending', val: pendingCount, color: '#ef4444' },
                            { label: 'Partial', val: partialCount, color: '#f59e0b' },
                        ].map(item => (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px' }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: item.color }}>{item.val}</span>
                                <span style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{item.label}</span>
                            </div>
                        ))}
                        <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
                        <button onClick={() => setShowGlobalHistory(true)} className="btn btn-ghost" style={{ fontSize: 11, height: 28, padding: '0 10px', color: 'var(--primary)', borderColor: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', gap: 4 }}>🕒 History</button>
                        <button onClick={handleExportFees} className="btn btn-ghost" style={{ fontSize: 11, height: 28, padding: '0 10px', color: '#10b981', borderColor: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: 4 }}>⬇️ Backup</button>
                    </div>
                </div>
            </div>

            {loading ? <div className="loading no-print" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" />Loading...</div> : (
                <div className="table-wrap no-print" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: '10px 16px', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div className="table-toolbar" style={{ padding: '6px 12px', gap: 6, flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
                        {selectedStudents.length > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1.5 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>{selectedStudents.length} Selected</span>
                                <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11, minHeight: 28 }} onClick={() => handleBulkStatusChange('paid')}>Mark Paid</button>
                                <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 11, minHeight: 28, borderColor: 'var(--error)', color: 'var(--error)' }} onClick={() => handleBulkStatusChange('pending')}>Mark Pending</button>
                                <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11, minHeight: 28 }} onClick={() => setSelectedStudents([])}>Cancel</button>
                            </div>
                        ) : (
                            <div className="search-box" style={{ flex: 1.5, background: 'var(--bg3)', margin: 0, height: 30, minHeight: 'unset' }}>
                            <span className="search-icon" style={{ fontSize: 12 }}>🔍</span>
                            <input placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: 'transparent', fontSize: 12 }} />
                            </div>
                        )}
                        <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px' }}>
                            <option value="All Months">All Months</option>
                            {MONTH_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px' }}>
                            <option value="All Classes">All Classes</option>
                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-input" style={{ height: 30, fontSize: 12, padding: '0 8px' }}>
                            {['All Statuses', 'Paid', 'Pending', 'Unpaid'].map(op => <option key={op} value={op}>{op}</option>)}
                        </select>
                    </div>
                    <div style={{ overflow: 'auto', flex: 1 }}>
                    <table style={{ tableLayout: 'fixed', minWidth: '100%', width: 'max-content', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 100%)', color: '#ffffff', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <ResizableTh initialWidth={40} style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', textAlign: 'center' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={filtered.length > 0 && selectedStudents.length === filtered.length}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedStudents(filtered.map((r: any) => r.studentId));
                                            else setSelectedStudents([]);
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </ResizableTh>
                                <ResizableTh initialWidth={50} style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', textAlign: 'center', color: '#ffffff' }}>#</ResizableTh>
                                <ResizableTh initialWidth={180} style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', textAlign: 'left' }}>Student</ResizableTh>
                                <ResizableTh initialWidth={90} style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', textAlign: 'left' }}>Class</ResizableTh>
                                <ResizableTh initialWidth={150} style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.95)', textAlign: 'left' }}>Father</ResizableTh>
                                <ResizableTh initialWidth={180} style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', textAlign: 'left' }}>Months</ResizableTh>
                                <ResizableTh initialWidth={110} style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', textAlign: 'left' }}>Total Fee</ResizableTh>
                                <ResizableTh initialWidth={110} style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', textAlign: 'left' }}>Paid</ResizableTh>
                                <ResizableTh initialWidth={110} style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', textAlign: 'left' }}>Pending</ResizableTh>
                                <ResizableTh initialWidth={130} style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', textAlign: 'left' }}>Total Status</ResizableTh>
                                <ResizableTh initialWidth={140} style={{ padding: '7px 10px', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.15)', color: '#ffffff' }}>Actions</ResizableTh>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? <tr><td colSpan={10} className="empty">No records found</td></tr>
                                : filtered.map((r: FeeRecord, i: any) => {
                                    return (
                                        <tr key={r.studentId} onClick={() => openEdit(r)} style={{ cursor: 'pointer' }}>
                                            <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedStudents.includes(r.studentId)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedStudents([...selectedStudents, r.studentId]);
                                                        else setSelectedStudents(selectedStudents.filter(id => id !== r.studentId));
                                                    }}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            </td>
                                            <td style={{ color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i + 1}</td>
                                            <td style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.studentName}</td>
                                            <td style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.grade || '—'}</td>
                                            <td style={{ color: 'var(--text2)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.fatherName || '—'}</td>
                                            <td style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {r.months && r.months.length > 0 ? (
                                                    r.months.length <= 2 ? r.months.join(', ') : (
                                                        <>
                                                            {r.months.slice(0, 2).join(', ')} 
                                                            <span style={{ marginLeft: 4, padding: '2px 6px', background: 'var(--primary)', color: '#fff', borderRadius: 10, fontSize: 9, fontWeight: 700 }}>+{r.months.length - 2}</span>
                                                        </>
                                                    )
                                                ) : 'Not set'}
                                            </td>
                                            <td style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>PKR {r.totalFee.toLocaleString()}</td>
                                            <td style={{ color: '#10b981', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>PKR {r.paidAmount.toLocaleString()}</td>
                                            <td style={{ color: r.pendingAmount > 0 ? '#ef4444' : 'var(--text2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>PKR {r.pendingAmount.toLocaleString()}</td>
                                            <td style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}><span className={`badge ${statusClass(r.status)}`}><span className="badge-dot" />  {r.status}</span></td>
                                            <td style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); openEdit(r); }}>Edit</button>
                                                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); setShowHistory(r); }}>History</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                        </tbody>
                    </table>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editRecord && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditRecord(null)}>
                    <div className="modal" style={{ maxWidth: 540 }}>
                        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '16px 16px 0 0' }}>
                            <div>
                                <div className="modal-title" style={{ color: '#fff' }}>Edit Fee Record</div>
                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{editRecord.studentName}</div>
                            </div>
                            <button className="modal-close" style={{ color: '#fff' }} onClick={() => setEditRecord(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {/* Student info (read-only) */}
                            <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                {[['Father', editRecord.fatherName || '—'], ['Class', editRecord.grade || '—'], ['Roll No', editRecord.rollno || '—']].map(([l, v]) => (
                                    <div key={l}>
                                        <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
                                    </div>
                                ))}
                            </div>
                            {/* Horizontal scroll month picker on top */}
                            <div className="form-group" style={{ marginTop: 14, marginBottom: 10 }}>
                                <label className="form-label" style={{ marginBottom: 6, fontWeight: 700, fontSize: 12, display: 'block', color: 'var(--text)' }}>
                                    Select Billing Months ({feeMonths.length} selected)
                                </label>
                                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}>
                                    {MONTH_OPTIONS.map(m => {
                                        const isSelected = feeMonths.includes(m);
                                        return (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => toggleMonth(m)}
                                                style={{
                                                    flexShrink: 0,
                                                    padding: '6px 12px',
                                                    borderRadius: 8,
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    border: isSelected ? '1.5px solid #10b981' : '1px solid var(--border)',
                                                    background: isSelected ? 'rgba(16,185,129,0.15)' : 'var(--bg3)',
                                                    color: isSelected ? '#10b981' : 'var(--text2)',
                                                    outline: 'none',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {m}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Monthly Fee breakdown rows */}
                            <div style={{ marginTop: 14, marginBottom: 14 }}>
                                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 8, color: 'var(--text)' }}>
                                    Monthly Fee Breakdown
                                </label>
                                {feeMonths.length === 0 ? (
                                    <div style={{ padding: 12, textAlign: 'center', color: 'var(--text2)', background: 'var(--bg3)', borderRadius: 10, fontSize: 13, border: '1px dashed var(--border)' }}>
                                        Please select at least one month above to display its rows.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '220px', overflowY: 'auto', paddingRight: 4 }}>
                                        {feeMonths.map(m => (
                                            <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1.2, gap: 4 }}>
                                                    <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{m}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setMonthlyFees(prev => ({
                                                                ...prev,
                                                                [m]: { ...prev[m], paid: prev[m]?.total || 0 }
                                                            }));
                                                        }}
                                                        style={{ alignSelf: 'flex-start', padding: '2px 8px', fontSize: 10, fontWeight: 700, border: '1px solid #10b981', background: 'rgba(16,185,129,0.06)', color: '#10b981', borderRadius: 4, cursor: 'pointer', outline: 'none' }}
                                                    >
                                                        ✓ Pay Full
                                                    </button>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', width: 120 }}>
                                                    <span style={{ fontSize: 9, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 2 }}>Total Fee</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px' }}>
                                                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text2)', marginRight: 4 }}>PKR</span>
                                                        <input
                                                            type="number"
                                                            value={monthlyFees[m]?.total || 0}
                                                            onChange={e => {
                                                                const val = parseInt(e.target.value) || 0;
                                                                setMonthlyFees(prev => {
                                                                    const currentPaid = prev[m]?.paid || 0;
                                                                    const cappedPaid = currentPaid > val ? val : currentPaid;
                                                                    return {
                                                                        ...prev,
                                                                        [m]: { total: val, paid: cappedPaid }
                                                                    };
                                                                });
                                                            }}
                                                            style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: 'var(--text)', fontWeight: 600 }}
                                                        />
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', width: 120 }}>
                                                    <span style={{ fontSize: 9, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 2 }}>Paid Amount</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px' }}>
                                                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text2)', marginRight: 4 }}>PKR</span>
                                                        <input
                                                            type="number"
                                                            value={monthlyFees[m]?.paid || 0}
                                                            onChange={e => {
                                                                const val = parseInt(e.target.value) || 0;
                                                                const total = monthlyFees[m]?.total || 0;
                                                                let newTotal = total;
                                                                let newPaid = val;
                                                                if (total === 0 && val > 0) {
                                                                    newTotal = val;
                                                                } else if (val > total) {
                                                                    newPaid = total;
                                                                }
                                                                setMonthlyFees(prev => ({
                                                                    ...prev,
                                                                    [m]: { ...prev[m], total: newTotal, paid: newPaid }
                                                                }));
                                                            }}
                                                            style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: 'var(--text)', fontWeight: 600 }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Live summary */}
                            <div style={{ background: (calculatedTotalFee > 0 && pending <= 0) ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${(calculatedTotalFee > 0 && pending <= 0) ? '#10b981' : '#ef4444'}33`, borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontWeight: 700, color: (calculatedTotalFee > 0 && pending <= 0) ? '#10b981' : '#ef4444' }}>{(calculatedTotalFee > 0 && pending <= 0) ? '✅ Fully Paid' : '⏳ Payment Due'}</span>
                                <span style={{ fontSize: 14, fontWeight: 800, color: (calculatedTotalFee > 0 && pending <= 0) ? '#10b981' : '#ef4444' }}>PKR {Math.abs(pending).toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setEditRecord(null)}>Cancel</button>
                            <button className="btn btn-primary" style={{ background: '#10b981' }} disabled={saving} onClick={save}>{saving ? 'Saving...' : '✓ Save Changes'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Global History Modal */}
            {showGlobalHistory && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowGlobalHistory(false)}>
                    <div className="modal" style={{ maxWidth: 640 }}>
                        <div className="modal-header" style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <div className="modal-title" style={{ color: 'var(--text)' }}>Global Payment History</div>
                                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>All recent transactions across students</div>
                            </div>
                            <button className="modal-close" onClick={() => setShowGlobalHistory(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                            <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                                    Overall Global Budget
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                                    <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid #818cf833', padding: 12, borderRadius: 8 }}>
                                        <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 4 }}>Expected Revenue</div>
                                        <div style={{ fontWeight: 800, fontSize: 16, color: '#818cf8' }}>PKR {globalStats.expected.toLocaleString()}</div>
                                    </div>
                                    <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid #10b98133', padding: 12, borderRadius: 8 }}>
                                        <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 4 }}>Total Collected</div>
                                        <div style={{ fontWeight: 800, fontSize: 16, color: '#10b981' }}>PKR {globalStats.collected.toLocaleString()}</div>
                                    </div>
                                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid #ef444433', padding: 12, borderRadius: 8 }}>
                                        <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 4 }}>Total Pending</div>
                                        <div style={{ fontWeight: 800, fontSize: 16, color: '#ef4444' }}>PKR {globalStats.pending.toLocaleString()}</div>
                                    </div>
                                </div>

                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Student Deficit Breakdown</div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 11, background: 'var(--bg2)', padding: '4px 10px', borderRadius: 20, color: 'var(--text)' }}>
                                        <span style={{ color: '#818cf8', fontWeight: 800 }}>{records.length}</span> Students
                                    </span>
                                    <span style={{ fontSize: 11, background: 'var(--bg2)', padding: '4px 10px', borderRadius: 20, color: 'var(--text)' }}>
                                        <span style={{ color: '#10b981', fontWeight: 800 }}>{paidCount}</span> Paid
                                    </span>
                                    <span style={{ fontSize: 11, background: 'var(--bg2)', padding: '4px 10px', borderRadius: 20, color: 'var(--text)' }}>
                                        <span style={{ color: '#f59e0b', fontWeight: 800 }}>{partialCount}</span> Partial
                                    </span>
                                    <span style={{ fontSize: 11, background: 'var(--bg2)', padding: '4px 10px', borderRadius: 20, color: 'var(--text)' }}>
                                        <span style={{ color: '#ef4444', fontWeight: 800 }}>{pendingCount}</span> Pending
                                    </span>
                                </div>
                            </div>

                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Recent Transactions Log</div>
                            {allHistory.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text2)', fontSize: 14 }}>
                                    <span style={{ fontSize: 32, display: 'block', marginBottom: 10 }}>📭</span>
                                    No payment history mapped since tracking feature was added.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {allHistory.map((hist) => {
                                        const isNegative = hist.amountPaid < 0;
                                        return (
                                            <div key={hist.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                        <span style={{ fontWeight: 600, fontSize: 15, color: isNegative ? '#ef4444' : '#10b981' }}>
                                                            {isNegative ? '-' : '+'} PKR {Math.abs(hist.amountPaid).toLocaleString()}
                                                        </span>
                                                        {hist.type === 'adjustment' && (
                                                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#ef4444', textTransform: 'uppercase' }}>
                                                                Adjustment
                                                            </span>
                                                        )}
                                                        <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                                                            {hist.studentName} ({hist.grade || '—'})
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                                                        {new Date(hist.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                                                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>Assigned to months:</span> {hist.months?.join(', ') || 'None'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistory && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowHistory(null)}>
                    <div className="modal print-modal" style={{ maxWidth: 540 }}>
                        <div className="modal-header" style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <div className="modal-title" style={{ color: 'var(--text)' }}>{invoiceNumber ? `Invoice #${invoiceNumber}` : 'Payment History'}</div>
                                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Student: {showHistory.studentName}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <button className="btn btn-ghost no-print" style={{ padding: '4px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => window.print()}>
                                    <span>🖨️</span> Print
                                </button>
                                <button className="modal-close no-print" onClick={() => setShowHistory(null)}>✕</button>
                            </div>
                        </div>
                        <div className="modal-body no-print" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            {/* Overall Base Summary */}
                            <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                                    Overall Ledger Summary
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase' }}>Total Fee</div>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>PKR {showHistory.totalFee.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase' }}>Total Paid</div>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: '#10b981' }}>PKR {showHistory.paidAmount.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase' }}>Current Pending</div>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: showHistory.pendingAmount > 0 ? '#ef4444' : 'var(--text)' }}>PKR {showHistory.pendingAmount.toLocaleString()}</div>
                                    </div>
                                </div>
                                <div style={{ marginTop: 12 }}>
                                    <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', marginBottom: 4 }}>Months</div>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {(!showHistory.months || showHistory.months.length === 0) ? (
                                            <span style={{ fontSize: 12, color: 'var(--text2)' }}>No months assigned</span>
                                        ) : (
                                            showHistory.months.map((m: string) => (
                                                <span key={m} style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                                    {m}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Recent Transactions</div>
                            {(!showHistory.history || showHistory.history.length === 0) ? (
                                <div style={{ textAlign: 'center', padding: '24px 20px', color: 'var(--text2)', fontSize: 13, background: 'var(--bg3)', borderRadius: 10, border: '1px dashed var(--border)' }}>
                                    No new incremental payment transactions mapped since tracking began. The total paid reflects legacy entry.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {showHistory.history.map((hist) => {
                                        const isNegative = hist.amountPaid < 0;
                                        return (
                                            <div key={hist.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 15, color: isNegative ? '#ef4444' : '#10b981' }}>
                                                        {isNegative ? '-' : '+'} PKR {Math.abs(hist.amountPaid).toLocaleString()}
                                                        {hist.type === 'adjustment' && (
                                                            <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 6, padding: '1px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#ef4444', textTransform: 'uppercase' }}>
                                                                Adjustment
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                                                        {new Date(hist.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                                                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>Assigned to months:</span> {hist.months?.join(', ') || 'None'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Print-only Professional Fee Slip */}
                        <div className="print-only" style={{ padding: 0, backgroundColor: '#fff', width: '100%', height: '98vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                            <style>{`
                                @media print { 
                                    @page { size: A4 portrait; margin: 0; } 
                                    body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; height: 100vh; overflow: hidden; }
                                    .modal-overlay { align-items: flex-start; padding: 0; background: transparent; position: absolute !important; left: 0; top: 0; width: 100%; height: 100vh !important; overflow: hidden !important; }
                                    .modal { max-height: none !important; overflow: visible !important; border: none !important; box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
                                    ::-webkit-scrollbar { display: none !important; }
                                }
                            `}</style>
                            <div style={{ backgroundColor: '#fff', color: '#1f2937', fontFamily: "'Inter', system-ui, sans-serif", width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                {['Office Copy', 'Student Copy'].map((copyType, index) => (
                                    <div key={copyType} style={{ padding: '16px 24px', flex: 1, boxSizing: 'border-box', borderBottom: index === 0 ? '2px dashed #cbd5e1' : 'none', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                                            <h2 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', margin: 0, letterSpacing: '1px', color: '#1e3a8a' }}>Official Student Fee Report</h2>
                                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', border: '1px solid #1e3a8a', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', marginTop: '6px' }}>{copyType}</div>
                                        </div>
                                        {/* Header Section */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e3a8a', paddingBottom: '8px', marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <img src="/logo.png" alt="Logo" style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '6px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} onError={(e) => { e.currentTarget.style.display = 'none'; if (e.currentTarget.parentElement) { e.currentTarget.parentElement.innerText = 'TSA'; } }} />
                                                <div>
                                                    <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 800, color: '#1e3a8a', letterSpacing: '-0.5px', lineHeight: 1.1 }}>THE SEEKS ACADEMY</h1>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                        <p style={{ fontSize: '10px', margin: 0, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>FORT ABBAS</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#111827' }}>{invoiceNumber}</div>
                                                    <div style={{ padding: '2px 6px', background: showHistory.pendingAmount <= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: showHistory.pendingAmount <= 0 ? '#059669' : '#dc2626', borderRadius: '3px', fontSize: '9px', fontWeight: 800, border: `1px solid ${showHistory.pendingAmount <= 0 ? '#10b981' : '#ef4444'}`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                                        {showHistory.pendingAmount <= 0 ? 'PAID IN FULL' : 'PAYMENT DUE'}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '9px', fontWeight: 700, color: '#4b5563' }}>Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                            </div>
                                        </div>

                                        {/* Student Details Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                            <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                                <h3 style={{ margin: '0 0 6px 0', fontSize: '9px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>Student Information</h3>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: '#475569', fontSize: '10px' }}>Name:</span>
                                                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '10px' }}>{showHistory.studentName}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: '#475569', fontSize: '10px' }}>Roll No:</span>
                                                        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '10px' }}>{showHistory.rollno || '—'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: '#475569', fontSize: '10px' }}>Father's Name:</span>
                                                        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '10px' }}>{showHistory.fatherName || '—'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                                <h3 style={{ margin: '0 0 6px 0', fontSize: '9px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>Enrollment Details</h3>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: '#475569', fontSize: '10px' }}>Class:</span>
                                                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '10px' }}>{showHistory.grade || '—'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: '#475569', fontSize: '10px' }}>Status:</span>
                                                        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '10px', textTransform: 'capitalize' }}>{showHistory.status}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: '#475569', fontSize: '10px' }}>Total Months:</span>
                                                        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '10px' }}>{showHistory.months?.length || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Consolidated Fee Table */}
                                        <div style={{ borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                                                <thead style={{ background: '#1e3a8a', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                                    <tr>
                                                        <th style={{ padding: '4px 10px', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px', color: '#ffffff' }}>Month / Description</th>
                                                        <th style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 600, textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px', color: '#ffffff' }}>Total Fee (PKR)</th>
                                                        <th style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 600, textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px', color: '#ffffff' }}>Paid (PKR)</th>
                                                        <th style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 600, textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px', color: '#ffffff' }}>Due (PKR)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {/* Monthly Breakdown Rows */}
                                                    {showHistory.monthlyFees && Object.keys(showHistory.monthlyFees).length > 0 ? (
                                                        Object.keys(showHistory.monthlyFees).sort((a, b) => {
                                                            const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
                                                            const aIdx = months.findIndex(m => a.toLowerCase().includes(m));
                                                            const bIdx = months.findIndex(m => b.toLowerCase().includes(m));
                                                            return aIdx - bIdx;
                                                        }).map((m) => {
                                                            const mData = showHistory.monthlyFees![m];
                                                            const mPending = mData.total - mData.paid;
                                                            return (
                                                                <tr key={m} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                                    <td style={{ padding: '2px 10px', color: '#1f2937', fontWeight: 600 }}>{m}</td>
                                                                    <td style={{ padding: '2px 10px', textAlign: 'right', color: '#4b5563' }}>{mData.total.toLocaleString()}</td>
                                                                    <td style={{ padding: '2px 10px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>{mData.paid.toLocaleString()}</td>
                                                                    <td style={{ padding: '2px 10px', textAlign: 'right', color: mPending > 0 ? '#dc2626' : '#4b5563', fontWeight: mPending > 0 ? 700 : 500 }}>{mPending.toLocaleString()}</td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                            <td style={{ padding: '2px 10px', color: '#1f2937', fontStyle: 'italic' }}>No specific monthly breakdown mapped.</td>
                                                            <td style={{ padding: '2px 10px', textAlign: 'right', color: '#4b5563' }}>—</td>
                                                            <td style={{ padding: '2px 10px', textAlign: 'right', color: '#4b5563' }}>—</td>
                                                            <td style={{ padding: '2px 10px', textAlign: 'right', color: '#4b5563' }}>—</td>
                                                        </tr>
                                                    )}

                                                    {/* Totals Section */}
                                                    <tr style={{ background: '#f8fafc', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', borderTop: '2px solid #1e3a8a' }}>
                                                        <td style={{ padding: '8px 10px', color: '#1e3a8a', fontWeight: 800, textTransform: 'uppercase', fontSize: '11px' }}>Grand Total</td>
                                                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#1f2937', fontWeight: 800, fontSize: '11px' }}>{showHistory.totalFee.toLocaleString()}</td>
                                                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#059669', fontWeight: 800, fontSize: '11px' }}>{showHistory.paidAmount.toLocaleString()}</td>
                                                        <td style={{ padding: '8px 10px', textAlign: 'right', color: showHistory.pendingAmount > 0 ? '#dc2626' : '#1f2937', fontWeight: 800, fontSize: '12px' }}>{showHistory.pendingAmount.toLocaleString()}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        <div style={{ flex: 1 }}></div>

                                        {/* Signatures */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', paddingBottom: '12px' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ borderBottom: '1px solid #94a3b8', width: '120px', marginBottom: '4px' }}></div>
                                                <div style={{ fontSize: '9px', fontWeight: 600, color: '#475569' }}>Admin Signature</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ borderBottom: '1px solid #94a3b8', width: '120px', marginBottom: '4px' }}></div>
                                                <div style={{ fontSize: '9px', fontWeight: 600, color: '#475569' }}>Official Stamp</div>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '9px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                                            The Seeks Academy Fortabbas • Phone: +92 348 7000302 • System Generated Fee Slip
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>                   </div>
                </div>
            )}
        </div>
    );
}
