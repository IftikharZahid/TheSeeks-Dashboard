import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function QuestionBankPage() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [questionType, setQuestionType] = useState('MCQ');

    return (
        <div className="page" style={{ padding: '0px', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div className="page-header" style={{ padding: '16px 24px', background: 'var(--card)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
                            <Link to="/" style={{ color: 'var(--text2)', textDecoration: 'none' }}>Dashboard</Link> / <Link to="/exams-bank" style={{ color: 'var(--text2)', textDecoration: 'none' }}>Exams</Link> / <span style={{ color: '#3b82f6' }}>Question Bank</span>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>📚 Question Bank</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Manage questions for all classes and exams.</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13, height: 34, color: 'var(--text)', border: '1px solid var(--border)' }}>Filters</button>
                        <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13, height: 34, color: 'var(--text)', border: '1px solid var(--border)' }}>Export</button>
                        <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13, height: 34, color: 'var(--text)', border: '1px solid var(--border)' }}>Bulk Import</button>
                        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ padding: '6px 16px', fontSize: 13, height: 34, background: '#3b82f6', border: 'none' }}>➕ Add Question</button>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* Left Column (Main Area) */}
                    <div style={{ flex: 1, minWidth: 700, display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Filters */}
                        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
                                <select className="form-input" style={{ height: 36, background: 'var(--bg3)', fontSize: 12 }}><option>All Sessions</option><option>2025-2026</option></select>
                                <select className="form-input" style={{ height: 36, background: 'var(--bg3)', fontSize: 12 }}><option>All Classes</option><option>9th Class</option><option>10th Class</option></select>
                                <select className="form-input" style={{ height: 36, background: 'var(--bg3)', fontSize: 12 }}><option>All Subjects</option><option>Mathematics</option></select>
                                <select className="form-input" style={{ height: 36, background: 'var(--bg3)', fontSize: 12 }}><option>All Books</option></select>
                                <select className="form-input" style={{ height: 36, background: 'var(--bg3)', fontSize: 12 }}><option>All Chapters</option></select>
                                <select className="form-input" style={{ height: 36, background: 'var(--bg3)', fontSize: 12 }}><option>All Exams</option></select>
                                <select className="form-input" style={{ height: 36, background: 'var(--bg3)', fontSize: 12 }}><option>All Types</option><option>MCQ</option><option>Short</option><option>Long</option></select>
                                <select className="form-input" style={{ height: 36, background: 'var(--bg3)', fontSize: 12 }}><option>Difficulty</option><option>Easy</option><option>Medium</option><option>Hard</option></select>
                                <input type="text" className="form-input" placeholder="Search Questions..." style={{ height: 36, background: 'var(--bg3)', fontSize: 12, gridColumn: 'span 2' }} />
                            </div>
                        </div>

                        {/* Questions Table */}
                        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                            <div className="table-responsive">
                                <table className="table" style={{ width: '100%', fontSize: 13 }}>
                                    <thead style={{ background: 'var(--bg3)', color: 'var(--text2)' }}>
                                        <tr>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Question</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Type</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Class / Subject</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Difficulty</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Marks</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { q: 'What is the matrix A called if its determinant is zero?', type: 'MCQ', cls: '9th Class', sub: 'Mathematics', diff: 'Easy', marks: 1 },
                                            { q: 'Define an identity matrix and give an example.', type: 'Short', cls: '9th Class', sub: 'Mathematics', diff: 'Medium', marks: 2 },
                                            { q: 'Solve the system of linear equations using Cramer\'s Rule.', type: 'Long', cls: '9th Class', sub: 'Mathematics', diff: 'Hard', marks: 8 },
                                        ].map((row, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'var(--bg3)' }}>
                                                <td style={{ padding: '12px 16px', color: 'var(--text)' }}>
                                                    <div style={{ fontWeight: 600, maxWidth: 350, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.q}</div>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                                                        background: row.type === 'MCQ' ? 'rgba(59,130,246,0.1)' : row.type === 'Short' ? 'rgba(236,72,153,0.1)' : 'rgba(14,165,233,0.1)',
                                                        color: row.type === 'MCQ' ? '#3b82f6' : row.type === 'Short' ? '#ec4899' : '#0ea5e9'
                                                    }}>
                                                        {row.type}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <div style={{ color: 'var(--text)' }}>{row.cls}</div>
                                                    <div style={{ color: 'var(--text2)', fontSize: 11 }}>{row.sub}</div>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                                                        background: row.diff === 'Easy' ? 'rgba(34,197,94,0.1)' : row.diff === 'Medium' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                                                        color: row.diff === 'Easy' ? '#22c55e' : row.diff === 'Medium' ? '#f59e0b' : '#ef4444'
                                                    }}>
                                                        {row.diff}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', color: 'var(--text)' }}>{row.marks}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                                        <button style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 16 }} title="Edit">✏️</button>
                                                        <button style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: 16 }} title="Duplicate">📑</button>
                                                        <button style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }} title="Delete">🗑️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text2)' }}>
                                <span>Showing 1 to 3 of 3 questions</span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="btn btn-ghost" style={{ padding: '4px 10px', border: '1px solid var(--border)' }}>Prev</button>
                                    <button className="btn btn-ghost" style={{ padding: '4px 10px', border: '1px solid var(--border)', background: 'var(--primary)', color: '#fff' }}>1</button>
                                    <button className="btn btn-ghost" style={{ padding: '4px 10px', border: '1px solid var(--border)' }}>Next</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Sidebar Analytics) */}
                    <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Overall Analytics */}
                        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                                📈 Bank Analytics
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Total Questions</div>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>3,245</div>
                                </div>
                                <div style={{ height: 1, background: 'var(--border)' }}></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 2 }}>MCQs</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>2,100</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 2 }}>Short</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#ec4899' }}>850</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 2 }}>Long</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#0ea5e9' }}>295</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* By Class */}
                        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Questions by Class</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {['9th Class', '10th Class', '1st Year FSC'].map((cls, idx) => (
                                    <div key={idx}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                            <span style={{ color: 'var(--text2)' }}>{cls}</span>
                                            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{800 - idx * 200}</span>
                                        </div>
                                        <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', background: '#3b82f6', width: `${60 - idx * 10}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Question Drawer/Modal */}
            {isAddModalOpen && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
                    display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn 0.2s ease-in-out'
                }}>
                    <div style={{
                        width: 700, height: '100%', background: 'var(--card)', borderLeft: '1px solid var(--border)',
                        display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease-out'
                    }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Add New Question</div>
                            <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 20 }}>×</button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                {/* Basic Info */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: 'span 2' }}>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Question Type</label>
                                        <select className="form-input" value={questionType} onChange={(e) => setQuestionType(e.target.value)} style={{ height: 38, background: 'var(--bg3)' }}>
                                            <option value="MCQ">Multiple Choice Question (MCQ)</option>
                                            <option value="Short">Short Question</option>
                                            <option value="Long">Long Question</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Class</label>
                                        <select className="form-input" style={{ height: 38, background: 'var(--bg3)' }}><option>Select Class</option></select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Subject</label>
                                        <select className="form-input" style={{ height: 38, background: 'var(--bg3)' }}><option>Select Subject</option></select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Marks</label>
                                        <input type="number" className="form-input" placeholder="1" style={{ height: 38, background: 'var(--bg3)' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Difficulty</label>
                                        <select className="form-input" style={{ height: 38, background: 'var(--bg3)' }}><option>Easy</option><option>Medium</option><option>Hard</option></select>
                                    </div>
                                </div>

                                {/* Question Text */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Question Text</label>
                                    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', gap: 8, background: 'var(--bg3)', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                                            <button style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>B</button>
                                            <button style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 13, fontStyle: 'italic' }}>I</button>
                                            <button style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>Σ (Math)</button>
                                            <button style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>🖼️ Image</button>
                                        </div>
                                        <textarea className="form-input" style={{ width: '100%', height: 100, border: 'none', background: 'transparent', padding: 16, resize: 'vertical', outline: 'none' }} placeholder="Type question here..."></textarea>
                                    </div>
                                </div>

                                {/* Dynamic Fields based on Type */}
                                {questionType === 'MCQ' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg3)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>MCQ Options</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                            {['A', 'B', 'C', 'D'].map(opt => (
                                                <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <input type="radio" name="mcq-correct" style={{ accentColor: '#3b82f6', width: 16, height: 16 }} title="Mark as correct" />
                                                    <input type="text" className="form-input" placeholder={`Option ${opt}`} style={{ height: 38, background: 'var(--card)', flex: 1 }} />
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Explanation (Optional)</label>
                                            <textarea className="form-input" style={{ height: 60, background: 'var(--card)', outline: 'none' }} placeholder="Why is this the correct answer?"></textarea>
                                        </div>
                                    </div>
                                )}

                                {questionType === 'Short' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg3)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Short Answer Details</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Model Answer</label>
                                            <textarea className="form-input" style={{ height: 100, background: 'var(--card)', outline: 'none' }} placeholder="Ideal short answer..."></textarea>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Keywords (Comma separated)</label>
                                            <input type="text" className="form-input" placeholder="e.g. Newton, Force, Mass" style={{ height: 38, background: 'var(--card)' }} />
                                        </div>
                                    </div>
                                )}

                                {questionType === 'Long' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg3)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Long Answer Details</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Detailed Answer</label>
                                            <textarea className="form-input" style={{ height: 120, background: 'var(--card)', outline: 'none' }} placeholder="Full detailed explanation..."></textarea>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Marking Scheme / Rubric</label>
                                            <textarea className="form-input" style={{ height: 80, background: 'var(--card)', outline: 'none' }} placeholder="e.g. 2 marks for formula, 4 for derivation..."></textarea>
                                        </div>
                                    </div>
                                )}

                                {/* Tags & Status */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Tags</label>
                                        <input type="text" className="form-input" placeholder="e.g. Important, 2024" style={{ height: 38, background: 'var(--bg3)' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Status</label>
                                        <select className="form-input" style={{ height: 38, background: 'var(--bg3)' }}><option>Active</option><option>Draft</option></select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button className="btn btn-ghost" onClick={() => setIsAddModalOpen(false)} style={{ color: 'var(--text2)', border: 'none' }}>Cancel</button>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: 13, border: '1px solid var(--border)' }}>Save & Add Another</button>
                                <button className="btn btn-primary" style={{ padding: '8px 24px', fontSize: 13, background: '#3b82f6', border: 'none' }}>Save Question</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
