import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { serverTimestamp } from 'firebase/firestore';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchNotifications, updateNotification, deleteNotification, selectFilteredNotifications, bulkDeleteNotifications, createNotification } from '../../store/slices/notificationsSlice';
import { fetchTeachers } from '../../store/slices/teachersSlice';
import { FiEye, FiEdit2, FiTrash2, FiSend, FiArchive, FiCopy, FiRepeat, FiFilter, FiPlus, FiSearch } from 'react-icons/fi';

export default function NotificationList() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { loading, loadingMore, hasMore } = useAppSelector((state: any) => state.notifications);
    const { data: teachers, status: teachersStatus } = useAppSelector((state: any) => state.teachers);

    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [filterAudience, setFilterAudience] = useState('All');
    const [filterPriority, setFilterPriority] = useState('All');
    
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const handler = setTimeout(() => {
            setSearchQuery(searchInput);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchInput]);

    const filteredList = useAppSelector((state: any) => {
        const list = selectFilteredNotifications(state, searchQuery, filterStatus, filterType, filterAudience);
        if (filterPriority !== 'All') {
            return list.filter((n: any) => n.priority === filterPriority);
        }
        return list;
    });

    useEffect(() => {
        dispatch(fetchNotifications({ pageSize: 20 }) as any);
        if (teachersStatus === 'idle') {
            dispatch(fetchTeachers() as any);
        }
    }, [dispatch, teachersStatus]);

    const getSenderName = (id: string) => {
        if (!id || id.toLowerCase() === 'admin') return 'Super Admin';
        const teacher = teachers?.find((t: any) => t.id === id);
        return teacher ? teacher.name : (id.length > 20 ? 'Super Admin' : id);
    };

    const handleLoadMore = () => {
        dispatch(fetchNotifications({ loadMore: true, pageSize: 20 }) as any);
    };

    const handlePublishToggle = async (id: string, currentStatus: boolean) => {
        if (window.confirm(`Are you sure you want to ${currentStatus ? 'unpublish' : 'publish'} this notification?`)) {
            await dispatch(updateNotification({ id, data: { published: !currentStatus } }) as any);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this notification? This action cannot be undone.')) {
            await dispatch(deleteNotification(id) as any);
        }
    };

    const handleDuplicate = (id: string) => {
        navigate(`/notifications/create?duplicate=${id}`);
    };

    const handleResend = async (id: string) => {
        if (window.confirm('Are you sure you want to resend this notification immediately?')) {
            const notif = filteredList.find((n: any) => n.id === id);
            if (notif) {
                const { id: _, deliveryTracking, createdAt, updatedAt, ...rest } = notif;
                const payload = { 
                    ...rest, 
                    published: true,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                };
                await dispatch(createNotification(payload as any) as any);
                alert('Notification resent successfully!');
            }
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === filteredList.length && filteredList.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredList.map((n: any) => n.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (window.confirm(`Are you sure you want to delete ${selectedIds.size} notifications?`)) {
            await dispatch(bulkDeleteNotifications(Array.from(selectedIds)) as any);
            setSelectedIds(new Set());
        }
    };

    return (
        <div className="page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                    <h1 className="page-title">Notification Feed</h1>
                    <p className="page-sub">Manage and track all sent communications</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    {selectedIds.size > 0 && (
                        <button onClick={handleBulkDelete} className="btn btn-danger">
                            Delete Selected ({selectedIds.size})
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={() => navigate('/notifications/create')}>
                        <FiPlus /> Create Notification
                    </button>
                </div>
            </div>

            <div className="dash-card" style={{ padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="search-box">
                        <FiSearch className="search-icon" />
                        <input 
                            type="text" 
                            placeholder="Search by title, description or subject..." 
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                        <FilterSelect value={filterStatus} onChange={setFilterStatus} options={['All Status', 'Published', 'Draft']} />
                        <FilterSelect value={filterType} onChange={setFilterType} options={['All Types', 'Announcement', 'Diary', 'Assignment', 'Exam', 'Attendance', 'Timetable', 'Library', 'Results', 'Fee reminder', 'Chat', 'Holiday', 'Events', 'Emergency']} />
                        <FilterSelect value={filterAudience} onChange={setFilterAudience} options={['All Audiences', 'All Users', 'Parents', 'Specific Class', 'Section', 'Group', 'Individual Student']} />
                        <FilterSelect value={filterPriority} onChange={setFilterPriority} options={['All Priorities', 'Low', 'Normal', 'High', 'Urgent']} />
                    </div>
                </div>
            </div>

            <div className="table-wrap">
                <div style={{ overflowX: 'auto' }}>
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                    <input type="checkbox" checked={filteredList.length > 0 && selectedIds.size === filteredList.length} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                                </th>
                                <th>Title & Content</th>
                                <th>Audience</th>
                                <th>Sender</th>
                                <th>Schedule</th>
                                <th>Stats</th>
                                <th>Status & Priority</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && filteredList.length === 0 ? (
                                <tr>
                                    <td colSpan={8}>
                                        <div className="loading">
                                            <div className="spinner"></div>
                                            Loading notifications...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredList.length === 0 ? (
                                <tr>
                                    <td colSpan={8}>
                                        <div className="empty">No notifications found matching your criteria.</div>
                                    </td>
                                </tr>
                            ) : filteredList.map((notif: any) => (
                                <tr key={notif.id} style={selectedIds.has(notif.id) ? { background: 'rgba(59, 130, 246, 0.05)' } : {}}>
                                    <td style={{ textAlign: 'center' }}>
                                        <input type="checkbox" checked={selectedIds.has(notif.id)} onChange={() => toggleSelection(notif.id)} style={{ cursor: 'pointer' }} />
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {notif.imageUrl ? (
                                                <img src={notif.imageUrl} alt="banner" style={{ height: '40px', width: '56px', objectFit: 'cover', borderRadius: '8px' }} />
                                            ) : (
                                                <div style={{ height: '40px', width: '56px', background: 'var(--bg3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text2)', border: '1px solid var(--border)' }}>No Img</div>
                                            )}
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{notif.title}</div>
                                                <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{notif.type}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                                            {notif.audience}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '12px', color: 'var(--text2)', fontWeight: 500 }}>{getSenderName(notif.createdBy)}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '12px', color: 'var(--text)' }}>
                                            {notif.scheduledAt ? new Date(notif.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Immediate'}
                                        </div>
                                        {notif.expiryDate && <div style={{ fontSize: '10px', color: 'var(--danger)', marginTop: '2px' }}>Exp: {new Date(notif.expiryDate).toLocaleDateString()}</div>}
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '12px', color: 'var(--text2)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span>Reads: <strong style={{ color: 'var(--text)' }}>{notif.deliveryTracking?.read || 0}</strong></span>
                                            <span>Delivered: <strong style={{ color: 'var(--text)' }}>{notif.deliveryTracking?.delivered || 0}</strong></span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                                            <span className={`badge ${notif.published ? 'badge-paid' : 'badge-info'}`}>
                                                {notif.published ? 'Published' : 'Draft'}
                                            </span>
                                            <PriorityBadge priority={notif.priority} />
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', color: 'var(--text2)' }}>
                                            <ActionButton icon={FiEye} onClick={() => navigate(`/notifications/${notif.id}`)} title="View" />
                                            <ActionButton icon={FiEdit2} onClick={() => navigate(`/notifications/create?edit=${notif.id}`)} title="Edit" />
                                            <ActionButton icon={FiCopy} onClick={() => handleDuplicate(notif.id)} title="Duplicate" />
                                            <ActionButton icon={notif.published ? FiArchive : FiSend} onClick={() => handlePublishToggle(notif.id, notif.published)} title={notif.published ? 'Unpublish' : 'Publish'} />
                                            <ActionButton icon={FiRepeat} onClick={() => handleResend(notif.id)} title="Resend" />
                                            <ActionButton icon={FiTrash2} onClick={() => handleDelete(notif.id)} title="Delete" color="var(--danger)" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {hasMore && filteredList.length > 0 && (
                    <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', background: 'var(--bg3)' }}>
                        <button 
                            onClick={handleLoadMore} 
                            disabled={loadingMore}
                            className="btn btn-ghost"
                        >
                            {loadingMore ? 'Loading...' : 'Load More Results'}
                        </button>
                    </div>
                )}
                {!hasMore && filteredList.length > 0 && (
                    <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', background: 'var(--bg3)' }}>
                        <p style={{ fontSize: '12px', color: 'var(--text2)' }}>End of results</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function FilterSelect({ value, onChange, options }: { value: string, onChange: (v: string) => void, options: string[] }) {
    return (
        <select 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            style={{ 
                background: 'var(--bg3)', 
                border: '1px solid var(--border)', 
                borderRadius: '8px', 
                padding: '8px 12px', 
                fontSize: '13px',
                color: 'var(--text)',
                outline: 'none',
                cursor: 'pointer'
            }}
        >
            {options.map(opt => (
                <option key={opt} value={opt === options[0] ? 'All' : opt}>{opt}</option>
            ))}
        </select>
    );
}

function PriorityBadge({ priority }: { priority: string }) {
    let badgeClass = 'badge';
    if (priority === 'Important' || priority === 'High' || priority === 'Urgent') {
        badgeClass += ' badge-pending';
    } else if (priority === 'Normal') {
        badgeClass += ' badge-paid';
    } else {
        badgeClass += ' badge-warning';
    }
    
    return (
        <span className={badgeClass}>
            {priority}
        </span>
    );
}

function ActionButton({ icon: Icon, onClick, title, color }: any) {
    return (
        <button onClick={onClick} title={title} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: color || 'var(--text2)' }}>
            <Icon size={16} />
        </button>
    );
}
