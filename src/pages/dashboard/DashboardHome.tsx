import React, { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchStudents } from '../../store/slices/studentsSlice';
import { fetchTeachers } from '../../store/slices/teachersSlice';
import { fetchExams } from '../../store/slices/examsSlice';
import { fetchFees } from '../../store/slices/feesSlice';
import { fetchComplaints, fetchNotices, fetchVideos } from '../../store/slices/generalSlice';
import { fetchDefaultFees } from '../../store/slices/appSettingsSlice';
import { fetchAssignments } from '../../store/slices/assignmentsSlice';

import { Icons } from './DashboardIcons';
import DashboardHeader from './DashboardHeader';
import DashboardKPIs, { KPICard } from './DashboardKPIs';
import DashboardHero from './DashboardHero';
import DashboardFeeCards, { FeeCard } from './DashboardFeeCards';
import DashboardLeftColumn from './DashboardLeftColumn';
import DashboardRightColumn from './DashboardRightColumn';
import DashboardToppers from './DashboardToppers';

export default function DashboardHome() {
    const dispatch = useAppDispatch();
    const [cardsFilter, setCardsFilter] = useState<'Weekly' | 'Monthly' | 'Yearly'>('Weekly');
    const [graphFilter, setGraphFilter] = useState<'Weekly' | 'Monthly' | 'Yearly'>('Yearly');
    const [topperTestFilter, setTopperTestFilter] = useState<string>('All');
    
    // Selectors
    const { data: students, status: studentsStatus } = useAppSelector((s: any) => s.students);
    const { data: teachers, status: teachersStatus } = useAppSelector((s: any) => s.teachers);
    const { data: exams, status: examsStatus } = useAppSelector((s: any) => s.exams);
    const { data: fees, status: feesStatus } = useAppSelector((s: any) => s.fees);
    const { complaints, notices, videos, complaintsStatus, noticesStatus, videosStatus } = useAppSelector((s: any) => s.general);
    const { data: assignments, status: assignmentsStatus } = useAppSelector((s: any) => s.assignments);
    const { data: diaries, status: diariesStatus } = useAppSelector((s: any) => s.diaries);
    const { defaultFees, defaultFeesStatus } = useAppSelector((s: any) => s.appSettings);
    const globalSearchQuery = useAppSelector((s: any) => s.general.globalSearchQuery)?.toLowerCase() || '';
    
    // Fetch on mount if idle
    useEffect(() => {
        if (studentsStatus === 'idle') dispatch(fetchStudents());
        if (teachersStatus === 'idle') dispatch(fetchTeachers());
        if (examsStatus === 'idle') dispatch(fetchExams());
        if (feesStatus === 'idle') dispatch(fetchFees());
        if (videosStatus === 'idle') dispatch(fetchVideos());
        if (complaintsStatus === 'idle') dispatch(fetchComplaints());
        if (noticesStatus === 'idle') dispatch(fetchNotices());
        if (assignmentsStatus === 'idle') dispatch(fetchAssignments() as any);
        // diaries is now handled globally via initDiariesListener in App.tsx
        if (defaultFeesStatus === 'idle') dispatch(fetchDefaultFees());
    }, [dispatch, studentsStatus, teachersStatus, examsStatus, feesStatus, videosStatus, complaintsStatus, noticesStatus, assignmentsStatus, diariesStatus, defaultFeesStatus]);

    // Enriched Complaints
    const enrichedComplaints = useMemo(() => {
        const enriched = complaints.map((c: any) => {
            const student = students.find((s: any) => (s.email && s.email.toLowerCase() === c.userEmail?.toLowerCase()) || (s.uid && s.uid === c.userId));
            return {
                ...c,
                displayUser: student?.name || c.userName,
                displayClass: student?.grade || 'N/A',
                displayRollNo: student?.rollno || 'N/A'
            };
        });
        return enriched.sort((a: any, b: any) => {
            const getT = (x: any) => x.createdAt?.seconds !== undefined ? x.createdAt.seconds * 1000 : (typeof x.createdAt === 'number' ? x.createdAt : 0);
            return getT(b) - getT(a);
        });
    }, [complaints, students]);

    // Computed Stats
    const studentCount = students.length;
    const teacherCount = teachers.length;
    const examCount = exams.length;
    const noticeCount = notices.length;
    const galleryCount = videos.length;
    const assignmentCount = assignments?.length || 0;
    
    const todayStr = new Date().toDateString();
    const todayDiaries = diaries.filter((d: any) => {
        let date = new Date();
        if (d.createdAt) date = new Date(typeof d.createdAt === 'number' ? d.createdAt : d.createdAt.seconds * 1000 || d.createdAt);
        else if (d.date) date = new Date(d.date);
        return date.toDateString() === todayStr;
    });
    const diaryCount = todayDiaries.length;
    
    const pendingComplaints = complaints.filter((c: any) => c.status === 'Pending').length;

    const loading = studentsStatus === 'loading' || teachersStatus === 'loading' || feesStatus === 'loading' || defaultFeesStatus === 'loading';

    // Recent Students computed from Redux
    const recent = useMemo(() => {
        const sorted = [...students].sort((a, b) => {
            const getT = (x: any) => {
                if (!x.createdAt) return 0;
                if (x.createdAt.seconds !== undefined) return x.createdAt.seconds * 1000;
                if (typeof x.createdAt === 'number') return x.createdAt;
                if (typeof x.createdAt === 'string') return new Date(x.createdAt).getTime();
                return 0;
            };
            return getT(b) - getT(a);
        });
        return sorted.slice(0, 8).map(s => ({
            id: s.id,
            name: s.name,
            fatherName: s.fatherName || s.fname || s.fathername || '—',
            cls: s.grade || s.class || '—',
            rollno: s.rollno || '—',
            createdAt: s.createdAt,
            status: s.status || 'Approved'
        }));
    }, [students]);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
    const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Fee computations
    const feeRecords = useMemo(() => {
        const feesMap: Record<string, any> = {};
        fees.forEach((d: any) => { feesMap[d.id] = d; });

        return students.map((s: any) => {
            const fee = feesMap[s.id];
            const grade = s.grade || s.class || '';
            const defaultFee = defaultFees[grade] || 0;
            
            if (fee) {
                const total = fee.totalFee || defaultFee;
                const paid = fee.paidAmount || 0;
                const pending = total - paid;
                return { 
                    ...fee,
                    class: grade,
                    totalFee: total, 
                    paidAmount: paid, 
                    pendingAmount: pending > 0 ? pending : 0, 
                };
            }
            return { 
                class: grade,
                totalFee: defaultFee, 
                paidAmount: 0, 
                pendingAmount: defaultFee, 
            };
        });
    }, [students, fees, defaultFees]);

    const feePendingCount = feeRecords.filter((r: any) => r.pendingAmount > 0).length;
    const totalReceived = feeRecords.reduce((sum: number, r: any) => sum + (r.paidAmount || 0), 0);
    const totalFeeAmount = feeRecords.reduce((sum: number, r: any) => sum + (r.totalFee || 0), 0);
    const totalPendingAmount = feeRecords.reduce((sum: number, r: any) => sum + (r.pendingAmount || 0), 0);

    const feeByClassData = useMemo(() => {
        const classMap: Record<string, { name: string, paid: number, unpaid: number }> = {};
        feeRecords.forEach((r: any) => {
            const cls = r.class || 'Unknown';
            if (!cls || cls === 'Unknown') return; // Skip unknown
            
            if (!classMap[cls]) classMap[cls] = { name: cls, paid: 0, unpaid: 0 };
            
            if (r.pendingAmount > 0) {
                classMap[cls].unpaid += 1;
            } else {
                classMap[cls].paid += 1;
            }
        });

        const order: Record<string, number> = {
            '8th': 1, '8': 1, '8th class': 1,
            '9th': 2, '9': 2, '9th class': 2,
            '10th': 3, '10': 3, '10th class': 3,
            '1st year': 4, '11th': 4, '11': 4,
            '2nd year': 5, '12th': 5, '12': 5
        };
        const getVal = (val: string) => order[val.toLowerCase()] || 99;
        
        return Object.values(classMap).sort((a, b) => getVal(a.name) - getVal(b.name));
    }, [feeRecords]);

    const today = new Date();
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0,0,0,0);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0,0,0,0);

    const startOfYear = new Date(today.getFullYear(), 0, 1);
    startOfYear.setHours(0,0,0,0);
    
    const filteredReceived = fees.reduce((sum: number, f: any) => {
        let dailySum = 0;
        if (f.history && f.history.length > 0) {
            f.history.forEach((h: any) => {
                try {
                    const date = new Date(h.date);
                    if (cardsFilter === 'Weekly' && date >= startOfWeek) {
                        dailySum += Number(h.amountPaid || 0);
                    } else if (cardsFilter === 'Monthly' && date >= startOfMonth) {
                        dailySum += Number(h.amountPaid || 0);
                    } else if (cardsFilter === 'Yearly' && date >= startOfYear) {
                        dailySum += Number(h.amountPaid || 0);
                    }
                } catch { /* skip */ }
            });
        } else if (f.datePaid) {
            try {
                const date = new Date(f.datePaid);
                if (cardsFilter === 'Weekly' && date >= startOfWeek) {
                    dailySum += Number(f.paidAmount || (f.status === 'Paid' ? (f.totalFee || f.amount) : 0) || 0);
                } else if (cardsFilter === 'Monthly' && date >= startOfMonth) {
                    dailySum += Number(f.paidAmount || (f.status === 'Paid' ? (f.totalFee || f.amount) : 0) || 0);
                } else if (cardsFilter === 'Yearly' && date >= startOfYear) {
                    dailySum += Number(f.paidAmount || (f.status === 'Paid' ? (f.totalFee || f.amount) : 0) || 0);
                }
            } catch { /* skip */ }
        }
        return sum + dailySum;
    }, 0);

    const fmtRs = (n: number) => n >= 1000 ? `Rs ${(n / 1000).toFixed(1)}k` : `Rs ${n}`;

    const overallResults = useMemo(() => {
        const classMap: Record<string, { name: string, pass: number, fail: number }> = {};
        exams.forEach((e: any) => {
            const cls = e.studentClass || 'Unknown';
            if (!cls || cls === 'Unknown') return;
            
            if (!classMap[cls]) classMap[cls] = { name: cls, pass: 0, fail: 0 };
            
            if (e.status === 'Pass') classMap[cls].pass++;
            else if (e.status === 'Fail') classMap[cls].fail++;
        });

        const order: Record<string, number> = {
            '8th': 1, '8': 1, '8th class': 1,
            '9th': 2, '9': 2, '9th class': 2,
            '10th': 3, '10': 3, '10th class': 3,
            '1st year': 4, '11th': 4, '11': 4,
            '2nd year': 5, '12th': 5, '12': 5
        };
        const getVal = (val: string) => order[val.toLowerCase()] || 99;
        
        return Object.values(classMap).sort((a, b) => getVal(a.name) - getVal(b.name));
    }, [exams]);

    const uniqueTests = useMemo(() => {
        const tests = new Set<string>();
        exams.forEach((e: any) => {
            if (e.category === 'Monthly' && e.title) {
                tests.add(e.title);
            }
        });
        return Array.from(tests).sort();
    }, [exams]);

    const classToppers = useMemo(() => {
        const studentMap = new Map<string, any>();
        exams.forEach((e: any) => {
            if (e.category !== 'Monthly') return; // Only process Monthly tests for this section

            const testName = e.title || '';
            if (topperTestFilter !== 'All' && testName !== topperTestFilter) return;

            if (!e.rollNo) return;
            const key = e.rollNo + '|' + (e.studentClass || '');
            if (!studentMap.has(key)) {
                studentMap.set(key, { 
                    rollNo: e.rollNo, 
                    name: e.studentName || 'Unknown', 
                    cls: e.studentClass || 'N/A',
                    obtained: 0,
                    total: 0 
                });
            }
            const s = studentMap.get(key);
            s.obtained += parseFloat(e.obtainedMarks || '0') || 0;
            s.total += parseFloat(e.totalMarks || '0') || 0;
        });

        const classGroups: Record<string, any[]> = {};
        Array.from(studentMap.values()).forEach(s => {
            if (!classGroups[s.cls]) classGroups[s.cls] = [];
            classGroups[s.cls].push(s);
        });

        const topByClass: Record<string, any[]> = {};
        Object.keys(classGroups).forEach(cls => {
            topByClass[cls] = classGroups[cls]
                .filter(s => s.obtained > 0)
                .sort((a, b) => b.obtained - a.obtained)
                .slice(0, 3);
        });
        return topByClass;
    }, [exams, topperTestFilter]);

    // Filtering based on globalSearchQuery
    const filteredRecent = recent.filter(s => 
        !globalSearchQuery || 
        s.name.toLowerCase().includes(globalSearchQuery) || 
        s.rollno.toLowerCase().includes(globalSearchQuery) || 
        s.cls.toLowerCase().includes(globalSearchQuery)
    );

    const filteredNotices = notices.filter((n: any) => 
        !globalSearchQuery || 
        (n.title && n.title.toLowerCase().includes(globalSearchQuery)) || 
        (n.content && n.content.toLowerCase().includes(globalSearchQuery)) ||
        (n.category && n.category.toLowerCase().includes(globalSearchQuery))
    );

    const filteredComplaints = enrichedComplaints.filter((c: any) => 
        !globalSearchQuery || 
        (c.displayUser && c.displayUser.toLowerCase().includes(globalSearchQuery)) || 
        (c.category && c.category.toLowerCase().includes(globalSearchQuery)) ||
        (c.displayClass && c.displayClass.toLowerCase().includes(globalSearchQuery)) ||
        (c.status && c.status.toLowerCase().includes(globalSearchQuery))
    );

    const kpiCards: KPICard[] = [
        { label: 'Students', value: studentCount, icon: Icons.students, gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', link: '/students' },
        { label: 'Faculty', value: teacherCount, icon: Icons.faculty, gradient: 'linear-gradient(135deg, #10b981, #059669)', link: '/teachers' },
        { label: 'Exams', value: examCount, icon: Icons.exams, gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', link: '/exams' },
        { label: 'E-Library', value: noticeCount, icon: Icons.notices, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', link: '/library' },
        { label: 'Daily Diary', value: diaryCount, icon: Icons.diary, gradient: 'linear-gradient(135deg, #ec4899, #be185d)', link: '/diary' },
        { label: 'Pending Fees', value: feePendingCount, icon: Icons.money, gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', link: '/fees' },
        { label: 'Complaints', value: pendingComplaints, icon: Icons.message, gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)', link: '/complaints' },
    ];

    // Fee card config
    const feeCards: FeeCard[] = [
        { label: 'Total Received', value: fmtRs(totalReceived), sub: 'All time collected', accent: '#10b981' },
        { label: 'Pending Dues', value: fmtRs(totalPendingAmount), sub: 'Unpaid amounts', accent: '#ef4444' },
        { label: cardsFilter === 'Weekly' ? 'Weekly Received' : cardsFilter === 'Monthly' ? 'Monthly Received' : 'Yearly Received', value: fmtRs(filteredReceived), sub: cardsFilter === 'Weekly' ? 'Collected this week' : cardsFilter === 'Monthly' ? 'Collected this month' : 'Collected this year', accent: '#3b82f6' },
        { label: 'Total Fee Amount', value: fmtRs(totalFeeAmount), sub: 'Expected revenue', accent: '#8b5cf6' },
    ];

    return (
        <div className="page" style={{ maxWidth: 1600, padding: '16px 24px', paddingBottom: '120px', background: 'var(--bg)', minHeight: '100vh' }}>
            <DashboardHeader todayLabel={todayLabel} greeting={greeting} />

            {loading ? (
                <div className="loading"><div className="spinner" />Loading live data...</div>
            ) : (
                <>
                    <DashboardKPIs kpiCards={kpiCards} />
                    <DashboardHero />
                    <DashboardToppers 
                        classToppers={classToppers} 
                        uniqueTests={uniqueTests}
                        filter={topperTestFilter}
                        setFilter={setTopperTestFilter}
                    />
                    <DashboardFeeCards feeCards={feeCards} filter={cardsFilter} setFilter={setCardsFilter} overallResults={overallResults} feeByClassData={feeByClassData} />

                    <div className="responsive-main-sidebar" style={{ alignItems: 'start' }}>
                        <DashboardLeftColumn 
                            globalSearchQuery={globalSearchQuery} 
                            filteredRecent={filteredRecent} 
                        />
                        <DashboardRightColumn 
                            filteredNotices={filteredNotices} 
                            filteredComplaints={filteredComplaints} 
                            assignmentCount={assignmentCount} 
                            galleryCount={galleryCount}
                            todayDiaries={todayDiaries}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
