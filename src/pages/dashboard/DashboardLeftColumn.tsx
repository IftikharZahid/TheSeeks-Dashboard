import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Icons } from './DashboardIcons';
import { useAppDispatch } from '../../store/hooks';

interface DashboardLeftColumnProps {
    globalSearchQuery: string;
    filteredRecent: any[];
}

export default function DashboardLeftColumn({ globalSearchQuery, filteredRecent }: DashboardLeftColumnProps) {
    const dispatch = useAppDispatch();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Registered Student List Table */}
            <div className="dash-card dash-animate" style={{ padding: '16px 18px', animationDelay: '0.3s' }}>
                <div className="dash-section-hdr">
                    <div className="dash-section-title">
                        <div style={{ width: 26, height: 26, borderRadius: 6, background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {Icons.clipboard}
                        </div>
                        Recent Registrations
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5, border: '1px solid var(--border)' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={globalSearchQuery}
                                onChange={(e) => dispatch({ type: 'general/setGlobalSearchQuery', payload: e.target.value })}
                                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 11, width: 80, color: 'var(--text)' }} 
                            />
                        </div>
                        <Link to="/students" className="dash-viewall">View all →</Link>
                    </div>
                </div>
                
                <table className="dash-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th>Roll No</th>
                            <th>Student Name</th>
                            <th>Father Name</th>
                            <th>Class</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRecent.slice(0, 5).map((s, i) => {
                            const avatarColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];
                            return (
                                <tr key={i}>
                                    <td style={{ fontWeight: 600, color: 'var(--text2)', fontSize: 11 }}>{s.rollno}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{
                                                width: 26, height: 26, borderRadius: '50%',
                                                background: avatarColors[i % 5],
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0
                                            }}>
                                                {s.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 12 }}>{s.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: 11, color: 'var(--text2)' }}>{s.fatherName}</td>
                                    <td style={{ fontSize: 11 }}>{s.cls}</td>
                                    <td>
                                        <span style={{
                                            background: s.status === 'Approved' ? '#ecfdf5' : '#fffbeb', 
                                            color: s.status === 'Approved' ? '#059669' : '#d97706',
                                            padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700
                                        }}>
                                            {s.status}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredRecent.length === 0 && (
                            <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>No recent registrations found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
