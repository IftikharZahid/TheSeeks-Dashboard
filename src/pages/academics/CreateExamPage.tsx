import React from 'react';
import { Link } from 'react-router-dom';

export default function CreateExamPage() {
    return (
        <div className="page" style={{ padding: '0px', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="page-header" style={{ padding: '16px 24px', background: 'var(--card)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
                            <Link to="/" style={{ color: 'var(--text2)', textDecoration: 'none' }}>Dashboard</Link> / <Link to="/exams-bank" style={{ color: 'var(--text2)', textDecoration: 'none' }}>Exams</Link> / <span style={{ color: '#3b82f6' }}>Create New Exam</span>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>Create New Exam</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Create and organize exams for students.</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13, height: 34, color: 'var(--text)', border: '1px solid var(--border)' }}>Save Draft</button>
                        <button className="btn btn-primary" style={{ padding: '6px 16px', fontSize: 13, height: 34, background: '#3b82f6', border: 'none' }}>Publish Exam</button>
                        <Link to="/exams-bank" className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13, height: 34, color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Cancel</Link>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* Left Column (Main Form) */}
                    <div style={{ flex: 1, minWidth: 600, display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Exam Information */}
                        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>Exam Information</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Exam Name</label>
                                    <input type="text" className="form-input" placeholder="e.g., Mid Term Exam 2026" style={{ height: 38, background: 'var(--bg3)' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Academic Session</label>
                                    <select className="form-input" style={{ height: 38, background: 'var(--bg3)' }}>
                                        <option>2025-2026</option>
                                        <option>2026-2027</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Exam Type</label>
                                    <select className="form-input" style={{ height: 38, background: 'var(--bg3)' }}>
                                        <option>Mid Term</option>
                                        <option>Final Term</option>
                                        <option>Monthly Test</option>
                                        <option>Weekly Test</option>
                                        <option>Custom</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Class</label>
                                    <select className="form-input" style={{ height: 38, background: 'var(--bg3)' }}>
                                        <option>Select Class</option>
                                        <option>9th Class</option>
                                        <option>10th Class</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Subject</label>
                                    <select className="form-input" style={{ height: 38, background: 'var(--bg3)' }}>
                                        <option>Select Subject</option>
                                        <option>Mathematics</option>
                                        <option>Physics</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Book</label>
                                    <select className="form-input" style={{ height: 38, background: 'var(--bg3)' }}>
                                        <option>Select Book</option>
                                        <option>Math Grade 9 - PTB</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Chapters (Multi Select)</label>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '10px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: 12, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '4px 10px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            Ch 1: Matrices <span>×</span>
                                        </div>
                                        <div style={{ fontSize: 12, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '4px 10px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            Ch 2: Real Numbers <span>×</span>
                                        </div>
                                        <input type="text" placeholder="Select more chapters..." style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 12, flex: 1 }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Teacher</label>
                                    <select className="form-input" style={{ height: 38, background: 'var(--bg3)' }}>
                                        <option>Assign Teacher</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Exam Date</label>
                                    <input type="date" className="form-input" style={{ height: 38, background: 'var(--bg3)' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Start Time</label>
                                    <input type="time" className="form-input" style={{ height: 38, background: 'var(--bg3)' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>End Time</label>
                                    <input type="time" className="form-input" style={{ height: 38, background: 'var(--bg3)' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Duration (Minutes)</label>
                                    <input type="number" className="form-input" placeholder="120" style={{ height: 38, background: 'var(--bg3)' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Passing Marks</label>
                                    <input type="number" className="form-input" placeholder="33" style={{ height: 38, background: 'var(--bg3)' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Total Marks</label>
                                    <input type="number" className="form-input" placeholder="100" style={{ height: 38, background: 'var(--bg3)' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Status</label>
                                    <select className="form-input" style={{ height: 38, background: 'var(--bg3)' }}>
                                        <option>Draft</option>
                                        <option>Published</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Question Selection */}
                        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>Question Selection</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                                {/* MCQs Card */}
                                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>A+</div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>MCQs</div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                                        <span style={{ color: 'var(--text2)' }}>Total Available</span>
                                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>350</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 12 }}>
                                        <span style={{ color: 'var(--text2)' }}>Selected</span>
                                        <span style={{ fontWeight: 600, color: '#3b82f6' }}>0</span>
                                    </div>
                                    <button className="btn btn-ghost" style={{ width: '100%', padding: '6px', fontSize: 12, border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer' }}>Select Questions</button>
                                </div>
                                {/* Short Questions Card */}
                                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(236,72,153,0.1)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>📝</div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Short Questions</div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                                        <span style={{ color: 'var(--text2)' }}>Total Available</span>
                                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>120</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 12 }}>
                                        <span style={{ color: 'var(--text2)' }}>Selected</span>
                                        <span style={{ fontWeight: 600, color: '#ec4899' }}>0</span>
                                    </div>
                                    <button className="btn btn-ghost" style={{ width: '100%', padding: '6px', fontSize: 12, border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer' }}>Select Questions</button>
                                </div>
                                {/* Long Questions Card */}
                                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(14,165,233,0.1)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>📑</div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Long Questions</div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                                        <span style={{ color: 'var(--text2)' }}>Total Available</span>
                                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>45</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 12 }}>
                                        <span style={{ color: 'var(--text2)' }}>Selected</span>
                                        <span style={{ fontWeight: 600, color: '#0ea5e9' }}>0</span>
                                    </div>
                                    <button className="btn btn-ghost" style={{ width: '100%', padding: '6px', fontSize: 12, border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer' }}>Select Questions</button>
                                </div>
                            </div>
                        </div>

                        {/* Exam Rules */}
                        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>Exam Rules & Configuration</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                {[
                                    { label: 'Randomize Questions', desc: 'Shuffle the order of questions.' },
                                    { label: 'Randomize MCQ Options', desc: 'Shuffle choices for multiple choice.' },
                                    { label: 'Show Answer Key', desc: 'Allow students to see answers after.' },
                                    { label: 'Negative Marking', desc: 'Deduct marks for wrong answers.' },
                                    { label: 'Allow Calculator', desc: 'Provide an on-screen calculator.' },
                                    { label: 'Student Can Review', desc: 'Let students change answers before submit.' },
                                    { label: 'Enable Timer', desc: 'Force submit when time runs out.' },
                                ].map((rule, idx) => (
                                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg3)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer' }}>
                                        <input type="checkbox" style={{ width: 16, height: 16, accentColor: '#3b82f6' }} />
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{rule.label}</span>
                                            <span style={{ fontSize: 11, color: 'var(--text2)' }}>{rule.desc}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Instructions */}
                        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>Instructions</div>
                            <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                                <div style={{ display: 'flex', gap: 8, background: 'var(--bg3)', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>B</button>
                                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 13, fontStyle: 'italic' }}>I</button>
                                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>U</button>
                                    <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }}></div>
                                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>Format ▼</button>
                                </div>
                                <textarea className="form-input" style={{ width: '100%', height: 150, border: 'none', background: 'transparent', padding: 16, resize: 'vertical', outline: 'none' }} placeholder="Enter exam instructions for students here..."></textarea>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                            <button className="btn btn-ghost" style={{ padding: '8px 20px', fontSize: 14, color: 'var(--text)', border: '1px solid var(--border)' }}>Save Draft</button>
                            <button className="btn btn-ghost" style={{ padding: '8px 20px', fontSize: 14, color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}>Preview Exam</button>
                            <button className="btn btn-primary" style={{ padding: '8px 24px', fontSize: 14, background: '#3b82f6', border: 'none' }}>Publish Exam</button>
                        </div>
                    </div>

                    {/* Right Column (Sticky Summary) */}
                    <div style={{ width: 300, flexShrink: 0, position: 'sticky', top: 24 }}>
                        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                                📊 Exam Summary
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                    <span style={{ color: 'var(--text2)' }}>Class</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>-</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                    <span style={{ color: 'var(--text2)' }}>Subject</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>-</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                    <span style={{ color: 'var(--text2)' }}>Book</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>-</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                    <span style={{ color: 'var(--text2)' }}>Chapters</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>0 Selected</span>
                                </div>
                            </div>

                            <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }}></div>

                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Questions Breakdown</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                    <span style={{ color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }}></div> MCQs</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>0</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                    <span style={{ color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ec4899' }}></div> Short</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>0</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                    <span style={{ color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0ea5e9' }}></div> Long</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>0</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#3b82f6', marginTop: 4 }}>
                                    <span>Total Questions</span>
                                    <span>0</span>
                                </div>
                            </div>

                            <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }}></div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                    <span style={{ color: 'var(--text2)' }}>Estimated Time</span>
                                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>0 mins</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span style={{ color: 'var(--text2)', fontWeight: 600 }}>Total Marks</span>
                                    <span style={{ fontWeight: 800, color: 'var(--text)' }}>0</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 8, alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text2)' }}>Status</span>
                                    <span style={{ fontWeight: 600, fontSize: 11, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '2px 8px', borderRadius: 10 }}>Draft</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
