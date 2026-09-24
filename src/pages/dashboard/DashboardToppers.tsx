import React from 'react';

interface DashboardToppersProps {
    classToppers: Record<string, any[]>;
    uniqueTests: string[];
    filter: string;
    setFilter: (f: string) => void;
}

export default function DashboardToppers({ classToppers, uniqueTests, filter, setFilter }: DashboardToppersProps) {
    if (!classToppers) return null;

    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                        🏆
                    </div>
                    <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text)', fontWeight: 700 }}>Class Toppers</h3>
                </div>
                
                {uniqueTests.length > 0 && (
                    <select 
                        value={filter} 
                        onChange={(e) => setFilter(e.target.value)}
                        style={{ 
                            background: 'var(--bg)', 
                            padding: '4px 10px', 
                            borderRadius: 6, 
                            color: 'var(--text)', 
                            cursor: 'pointer', 
                            fontWeight: 600, 
                            fontSize: 11, 
                            border: '1px solid var(--border)', 
                            outline: 'none',
                            minWidth: 120
                        }}
                    >
                        <option value="All">All Monthly Tests</option>
                        {uniqueTests.map((t, i) => (
                            <option key={i} value={t}>{t}</option>
                        ))}
                    </select>
                )}
            </div>
            
            {Object.keys(classToppers).length === 0 ? (
                <div className="dash-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
                    No toppers found for the selected test.
                </div>
            ) : (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12
                }}>
                    {Object.keys(classToppers).sort((a, b) => {
                        const order: Record<string, number> = {
                            '8th': 1, '8': 1, '8th class': 1,
                            '9th': 2, '9': 2, '9th class': 2,
                            '10th': 3, '10': 3, '10th class': 3,
                            '1st year': 4, '11th': 4, '11': 4,
                            '2nd year': 5, '12th': 5, '12': 5
                        };
                        const getVal = (val: string) => order[val.toLowerCase()] || 99;
                        return getVal(a) - getVal(b);
                    }).map((cls, i) => {
                        const displayCls = cls.toLowerCase().includes('class') || cls.toLowerCase().includes('year') ? cls : `${cls} Class`;
                        return (
                            <div key={cls} className="dash-card dash-animate" style={{ 
                                padding: '14px 16px', 
                                animationDelay: `${0.1 + i * 0.05}s`
                            }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid var(--border)', paddingBottom: 8, textTransform: 'capitalize' }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /> 
                                    {displayCls}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {classToppers[cls].map((top, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
                                                <span style={{ fontWeight: 800, color: idx === 0 ? '#d97706' : idx === 1 ? '#94a3b8' : '#b45309', minWidth: 16 }}>
                                                    {idx + 1}.
                                                </span>
                                                <span style={{ fontWeight: 600 }}>{top.name}</span>
                                            </div>
                                            <div style={{ color: 'var(--text2)', fontWeight: 600 }}>
                                                {top.obtained} <span style={{ fontSize: 9 }}>/ {top.total}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
