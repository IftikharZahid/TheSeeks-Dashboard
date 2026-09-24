import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ExamsQuestionBankPage() {
    const [activeTab, setActiveTab] = useState('Classes');

    const stats = [
        { label: 'Total Exams\nAll Classes', value: 26, icon: '📄', bg: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
        { label: 'Books Added\nAll Classes', value: 18, icon: '📖', bg: 'linear-gradient(135deg, #10b981, #059669)' },
        { label: 'Total Questions\nAll Categories', value: 2450, icon: '❓', bg: 'linear-gradient(135deg, #f59e0b, #d97706)' },
        { label: 'MCQs\nMultiple Choice', value: 1250, icon: 'A+', bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
        { label: 'Short Questions\nShort Answers', value: 850, icon: '📝', bg: 'linear-gradient(135deg, #ec4899, #be185d)' },
        { label: 'Long Questions\nDescriptive', value: 350, icon: '📑', bg: 'linear-gradient(135deg, #0ea5e9, #0284c7)' },
    ];

    const tabs = ['Classes', 'Exams', 'Books', 'Question Bank', 'Categories'];

    const classesOverview = [
        { name: '9th Class', books: 5, exams: 6, questions: 540, icon: '🎓' },
        { name: '10th Class', books: 6, exams: 7, questions: 620, icon: '🎓' },
        { name: '1st Year (FSc)', books: 4, exams: 6, questions: 780, icon: '🎓' },
        { name: '2nd Year (FSc)', books: 3, exams: 5, questions: 510, icon: '🎓' },
    ];

    const recentExams = [
        { name: 'Mid Term Exam 2026', class: '9th Class', subject: 'Mathematics', questions: 60, mcq: 30, short: 20, long: 10, status: 'Published' },
        { name: 'Final Term Exam 2026', class: '10th Class', subject: 'Physics', questions: 75, mcq: 30, short: 25, long: 20, status: 'Published' },
        { name: 'Board Preparation 2026', class: '1st Year (FSc)', subject: 'Computer Science', questions: 90, mcq: 40, short: 30, long: 20, status: 'Draft' },
        { name: 'Chapter Test - Ch 1 & 2', class: '2nd Year (FSc)', subject: 'Chemistry', questions: 45, mcq: 20, short: 15, long: 10, status: 'Draft' },
    ];

    return (
        <div className="page" style={{ padding: '0px', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="page-header" style={{ padding: '16px 24px', background: 'var(--card)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>Exams & Question Bank</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Manage exams, books and questions for all classes.</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <Link to="/exams-bank/questions" className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13, height: 34, color: 'var(--text)', border: '1px solid var(--border)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                            📚 Question Bank
                        </Link>
                        <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13, height: 34, color: 'var(--text)', border: '1px solid var(--border)' }}>
                            ⬆️ Import Questions
                        </button>
                        <Link to="/exams-bank/create" className="btn btn-primary" style={{ padding: '6px 16px', fontSize: 13, height: 34, background: '#3b82f6', border: 'none', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                            ➕ Create New Exam
                        </Link>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                    {stats.map((s, i) => (
                        <div key={i} className="dash-card" style={{ padding: '16px', background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 42, height: 42, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, flexShrink: 0 }}>
                                {s.icon}
                            </div>
                            <div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{s.value.toLocaleString()}</div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginTop: 4, whiteSpace: 'pre-line', lineHeight: 1.3 }}>{s.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
                    {tabs.map(t => (
                        <div 
                            key={t}
                            onClick={() => setActiveTab(t)}
                            style={{ 
                                padding: '10px 4px', 
                                fontSize: 13, 
                                fontWeight: 600, 
                                color: activeTab === t ? '#3b82f6' : 'var(--text2)',
                                borderBottom: activeTab === t ? '2px solid #3b82f6' : '2px solid transparent',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            {t === 'Classes' && '👥'}
                            {t === 'Exams' && '📄'}
                            {t === 'Books' && '📚'}
                            {t === 'Question Bank' && '📝'}
                            {t === 'Categories' && '🏷️'}
                            {t}
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* Left Column (Main) */}
                    <div style={{ flex: 1, minWidth: 600, display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Class Overview */}
                        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Class Overview</div>
                                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Manage exams, books and questions by class.</div>
                                </div>
                                <select className="form-input" style={{ height: 32, fontSize: 12, width: 140 }}>
                                    <option>All Sessions</option>
                                    <option>2025-2026</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                                {classesOverview.map((c, i) => (
                                    <div key={i} style={{ background: 'var(--bg3)', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 18 }}>{c.icon}</span>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{c.name}</span>
                                            </div>
                                            <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: 10, fontWeight: 600 }}>Active</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                                            <span style={{ color: 'var(--text2)' }}>Books</span>
                                            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.books}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                                            <span style={{ color: 'var(--text2)' }}>Exams</span>
                                            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.exams}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 12 }}>
                                            <span style={{ color: 'var(--text2)' }}>Questions</span>
                                            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.questions}</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }}>View Details →</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Exams Table */}
                        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Recent Exams</div>
                                <div style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }}>View all Exams →</div>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg3)', fontSize: 10, textTransform: 'uppercase', color: 'var(--text2)', letterSpacing: 0.5 }}>
                                            <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600 }}>Exam Name</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600 }}>Class</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600 }}>Book</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'center', fontWeight: 600 }}>Total Questions</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'center', fontWeight: 600 }}>Categories</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'center', fontWeight: 600 }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentExams.map((e, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid var(--border)', fontSize: 13, background: i % 2 === 0 ? 'transparent' : 'var(--bg3)' }}>
                                                <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ display: 'inline-flex', padding: 6, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: 6 }}>📄</span>
                                                    {e.name}
                                                </td>
                                                <td style={{ padding: '14px 20px', color: 'var(--text2)' }}>{e.class}</td>
                                                <td style={{ padding: '14px 20px', color: 'var(--text2)' }}>{e.subject}</td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 600 }}>{e.questions}</td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                                        <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', borderRadius: 4 }}>MCQ {e.mcq}</span>
                                                        <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', borderRadius: 4 }}>Short {e.short}</span>
                                                        <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', borderRadius: 4 }}>Long {e.long}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                    <span style={{ fontSize: 11, fontWeight: 600, color: e.status === 'Published' ? '#10b981' : '#f59e0b' }}>{e.status}</span>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                                        <button style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', width: 26, height: 26, borderRadius: 4, cursor: 'pointer' }}>👁️</button>
                                                        <button style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', width: 26, height: 26, borderRadius: 4, cursor: 'pointer' }}>✏️</button>
                                                        <button style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', width: 26, height: 26, borderRadius: 4, cursor: 'pointer' }}>⋮</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Sidebar) */}
                    <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 24, flexShrink: 0 }}>
                        {/* Quick Actions */}
                        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Quick Actions</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <button className="btn btn-ghost" style={{ padding: '12px 8px', height: 'auto', border: '1px solid var(--border)', flexDirection: 'column', gap: 6, background: 'var(--bg3)' }}>
                                    <span style={{ fontSize: 16 }}>➕</span>
                                    <span style={{ fontSize: 11 }}>Add New Exam</span>
                                </button>
                                <button className="btn btn-ghost" style={{ padding: '12px 8px', height: 'auto', border: '1px solid var(--border)', flexDirection: 'column', gap: 6, background: 'var(--bg3)' }}>
                                    <span style={{ fontSize: 16 }}>📖</span>
                                    <span style={{ fontSize: 11 }}>Add New Book</span>
                                </button>
                                <button className="btn btn-ghost" style={{ padding: '12px 8px', height: 'auto', border: '1px solid var(--border)', flexDirection: 'column', gap: 6, background: 'var(--bg3)' }}>
                                    <span style={{ fontSize: 16 }}>❓</span>
                                    <span style={{ fontSize: 11 }}>Add Questions</span>
                                </button>
                                <button className="btn btn-ghost" style={{ padding: '12px 8px', height: 'auto', border: '1px solid var(--border)', flexDirection: 'column', gap: 6, background: 'var(--bg3)' }}>
                                    <span style={{ fontSize: 16 }}>🏷️</span>
                                    <span style={{ fontSize: 11 }}>Manage Categories</span>
                                </button>
                            </div>
                        </div>

                        {/* Question Categories Chart */}
                        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Question Categories</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                {/* Fake Donut Chart */}
                                <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'conic-gradient(#3b82f6 51%, #f59e0b 51% 86%, #8b5cf6 86% 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                    <div style={{ width: 65, height: 65, background: 'var(--card)', borderRadius: '50%' }}></div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: 2, background: '#3b82f6' }}></div>
                                            <span style={{ color: 'var(--text2)' }}>MCQs</span>
                                        </div>
                                        <span style={{ fontWeight: 600 }}>1,250 (51%)</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: 2, background: '#f59e0b' }}></div>
                                            <span style={{ color: 'var(--text2)' }}>Short</span>
                                        </div>
                                        <span style={{ fontWeight: 600 }}>850 (35%)</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: 2, background: '#8b5cf6' }}></div>
                                            <span style={{ color: 'var(--text2)' }}>Long</span>
                                        </div>
                                        <span style={{ fontWeight: 600 }}>350 (14%)</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--text2)', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                                Total: 2,450 Questions
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
