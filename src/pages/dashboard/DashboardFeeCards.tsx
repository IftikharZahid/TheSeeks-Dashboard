import React from 'react';
import { LineChart, Line, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export interface FeeCard {
    label: string;
    value: string;
    sub: string;
    accent: string;
}

interface DashboardFeeCardsProps {
    feeCards: FeeCard[];
    filter: 'Weekly' | 'Monthly' | 'Yearly';
    setFilter: (f: 'Weekly' | 'Monthly' | 'Yearly') => void;
    overallResults: { name: string; pass: number; fail: number }[];
    feeByClassData?: { name: string; paid: number; unpaid: number }[];
}

export default function DashboardFeeCards({ feeCards, filter, setFilter, overallResults, feeByClassData = [] }: DashboardFeeCardsProps) {
    const hasData = overallResults && overallResults.some((r) => r.pass > 0 || r.fail > 0);

    return (
        <div style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
            
            {/* Fee Overview Bar Chart */}
            <div className="dash-card dash-animate" style={{ padding: '16px 18px', animationDelay: '0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text)', fontWeight: 700 }}>Fee Overview</h3>
                </div>
                <div style={{ height: 200 }}>
                    {feeByClassData.length === 0 ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: 12 }}>
                            No fee data available
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={feeByClassData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fill: 'var(--text2)' }} 
                                    dy={5}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fill: 'var(--text2)' }} 
                                    allowDecimals={false}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                                    cursor={{ fill: 'var(--bg3)' }}
                                />
                                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text)' }} iconType="circle" />
                                <Bar dataKey="paid" name="Paid" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                <Bar dataKey="unpaid" name="Pending" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Overall Results Pie Chart */}
            <div className="dash-card dash-animate" style={{ padding: '16px 18px', animationDelay: '0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text)', fontWeight: 700 }}>Overall Results</h3>
                </div>
                <div style={{ height: 200 }}>
                    {!hasData ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: 12 }}>
                            No exam data available
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={overallResults} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fill: 'var(--text2)' }} 
                                    dy={5}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fill: 'var(--text2)' }} 
                                    allowDecimals={false}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                                    cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '3 3' }}
                                />
                                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text)' }} iconType="circle" />
                                <Line type="monotone" dataKey="pass" name="Passes" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="fail" name="Fails" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

        </div>
    );
}
