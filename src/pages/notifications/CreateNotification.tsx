import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createNotification, updateNotification, selectAllNotifications } from '../../store/slices/notificationsSlice';
import { useAuth } from '../../context/AuthContext';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { FiImage, FiFileText, FiSmartphone, FiVideo, FiCalendar, FiTarget, FiSend, FiTrash2, FiX, FiFile, FiXCircle } from 'react-icons/fi';

const AUDIENCE_OPTIONS = [
    'All Users', 'Parents', 'Teachers', 'Staff', 'Students', 'Class 8th', 'Class 9th', 'Class 10th', '1st Year', '2nd Year'
];

export default function CreateNotification() {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const { user } = useAuth();
    const list = useAppSelector(selectAllNotifications);
    const { loading } = useAppSelector((state: any) => state.notifications);

    const [showTemplatesModal, setShowTemplatesModal] = useState(false);
    const templateAppliedRef = useRef(false);
    
    const NOTIFICATION_TEMPLATES = [
        { id: 't1', title: 'Important Announcement: School Closure', type: 'Announcement', message: 'Dear Parents/Students,\n\nPlease be informed that the school will remain closed tomorrow due to unforeseen circumstances. All scheduled classes and activities are suspended. Regular classes will resume the day after tomorrow.\n\nRegards,\nPrincipal', priority: 'Urgent' },
        { id: 't2', title: 'Parent-Teacher Meeting', type: 'Announcement', message: 'Dear Parents,\n\nWe cordially invite you to our upcoming Parent-Teacher Meeting scheduled for this Saturday. Please check your specific time slot in the portal.\n\nWarm Regards,\nAdministration', priority: 'High' },
        { id: 't3', title: 'Weekly Diary Update', type: 'Diary', message: 'Dear Parents,\n\nHere is the academic progress and diary for this week. Please review the syllabus covered and ensure your child completes the pending revision tasks.\n\nBest Regards,\nClass Teacher', priority: 'Normal' },
        { id: 't4', title: 'New Assignment Uploaded', type: 'Assignment', message: 'Dear Students,\n\nA new assignment has been uploaded to your portal. Please check the requirements and ensure you submit your work before the deadline.\n\nBest of luck,\nSubject Teacher', priority: 'Normal' },
        { id: 't5', title: 'Fee Reminder', type: 'Announcement', message: 'Dear Parents,\n\nThis is a gentle reminder that the school fees for the current term are due. Kindly ensure timely payment to avoid any late surcharges.\n\nThank you,\nFinance Department', priority: 'High' },
        { id: 't6', title: 'General Chat Broadcast', type: 'Chat', message: 'Hello everyone,\n\nJust dropping a quick message to check in. Let me know if anyone has any questions regarding the upcoming events or recent lessons.\n\nThanks!', priority: 'Normal' }
    ];
    
    const [formData, setFormData] = useState({
        title: '',
        subject: '',
        description: '',
        audience: [] as string[],
        imageUrl: '',
        pdfUrl: '',
        videoLink: '',
        deepLinkScreen: '',
        priority: 'Normal',
        type: 'Announcement',
        deliveryMode: 'Push Notification',
        scheduleMode: 'Send Now',
        scheduledAt: '',
        expiryDate: '',
    });

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const duplicateId = queryParams.get('duplicate');
        const editId = queryParams.get('edit');
        const targetId = editId || duplicateId;
        const isSchedule = queryParams.get('schedule') === 'true';
        
        if (targetId && list.length > 0) {
            const notif = list.find((n: any) => n.id === targetId);
            if (notif) {
                setFormData({
                    title: editId ? notif.title : `${notif.title} (Copy)`,
                    subject: notif.subject || '',
                    description: notif.description || '',
                    audience: Array.isArray(notif.audience) ? notif.audience : [notif.audience],
                    videoLink: notif.videoLink || '',
                    deepLinkScreen: notif.deepLinkScreen || '',
                    priority: notif.priority || 'Normal',
                    type: notif.type || 'Announcement',
                    deliveryMode: notif.deliveryMode || 'Push Notification',
                    scheduleMode: 'Send Now',
                    scheduledAt: '',
                    expiryDate: notif.expiryDate || '',
                    imageUrl: notif.imageUrl || '',
                    pdfUrl: notif.pdfUrl || '',
                });
            }
        } else {
            const state = location.state as any;
            if (state?.template && !templateAppliedRef.current) {
                const template = state.template;
                setFormData(prev => ({
                    ...prev,
                    title: template.title || prev.title,
                    type: template.type || prev.type,
                    description: template.message ? template.message.replace(/\n/g, '<br/>') : prev.description,
                    priority: template.priority || prev.priority,
                    scheduleMode: isSchedule ? 'Schedule Date & Time' : prev.scheduleMode,
                }));
                templateAppliedRef.current = true;
            }
        }
    }, [location.search, location.state, list]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDescriptionChange = (content: string) => {
        setFormData(prev => ({ ...prev, description: content }));
    };

    const handleAudienceToggle = (opt: string) => {
        setFormData(prev => {
            const audiences = new Set(prev.audience);
            if (opt === 'All Users') {
                if (audiences.has('All Users')) audiences.delete('All Users');
                else return { ...prev, audience: ['All Users'] };
            } else {
                audiences.delete('All Users');
                if (audiences.has(opt)) audiences.delete(opt);
                else audiences.add(opt);
            }
            return { ...prev, audience: Array.from(audiences) };
        });
    };

    const handleUseTemplate = (t: any) => {
        setFormData(prev => ({
            ...prev,
            title: t.title,
            type: t.type,
            description: t.message.replace(/\n/g, '<br/>'),
            priority: t.priority
        }));
        setShowTemplatesModal(false);
    };



    const handleSubmit = async (published: boolean) => {
        if (!formData.title?.trim() || !formData.description?.trim() || formData.description === '<p><br></p>') {
            alert('Title and Description are required.');
            return;
        }

        if (!formData.audience || formData.audience.length === 0) {
            alert('Please select at least one target audience.');
            return;
        }

        if (!formData.type) {
            alert('Please select a notification type.');
            return;
        }

        try {
            const payload: any = {
                title: formData.title,
                subject: formData.subject,
                description: formData.description,
                audience: formData.audience,
                priority: formData.priority,
                type: formData.type,
                deliveryMode: formData.deliveryMode,
                published,
                createdBy: user?.uid || 'admin',
                deliveryTracking: {
                    delivered: 0,
                    failed: 0,
                    read: 0,
                    opened: 0
                }
            };

            payload.imageUrl = formData.imageUrl || '';
            payload.pdfUrl = formData.pdfUrl || '';
            payload.videoLink = formData.videoLink || '';
            payload.deepLinkScreen = formData.deepLinkScreen || '';

            if (formData.scheduleMode === 'Schedule Date & Time' && formData.scheduledAt) {
                payload.scheduledAt = new Date(formData.scheduledAt).toISOString();
            }
            if (formData.expiryDate) {
                payload.expiryDate = new Date(formData.expiryDate).toISOString();
            }

            const queryParams = new URLSearchParams(location.search);
            const editId = queryParams.get('edit');

            if (editId) {
                await dispatch(updateNotification({ id: editId, data: payload })).unwrap();
            } else {
                await dispatch(createNotification(payload)).unwrap();
            }
            navigate('/notifications/list');
        } catch (error) {
            console.error('Error saving notification:', error);
            alert('Failed to save notification.');
        }
    };

    return (
        <div className="page">
            <style>{`
                .quill-editor .ql-toolbar { background: var(--bg3); border-color: var(--border); border-top-left-radius: 8px; border-top-right-radius: 8px; }
                .quill-editor .ql-toolbar .ql-stroke { stroke: var(--text); }
                .quill-editor .ql-toolbar .ql-fill { fill: var(--text); }
                .quill-editor .ql-toolbar .ql-picker { color: var(--text); }
                .quill-editor .ql-container { border-color: var(--border); border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; font-family: inherit; font-size: 13px; min-height: 120px; }
                .quill-editor .ql-editor { color: var(--text); padding: 12px; }
                .quill-editor .ql-editor.ql-blank::before { color: var(--text2); }
                
                .file-upload-box {
                    background: var(--bg3);
                    border: 1px dashed var(--border);
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    overflow: hidden;
                    cursor: pointer;
                    transition: border-color 0.2s;
                }
                .file-upload-box:hover {
                    border-color: var(--primary);
                }
                
                .device-frame {
                    width: 320px;
                    height: 650px;
                    margin: 0 auto;
                    background: #111;
                    border-radius: 44px;
                    padding: 12px;
                    border: 6px solid var(--border);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
                    position: relative;
                    display: flex;
                    flex-direction: column;
                }
                .device-notch {
                    position: absolute;
                    top: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 130px;
                    height: 24px;
                    background: var(--border);
                    border-bottom-left-radius: 16px;
                    border-bottom-right-radius: 16px;
                    z-index: 20;
                }
                .device-content {
                    flex: 1;
                    background: #f8fafc;
                    border-radius: 32px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                }
                :root[data-theme="dark"] .device-content {
                    background: #0f172a;
                }
            `}</style>

            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                    <div style={{ fontSize: '12px', color: 'var(--text2)', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Notifications / Create Notification
                    </div>
                    <h1 className="page-title">Create Notification</h1>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button className="btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none' }} onClick={() => navigate(-1)}>Cancel</button>
                    <button className="btn btn-ghost" onClick={() => setShowTemplatesModal(true)} disabled={loading} style={{ border: '1px solid var(--border)' }}>
                        <FiFile /> Use Template
                    </button>
                    <button className="btn btn-ghost" onClick={() => handleSubmit(false)} disabled={loading}>Save Draft</button>
                    <button className="btn btn-primary" onClick={() => handleSubmit(true)} disabled={loading}>
                        {loading ? 'Saving...' : <><FiSend /> {new URLSearchParams(location.search).get('edit') ? 'Update Now' : 'Publish Now'}</>}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    <div className="dash-card" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FiFileText size={16} />
                            </div>
                            <h2 className="section-title" style={{ margin: 0, color: 'var(--text)', fontSize: '14px' }}>General Content</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className="form-group">
                                <label className="form-label">Title <span style={{ color: 'var(--danger)' }}>*</span></label>
                                <input type="text" name="title" value={formData.title} onChange={handleChange} className="form-input" placeholder="e.g. Tomorrow is a Holiday" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Subject (Optional)</label>
                                <input type="text" name="subject" value={formData.subject} onChange={handleChange} className="form-input" placeholder="e.g. Regarding weather conditions" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description <span style={{ color: 'var(--danger)' }}>*</span></label>
                                <div className="quill-editor">
                                    <ReactQuill theme="snow" value={formData.description} onChange={handleDescriptionChange} placeholder="Write your full message here..." />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="dash-card" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FiImage size={16} />
                            </div>
                            <h2 className="section-title" style={{ margin: 0, color: 'var(--text)', fontSize: '14px' }}>Media & Attachments</h2>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Banner Image URL</label>
                                <div style={{ position: 'relative' }}>
                                    <FiImage style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text2)' }} size={14} />
                                    <input type="text" name="imageUrl" value={formData.imageUrl} onChange={handleChange} className="form-input" style={{ width: '100%', paddingLeft: '32px', height: '42px', fontSize: '13px' }} placeholder="https://.../image.jpg" />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">PDF Document URL</label>
                                    <div style={{ position: 'relative' }}>
                                        <FiFileText style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text2)' }} size={14} />
                                        <input type="text" name="pdfUrl" value={formData.pdfUrl} onChange={handleChange} className="form-input" style={{ width: '100%', paddingLeft: '32px', height: '42px', fontSize: '13px' }} placeholder="https://.../document.pdf" />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Video Link (YouTube/Vimeo)</label>
                                    <div style={{ position: 'relative' }}>
                                        <FiVideo style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text2)' }} size={14} />
                                        <input type="text" name="videoLink" value={formData.videoLink} onChange={handleChange} className="form-input" style={{ width: '100%', paddingLeft: '32px', height: '42px', fontSize: '13px' }} placeholder="https://..." />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="dash-card" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FiTarget size={16} />
                            </div>
                            <h2 className="section-title" style={{ margin: 0, color: 'var(--text)', fontSize: '14px' }}>Target Audience</h2>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {AUDIENCE_OPTIONS.map(opt => {
                                const isSelected = formData.audience.includes(opt);
                                return (
                                    <button
                                        key={opt}
                                        onClick={() => handleAudienceToggle(opt)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                                            background: isSelected ? 'var(--primary)' : 'var(--bg3)',
                                            color: isSelected ? '#fff' : 'var(--text2)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        {isSelected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }}></div>}
                                        {opt}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="dash-card" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FiCalendar size={16} />
                            </div>
                            <h2 className="section-title" style={{ margin: 0, color: 'var(--text)', fontSize: '14px' }}>Settings & Scheduling</h2>
                        </div>
                        <div className="form-row">
                            <div className="form-group" style={{ marginBottom: '8px' }}>
                                <label className="form-label" style={{ fontSize: '12px' }}>Category Type</label>
                                <select name="type" value={formData.type} onChange={handleChange} className="form-input" style={{ appearance: 'none', cursor: 'pointer', fontSize: '13px', padding: '8px 12px' }}>
                                    <option value="Announcement">Announcement</option>
                                    <option value="Diary">Diary</option>
                                    <option value="Assignment">Assignment</option>
                                    <option value="Exam">Exam</option>
                                    <option value="Attendance">Attendance</option>
                                    <option value="Timetable">Timetable</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: '8px' }}>
                                <label className="form-label" style={{ fontSize: '12px' }}>Priority Level</label>
                                <select name="priority" value={formData.priority} onChange={handleChange} className="form-input" style={{ appearance: 'none', cursor: 'pointer', fontSize: '13px', padding: '8px 12px' }}>
                                    <option value="Low">Low</option>
                                    <option value="Normal">Normal</option>
                                    <option value="High">High</option>
                                    <option value="Urgent">Urgent</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: '8px' }}>
                                <label className="form-label" style={{ fontSize: '12px' }}>Schedule Time</label>
                                <select name="scheduleMode" value={formData.scheduleMode} onChange={handleChange} className="form-input" style={{ appearance: 'none', cursor: 'pointer', marginBottom: '8px', fontSize: '13px', padding: '8px 12px' }}>
                                    <option value="Send Now">Send Immediately</option>
                                    <option value="Schedule Date & Time">Schedule Date & Time</option>
                                </select>
                                {formData.scheduleMode === 'Schedule Date & Time' && (
                                    <input type="datetime-local" name="scheduledAt" value={formData.scheduledAt} onChange={handleChange} className="form-input" style={{ fontSize: '13px', padding: '8px 12px' }} />
                                )}
                            </div>
                            <div className="form-group" style={{ marginBottom: '8px' }}>
                                <label className="form-label" style={{ fontSize: '12px' }}>Expiry Date (Optional)</label>
                                <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className="form-input" style={{ fontSize: '13px', padding: '8px 12px' }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Preview Sidebar */}
                <div style={{ flex: '0 0 280px', position: 'sticky', top: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', paddingLeft: '8px' }}>
                        <FiSmartphone style={{ color: 'var(--text2)' }} size={14} />
                        <h3 className="section-title" style={{ margin: 0, color: 'var(--text2)', fontSize: '11px' }}>Live Preview</h3>
                    </div>
                    
                    <div className="device-frame" style={{ width: '270px', height: '520px', margin: '0 auto', background: '#000', borderRadius: '36px', padding: '8px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 10px 25px rgba(0,0,0,0.1), 0 0 0 4px var(--bg3)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        <div className="device-notch" style={{ position: 'absolute', top: '6px', left: '50%', transform: 'translateX(-50%)', width: '90px', height: '20px', background: '#000', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', zIndex: 20 }}></div>
                        
                        <div className="device-content" style={{ flex: 1, background: 'var(--bg)', borderRadius: '30px', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {/* App Header */}
                            <div style={{ background: 'var(--bg2)', padding: '38px 16px 12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderBottom: '1px solid var(--border)' }}>
                                <img src="/logo.png" alt="Logo" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>TheSeeks Academy</div>
                            </div>
                            
                            {/* Scrollable Body */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                
                                {/* Push Notification Style Card Component */}
                                <div style={{ background: 'var(--card)', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                    {formData.imageUrl && (
                                        <div style={{ height: '120px', width: '100%', background: 'var(--bg3)' }}>
                                            <img src={formData.imageUrl} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                        </div>
                                    )}
                                    <div style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <FiTarget size={10} color="#fff" />
                                                </div>
                                                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    {formData.type}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'var(--text2)', fontWeight: 500 }}>Now</div>
                                        </div>
                                        <h4 style={{ fontWeight: 700, color: 'var(--text)', fontSize: '14px', lineHeight: 1.3, margin: '0 0 4px 0', letterSpacing: '-0.2px' }}>
                                            {formData.title || 'Notification Title'}
                                        </h4>
                                        {formData.subject && (
                                            <div style={{ fontSize: '11px', color: 'var(--primary)', marginBottom: '8px', fontWeight: 600 }}>
                                                {formData.subject}
                                            </div>
                                        )}
                                        
                                        <div style={{ color: 'var(--text2)', fontSize: '12px', lineHeight: 1.5, wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: formData.description || '<span style="color: var(--text2); opacity: 0.7;">Your notification description will appear here...</span>' }} />
                                        
                                        {formData.pdfUrl && (
                                            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '6px', borderRadius: '6px', color: '#ef4444' }}><FiFileText size={14}/></div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Document Linked</div>
                                                    <div style={{ fontSize: '9px', color: 'var(--text2)', marginTop: '2px' }}>Tap to view</div>
                                                </div>
                                            </div>
                                        )}
                                        {formData.videoLink && (
                                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '6px', borderRadius: '6px', color: '#3b82f6' }}><FiVideo size={14}/></div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Video Attached</div>
                                                    <div style={{ fontSize: '9px', color: 'var(--text2)', marginTop: '2px' }}>Tap to play</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.3)', width: '100px', borderRadius: '4px', position: 'absolute', bottom: '6px', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}></div>
                    </div>
                </div>
            </div>

            {showTemplatesModal && (
                <div className="modal-overlay" onClick={() => setShowTemplatesModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header">
                            <h2 style={{ fontSize: '18px', margin: 0 }}>Select a Template</h2>
                            <button className="btn-icon" onClick={() => setShowTemplatesModal(false)}><FiXCircle size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {NOTIFICATION_TEMPLATES.map(t => (
                                <div key={t.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s' }} 
                                     onClick={() => handleUseTemplate(t)}
                                     onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                                     onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{t.title}</h3>
                                        <span className={`badge ${t.priority === 'Urgent' ? 'badge-danger' : t.priority === 'High' ? 'badge-warning' : 'badge-info'}`}>
                                            {t.priority}
                                        </span>
                                    </div>
                                    <div style={{ color: 'var(--text2)', fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: '1.5', background: 'var(--bg3)', padding: '12px', borderRadius: '6px' }}>
                                        {t.message}
                                    </div>
                                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                                        <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                                            Use Template
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
