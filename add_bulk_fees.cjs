const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'finance', 'FeePage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state
const target1 = `    const [monthFilter, setMonthFilter] = useState('All Months');`;
const replacement1 = `    const [monthFilter, setMonthFilter] = useState('All Months');
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);`;
if (content.includes(target1) && !content.includes('selectedStudents')) {
    content = content.replace(target1, replacement1);
}

// 2. Add handleBulkStatusChange
const target2 = `    const [weekDays, setWeekDays] = useState(getWeekDays(now));`;
const replacement2 = `    const [weekDays, setWeekDays] = useState(getWeekDays(now));

    const handleBulkStatusChange = async (newStatus: string) => {
        if (selectedStudents.length === 0) return;
        if (!confirm(\`Are you sure you want to change the status of \${selectedStudents.length} students to \${newStatus}?\`)) return;
        
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
                        const mTotal = newMonthlyFees[m]?.total || Math.round(rec.totalFee / rec.months.length);
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
`;
if (content.includes(target2) && !content.includes('handleBulkStatusChange')) {
    content = content.replace(target2, replacement2);
}

// 3. Modify Table Toolbar
const target3 = `                    <div className="table-toolbar" style={{ padding: '6px 12px', gap: 6, flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
                        <div className="search-box" style={{ flex: 1.5, background: 'var(--bg3)', margin: 0, height: 30, minHeight: 'unset' }}>`;
const replacement3 = `                    <div className="table-toolbar" style={{ padding: '6px 12px', gap: 6, flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
                        {selectedStudents.length > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1.5 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>{selectedStudents.length} Selected</span>
                                <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11, minHeight: 28 }} onClick={() => handleBulkStatusChange('paid')}>Mark Paid</button>
                                <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 11, minHeight: 28, borderColor: 'var(--error)', color: 'var(--error)' }} onClick={() => handleBulkStatusChange('pending')}>Mark Pending</button>
                                <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11, minHeight: 28 }} onClick={() => setSelectedStudents([])}>Cancel</button>
                            </div>
                        ) : (
                            <div className="search-box" style={{ flex: 1.5, background: 'var(--bg3)', margin: 0, height: 30, minHeight: 'unset' }}>`;
if (content.includes(target3) && !content.includes('Mark Paid')) {
    content = content.replace(target3, replacement3);
    // Also we need to close the ternary in the next lines. Let's do a targeted replace for the closing part
    content = content.replace(
        `<input placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: 'transparent', fontSize: 12 }} />
                        </div>
                        <select value={monthFilter}`,
        `<input placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: 'transparent', fontSize: 12 }} />
                            </div>
                        )}
                        <select value={monthFilter}`
    );
}

// 4. Modify thead
const target4 = `                        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 100%)', color: '#ffffff', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <ResizableTh initialWidth={50} style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', textAlign: 'center', color: '#ffffff' }}>#</ResizableTh>`;
const replacement4 = `                        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
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
                                <ResizableTh initialWidth={50} style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.15)', textAlign: 'center', color: '#ffffff' }}>#</ResizableTh>`;
if (content.includes(target4)) {
    content = content.replace(target4, replacement4);
}

// 5. Modify tbody
const target5 = `                                        <tr key={r.studentId} onClick={() => openEdit(r)} style={{ cursor: 'pointer' }}>
                                            <td style={{ color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i + 1}</td>`;
const replacement5 = `                                        <tr key={r.studentId} onClick={() => openEdit(r)} style={{ cursor: 'pointer' }}>
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
                                            <td style={{ color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i + 1}</td>`;
if (content.includes(target5)) {
    content = content.replace(target5, replacement5);
}

// Write the file back
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected bulk select features.');
