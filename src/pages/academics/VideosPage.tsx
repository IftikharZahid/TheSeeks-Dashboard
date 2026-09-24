import React, { useState, useEffect, useMemo } from 'react';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchVideos, addOrUpdateGallery, deleteGallery } from '../../store/slices/generalSlice';
import { fetchClasses, fetchBooks } from '../../store/slices/appSettingsSlice';
import { fetchTeachers } from '../../store/slices/teachersSlice';
import { RootState } from '../../store/store';

export interface Video {
    id: string;
    title: string;
    youtubeUrl: string;
    duration?: string;
    chapterNo?: string;
    chapterName?: string;
}

export interface Gallery {
    id: string;
    name: string;
    description: string;
    thumbnail: string;
    videos: Video[];
    targetClass?: string;
    teacherName?: string;
}

const getGalleryStyle = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('math')) return { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m-3-3v6m-4 5h8m-8 4h8"/></svg> };
    if (n.includes('computer') || n.includes('program')) return { bg: 'rgba(14, 165, 233, 0.15)', text: '#38bdf8', icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg> };
    if (n.includes('data')) return { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 7v10c0 2 3.5 3.5 8 3.5s8-1.5 8-3.5V7"/><path d="M12 10.5c-4.5 0-8-1.5-8-3.5s3.5-3.5 8-3.5 8 1.5 8 3.5-3.5 3.5-8 3.5z"/></svg> };
    if (n.includes('web') || n.includes('js')) return { bg: 'rgba(234, 179, 8, 0.15)', text: '#facc15', icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg> };
    if (n.includes('phys')) return { bg: 'rgba(244, 63, 94, 0.15)', text: '#fb7185', icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l2-1v-2.5M18 18l2 1v-2.5"/></svg> };
    return { bg: 'rgba(100, 116, 139, 0.15)', text: '#94a3b8', icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v12H4z"/></svg> };
};

const calculateTotalDuration = (videos: Video[] | undefined) => {
    if (!videos || videos.length === 0) return '0m';
    
    let totalMinutes = 0;
    videos.forEach(v => {
        if (!v.duration) return;
        const d = v.duration.toLowerCase().trim();
        if (d.includes('h') || d.includes('m')) {
            let h = 0, m = 0;
            const hMatch = d.match(/(\d+)\s*h/);
            const mMatch = d.match(/(\d+)\s*m/);
            if (hMatch) h = parseInt(hMatch[1]);
            if (mMatch) m = parseInt(mMatch[1]);
            totalMinutes += h * 60 + m;
        } else if (d.includes(':')) {
            const parts = d.split(':').map(Number);
            if (parts.length === 3) {
                totalMinutes += parts[0] * 60 + parts[1] + Math.round(parts[2] / 60);
            } else if (parts.length === 2) {
                totalMinutes += parts[0] + Math.round(parts[1] / 60);
            }
        } else if (!isNaN(Number(d))) {
            totalMinutes += Number(d);
        }
    });

    if (totalMinutes === 0) return '0m';
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.floor(totalMinutes % 60);
    if (hours > 0) return `${hours}h ${mins > 0 ? mins + 'm' : ''}`.trim();
    return `${mins}m`;
};

export default function VideosPage() {
    const dispatch = useAppDispatch();
    const { videos: galleries, videosStatus: status } = useAppSelector((s: RootState) => s.general);
    const classes = useAppSelector((s: RootState) => s.appSettings.classes as string[]);
    const classesStatus = useAppSelector((s: RootState) => s.appSettings.classesStatus);
    const booksStatus = useAppSelector((s: RootState) => s.appSettings.booksStatus);
    const subjectsList = useAppSelector((s: any) => s.appSettings.books || []);
    const teachersStatus = useAppSelector((s: any) => s.teachers?.status);
    const teachers = useAppSelector((s: any) => s.teachers?.data || []);
    const loading = status === 'loading' || status === 'idle' || classesStatus === 'loading' || classesStatus === 'idle';

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClass, setSelectedClass] = useState<string>('');

    // Modals
    const [galleryModalOpen, setGalleryModalOpen] = useState(false);
    const [videosListOpen, setVideosListOpen] = useState(false);
    const [videoModalOpen, setVideoModalOpen] = useState(false);

    // Edit states
    const [editingGallery, setEditingGallery] = useState<Gallery | null>(null);
    const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
    const [editingVideo, setEditingVideo] = useState<Video | null>(null);

    const [saving, setSaving] = useState(false);

    // Gallery Form
    const [gName, setGName] = useState('');
    const [gDesc, setGDesc] = useState('');
    const [gThumb, setGThumb] = useState('');
    const [gClass, setGClass] = useState('');
    const [gTeacherName, setGTeacherName] = useState('');

    // Video Form
    const [vTitle, setVTitle] = useState('');
    const [vUrl, setVUrl] = useState('');
    const [vDur, setVDur] = useState('');
    const [vChapter, setVChapter] = useState('1');
    const [vChapterName, setVChapterName] = useState('');

    useEffect(() => { 
        if (status === 'idle') dispatch(fetchVideos()); 
        if (classesStatus === 'idle') dispatch(fetchClasses());
        if (booksStatus === 'idle') dispatch(fetchBooks());
        if (teachersStatus === 'idle') dispatch(fetchTeachers());
    }, [dispatch, status, classesStatus, booksStatus, teachersStatus]);

    // Default class effect removed to keep 'All Classes' as default

    const selectedGallery = useMemo(() => galleries.find((g: Gallery) => g.id === selectedGalleryId), [galleries, selectedGalleryId]);

    const filteredGalleries = galleries.filter((g: Gallery) =>
        (selectedClass === '' || g.targetClass === selectedClass) &&
        ((g.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.description || '').toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // --- Gallery CRUD ---
    const openAddGallery = () => {
        setEditingGallery(null);
        setGName(''); setGDesc(''); setGThumb(''); setGClass(selectedClass); setGTeacherName('');
        setGalleryModalOpen(true);
    };

    const openEditGallery = (g: Gallery) => {
        setEditingGallery(g);
        setGName(g.name || ''); setGDesc(g.description || ''); setGThumb(g.thumbnail || ''); setGClass(g.targetClass || selectedClass); setGTeacherName(g.teacherName || '');
        setGalleryModalOpen(true);
    };

    const saveGallery = async () => {
        if (!gName) { alert('Gallery name is required.'); return; }
        if (!gClass) { alert('Target class is required.'); return; }
        setSaving(true);
        try {
            const id = editingGallery?.id || Date.now().toString();
            const payload = {
                id,
                name: gName,
                description: gDesc || '',
                thumbnail: gThumb || '',
                videos: editingGallery ? editingGallery.videos || [] : [],
                targetClass: gClass,
                teacherName: gTeacherName,
            } as Gallery;

            dispatch(addOrUpdateGallery(payload));
            setGalleryModalOpen(false);

            await setDoc(doc(db, 'videoGalleries', id), {
                ...payload,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (e) {
            alert('Failed to save gallery');
        }
        setSaving(false);
    };

    const removeGallery = async (id: string) => {
        if (!confirm('Are you sure you want to delete this gallery and all its videos?')) return;
        try {
            dispatch(deleteGallery(id));
            await deleteDoc(doc(db, 'videoGalleries', id));
        } catch (e) { alert('Failed to delete.'); }
    };

    // --- Video CRUD ---
    const openVideosList = (g: Gallery) => {
        setSelectedGalleryId(g.id);
        setVideosListOpen(true);
    };

    const openAddVideo = () => {
        setEditingVideo(null);
        setVTitle(''); setVUrl(''); setVDur('');
        
        const lastVideo = selectedGallery?.videos?.[selectedGallery.videos.length - 1];
        setVChapter(lastVideo?.chapterNo || '1');
        setVChapterName(lastVideo?.chapterName || '');
        
        setVideoModalOpen(true);
    };

    const openEditVideo = (v: Video) => {
        setEditingVideo(v);
        setVTitle(v.title || ''); setVUrl(v.youtubeUrl || ''); setVDur(v.duration || ''); setVChapter(v.chapterNo || '1'); setVChapterName(v.chapterName || '');
        setVideoModalOpen(true);
    };

    const saveVideo = async () => {
        if (!vTitle || !vUrl || !selectedGallery) { alert('Title and URL required.'); return; }

        const isDup = selectedGallery.videos?.some((v: Video) => v.youtubeUrl === vUrl && v.id !== editingVideo?.id);
        if (isDup) { alert('This video URL already exists in this gallery.'); return; }

        setSaving(true);
        try {
            const newVideo: Video = {
                id: editingVideo?.id || Date.now().toString(),
                title: vTitle,
                youtubeUrl: vUrl,
                duration: vDur || '',
                chapterNo: vChapter || '1',
                chapterName: vChapterName || ''
            };

            let updated;
            if (editingVideo) {
                updated = (selectedGallery.videos || []).map((v: Video) => v.id === editingVideo.id ? newVideo : v);
            } else {
                updated = [...(selectedGallery.videos || []), newVideo];
            }

            dispatch(addOrUpdateGallery({ ...selectedGallery, videos: updated }));
            setVideoModalOpen(false);

            await setDoc(doc(db, 'videoGalleries', selectedGallery.id), { videos: updated }, { merge: true });
        } catch (e) {
            alert('Failed to save video');
        }
        setSaving(false);
    };

    const removeVideo = async (vId: string) => {
        if (!selectedGallery) return;
        if (!confirm('Remove this video?')) return;
        try {
            const updated = (selectedGallery.videos || []).filter((v: Video) => v.id !== vId);
            dispatch(addOrUpdateGallery({ ...selectedGallery, videos: updated }));
            await setDoc(doc(db, 'videoGalleries', selectedGallery.id), { videos: updated }, { merge: true });
        } catch (e) { alert('Failed to delete video'); }
    };

    return (
        <div className="page" style={{ padding: '0px', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

            {/* Compact Header */}
            <div className="page-header" style={{ padding: '10px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)', zIndex: 10, flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>🎥 Video Galleries</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>Manage educational video galleries by class and subject</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {[
                            { label: 'Galleries', val: galleries.length, color: '#818cf8' },
                            { label: 'Videos', val: galleries.reduce((acc, g) => acc + (g.videos?.length || 0), 0), color: '#10b981' },
                        ].map(item => (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px' }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: item.color }}>{item.val}</span>
                                <span style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{item.label}</span>
                            </div>
                        ))}
                        <button className="btn btn-primary" onClick={openAddGallery} style={{ height: 30, padding: '0 12px', fontSize: 12, fontWeight: 600 }}>
                            + Add New Gallery
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ padding: '10px 24px 0', flex: 1, overflowY: 'auto' }}>

                {/* Filter Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                        <button 
                            onClick={() => setSelectedClass('')}
                            style={{ 
                                padding: '6px 16px', borderRadius: 20, border: '1px solid', 
                                background: selectedClass === '' ? 'var(--primary)' : 'transparent',
                                borderColor: selectedClass === '' ? 'var(--primary)' : 'var(--border)',
                                color: selectedClass === '' ? '#fff' : 'var(--text2)',
                                fontWeight: 600, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            All Classes
                        </button>
                        {[...classes].sort((a, b) => {
                            const numA = parseInt(a) || (a.toLowerCase().includes('1st') ? 11 : a.toLowerCase().includes('2nd') ? 12 : 99);
                            const numB = parseInt(b) || (b.toLowerCase().includes('1st') ? 11 : b.toLowerCase().includes('2nd') ? 12 : 99);
                            return numA - numB;
                        }).map(c => (
                            <button 
                                key={c}
                                onClick={() => setSelectedClass(c)}
                                style={{ 
                                    padding: '6px 16px', borderRadius: 20, border: '1px solid', 
                                    background: selectedClass === c ? 'var(--primary)' : 'transparent',
                                    borderColor: selectedClass === c ? 'var(--primary)' : 'var(--border)',
                                    color: selectedClass === c ? '#fff' : 'var(--text2)',
                                    fontWeight: 600, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 10px', height: 32, color: 'var(--text2)', fontSize: 12, gap: 6, cursor: 'pointer' }}>
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                            All Status
                            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 10px', height: 32, width: 200 }}>
                            <span style={{ color: 'var(--text2)', marginRight: 6, fontSize: 12 }}>🔍</span>
                            <input 
                                placeholder="Search galleries..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ fontSize: 12, background: 'transparent', border: 'none', outline: 'none', width: '100%' }}
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="loading" style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}><div className="spinner" style={{ marginRight: 10 }} /> Loading...</div>
                ) : (
                    <div style={{ marginTop: 16 }}>
                        {/* Table Header */}
                        <div style={{ display: 'flex', padding: '0 20px 12px', color: 'var(--text2)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            <div style={{ flex: 3 }}>Gallery Details</div>
                            <div style={{ flex: 1, textAlign: 'center' }}>Videos</div>
                            <div style={{ flex: 1, textAlign: 'center' }}>Total Duration</div>
                            <div style={{ flex: 1, textAlign: 'center' }}>Status</div>
                            <div style={{ width: 80, textAlign: 'right' }}>Actions</div>
                        </div>

                        {filteredGalleries.length === 0 ? (
                            <div className="empty" style={{ padding: 40, fontSize: 13, textAlign: 'center', background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)' }}>No galleries found.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {filteredGalleries.map((g: Gallery) => {
                                    const style = getGalleryStyle(g.name);
                                    return (
                                        <div key={g.id} onClick={() => openVideosList(g)} style={{ display: 'flex', alignItems: 'center', background: 'var(--card)', borderRadius: 10, padding: '12px 20px', border: '1px solid var(--border)', cursor: 'pointer' }}>
                                            {/* GALLERY DETAILS */}
                                            <div style={{ flex: 3, display: 'flex', alignItems: 'center', gap: 16 }}>
                                                <div style={{ width: 44, height: 44, borderRadius: 10, background: style.bg, color: style.text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    {style.icon}
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                                                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{g.name}</div>
                                                        {g.targetClass && (
                                                            <div style={{ fontSize: 10, fontWeight: 600, background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '2px 6px', borderRadius: 4 }}>{g.targetClass}</div>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{g.description || 'No description provided'}</div>
                                                    <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text3)' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> Created: 12 May 2026</span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Updated: 08 Jun 2026</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* VIDEOS */}
                                            <div style={{ flex: 1, textAlign: 'center' }}>
                                                <div style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>{g.videos?.length || 0}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>Videos</div>
                                            </div>
                                            
                                            {/* TOTAL DURATION */}
                                            <div style={{ flex: 1, textAlign: 'center' }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{calculateTotalDuration(g.videos)}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>Total Duration</div>
                                            </div>
                                            
                                            {/* STATUS */}
                                            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                                                    <div style={{ width: 6, height: 6, borderRadius: 3, background: '#34d399' }}></div>
                                                    Published
                                                </div>
                                            </div>
                                            
                                            {/* ACTIONS */}
                                            <div style={{ width: 80, display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                                <button style={{ width: 28, height: 28, padding: 0, borderRadius: 6, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); openEditGallery(g); }}>
                                                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                                </button>
                                                <button style={{ width: 28, height: 28, padding: 0, borderRadius: 6, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); removeGallery(g.id); }} title="Delete Gallery">
                                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Pagination Footer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', marginTop: 16, borderTop: '1px solid var(--border)' }}>
                            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Showing 1 to {filteredGalleries.length} of {filteredGalleries.length} galleries</div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>&lt;</button>
                                <button style={{ width: 28, height: 28, borderRadius: 6, background: '#3b82f6', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>1</button>
                                <button style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>2</button>
                                <button style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>3</button>
                                <button style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>&gt;</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Gallery Modal */}
            {galleryModalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setGalleryModalOpen(false)}>
                    <div className="modal" style={{ width: 540, borderRadius: 12, overflow: 'hidden' }}>
                        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div className="modal-title" style={{ fontSize: 16, fontWeight: 600 }}>{editingGallery ? 'Edit Gallery' : 'New Gallery'}</div>
                            <button className="modal-close" style={{ background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 4, display: 'flex' }} onClick={() => setGalleryModalOpen(false)}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="modal-body" style={{ padding: 24, background: 'var(--bg)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>Target Class *</label>
                                    <select className="form-input" style={{ height: 40, fontSize: 14, borderRadius: 8, padding: '0 12px' }} value={gClass} onChange={e => setGClass(e.target.value)}>
                                        <option value="">Select Class</option>
                                        {classes.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>Subject *</label>
                                    <select className="form-input" style={{ height: 40, fontSize: 14, borderRadius: 8, padding: '0 12px' }} value={gName} onChange={e => {
                                        const val = e.target.value;
                                        setGName(val);
                                        if (val) {
                                            const rel = teachers.filter((t: any) => {
                                                const subjStr = t.subject || '';
                                                const subjArr = subjStr.split(',').map((s: string) => s.trim()).filter(Boolean);
                                                return subjArr.includes(val) || (t.subjects && t.subjects.includes(val));
                                            });
                                            if (rel.length === 1) {
                                                setGTeacherName(rel[0].name);
                                            } else {
                                                setGTeacherName('');
                                            }
                                        } else {
                                            setGTeacherName('');
                                        }
                                    }}>
                                        <option value="">Select Subject</option>
                                        {gName && !subjectsList.includes(gName) && <option value={gName}>{gName}</option>}
                                        {subjectsList.map((s: string) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>Respective Teacher</label>
                                    <select className="form-input" style={{ height: 40, fontSize: 14, borderRadius: 8, padding: '0 12px' }} value={gTeacherName} onChange={e => setGTeacherName(e.target.value)}>
                                        <option value="">Select Teacher (Optional)</option>
                                        {gTeacherName && !teachers.find((t: any) => t.name === gTeacherName) && <option value={gTeacherName}>{gTeacherName}</option>}
                                        {(() => {
                                            const filtered = gName ? teachers.filter((t: any) => {
                                                const subjStr = t.subject || '';
                                                const subjArr = subjStr.split(',').map((s: string) => s.trim()).filter(Boolean);
                                                return subjArr.includes(gName) || (t.subjects && t.subjects.includes(gName));
                                            }) : teachers;
                                            const displayTeachers = filtered.length > 0 ? filtered : teachers;
                                            return displayTeachers.map((t: any) => <option key={t.id} value={t.name}>{t.name}</option>);
                                        })()}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>Thumbnail URL</label>
                                    <input className="form-input" style={{ height: 40, fontSize: 14, borderRadius: 8, padding: '0 12px' }} placeholder="https://..." value={gThumb} onChange={e => setGThumb(e.target.value)} />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>Description</label>
                                <textarea className="form-input" style={{ resize: 'vertical', minHeight: 80, fontSize: 14, borderRadius: 8, padding: '12px' }} placeholder="Brief description..." value={gDesc} onChange={e => setGDesc(e.target.value)} />
                                {gThumb && <img src={gThumb} alt="preview" style={{ marginTop: 12, borderRadius: 8, width: 80, height: 80, objectFit: 'cover', border: '1px solid var(--border)' }} onError={e => (e.target as HTMLImageElement).style.display = 'none'} />}
                            </div>
                        </div>
                        <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--card)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button className="btn btn-ghost" style={{ height: 38, fontSize: 14, borderRadius: 8, padding: '0 20px', fontWeight: 500 }} onClick={() => setGalleryModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" style={{ height: 38, fontSize: 14, borderRadius: 8, padding: '0 20px', fontWeight: 500 }} disabled={saving} onClick={saveGallery}>{saving ? 'Saving...' : 'Save Gallery'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Videos List within Gallery Modal */}
            {videosListOpen && selectedGallery && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setVideosListOpen(false)} style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal" style={{ width: 700, maxWidth: '95%', height: '85vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', padding: 0, borderRadius: 12 }}>
                        
                        {/* Header */}
                        <div className="modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--card)', borderTopLeftRadius: 12, borderTopRightRadius: 12, display: 'flex', alignItems: 'center' }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h16v12H4z" opacity="0.2"/><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM10 9l6 3-6 3V9z"/></svg>
                                </div>
                                <div>
                                    <div className="modal-title" style={{ fontSize: 16, margin: 0 }}>{selectedGallery.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{selectedGallery.videos?.length || 0} Videos Total</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <button className="btn btn-primary" style={{ height: 36, padding: '0 16px', fontSize: 13, borderRadius: 8, fontWeight: 500 }} onClick={openAddVideo}>+ Add Video</button>
                                <button className="modal-close" style={{ background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 4, display: 'flex' }} onClick={() => setVideosListOpen(false)}>
                                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                </button>
                            </div>
                        </div>

                        {/* Videos Content */}
                        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                             {(!selectedGallery.videos || selectedGallery.videos.length === 0) ? (
                                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                    <div style={{ width: 64, height: 64, borderRadius: 32, background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                        <svg width="32" height="32" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                    </div>
                                    <h3 style={{ margin: '0 0 8px', color: 'var(--text)', fontSize: 16 }}>No videos yet</h3>
                                    <p style={{ margin: '0 0 20px', color: 'var(--text2)', fontSize: 13 }}>Click the button above to add the first video.</p>
                                </div>
                             ) : (
                                  (() => {
                                      // Group videos by chapter
                                      const grouped: { [key: number]: Video[] } = {};
                                      selectedGallery.videos.forEach(v => {
                                          const ch = parseInt(v.chapterNo || '1') || 1;
                                          if (!grouped[ch]) grouped[ch] = [];
                                          grouped[ch].push(v);
                                      });

                                      const sortedChapters = Object.keys(grouped).map(Number).sort((a,b) => a - b);

                                      return sortedChapters.map(ch => (
                                          <div key={ch} style={{ marginBottom: 24 }}>
                                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, display: 'flex', alignItems: 'center' }}>
                                                  Chapter {ch}
                                                  <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 12 }}></div>
                                              </div>
                                              <div className="table-wrap" style={{ margin: 0 }}>
                                                  <table className="table" style={{ margin: 0 }}>
                                                      <tbody>
                                                          {grouped[ch].map((v, idx) => (
                                                              <tr key={v.id}>
                                                                  <td style={{ width: 40, color: 'var(--text2)', fontWeight: 500, textAlign: 'center' }}>{idx + 1}</td>
                                                                  <td style={{ width: 40 }}>
                                                                      <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                                      </div>
                                                                  </td>
                                                                  <td>
                                                                      <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text)' }}>{v.title}</div>
                                                                  </td>
                                                                  <td style={{ width: 80, fontSize: 12, color: 'var(--text2)' }}>
                                                                      {v.duration || '--:--'}
                                                                  </td>
                                                                  <td style={{ width: 80, textAlign: 'right' }}>
                                                                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                                                                          <button className="btn btn-ghost" style={{ padding: 4, width: 26, height: 26, minHeight: 0, color: 'var(--text2)' }} onClick={() => openEditVideo(v)}>
                                                                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                                                          </button>
                                                                          <button className="btn btn-ghost" style={{ padding: 4, width: 26, height: 26, minHeight: 0, color: '#ef4444' }} onClick={() => removeVideo(v.id)}>
                                                                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                                                                          </button>
                                                                      </div>
                                                                  </td>
                                                              </tr>
                                                          ))}
                                                      </tbody>
                                                  </table>
                                              </div>
                                          </div>
                                      ));
                                  })()
                             )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add / Edit Video Modal */}
            {videoModalOpen && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setVideoModalOpen(false)} style={{ zIndex: 300 }}>
                    <div className="modal" style={{ width: 460, borderRadius: 12, overflow: 'hidden' }}>
                        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div className="modal-title" style={{ fontSize: 16, fontWeight: 600 }}>{editingVideo ? 'Edit Video' : 'Add Video'}</div>
                            <button className="modal-close" style={{ background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 4, display: 'flex' }} onClick={() => setVideoModalOpen(false)}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="modal-body" style={{ padding: 24, background: 'var(--bg)' }}>
                            <div className="form-group" style={{ marginBottom: 20 }}>
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>Video Title *</label>
                                <input className="form-input" style={{ height: 40, fontSize: 14, borderRadius: 8, padding: '0 12px' }} placeholder="e.g. Lecture 1: Basics" value={vTitle} onChange={e => setVTitle(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 20 }}>
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>YouTube URL *</label>
                                <input className="form-input" style={{ height: 40, fontSize: 14, borderRadius: 8, padding: '0 12px' }} placeholder="https://youtube.com/watch?v=..." value={vUrl} onChange={e => setVUrl(e.target.value)} />
                            </div>
                            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginTop: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                    Video Metadata
                                </div>
                                <div className="form-row" style={{ marginBottom: 0, display: 'flex', gap: 12 }}>
                                    <div className="form-group" style={{ marginBottom: 0, width: 70 }}>
                                        <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>Ch.</label>
                                        <input className="form-input" style={{ height: 36, fontSize: 13, borderRadius: 8, padding: '0 8px', width: '100%', textAlign: 'center', background: 'var(--bg)' }} type="number" min="1" placeholder="1" value={vChapter} onChange={e => setVChapter(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                        <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>Chapter Name</label>
                                        <input className="form-input" style={{ height: 36, fontSize: 13, borderRadius: 8, padding: '0 12px', width: '100%', background: 'var(--bg)' }} placeholder="e.g. Sets & Functions" value={vChapterName} onChange={e => setVChapterName(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0, width: 110 }}>
                                        <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>Duration</label>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none', color: 'var(--text2)' }}>
                                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                                            </div>
                                            <input className="form-input" style={{ height: 36, fontSize: 13, borderRadius: 8, padding: '0 12px 0 30px', width: '100%', background: 'var(--bg)' }} placeholder="00:00" value={vDur} onChange={e => setVDur(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--card)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button className="btn btn-ghost" style={{ height: 38, fontSize: 14, borderRadius: 8, padding: '0 20px', fontWeight: 500 }} onClick={() => setVideoModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" style={{ height: 38, fontSize: 14, borderRadius: 8, padding: '0 20px', fontWeight: 500 }} disabled={saving} onClick={saveVideo}>{saving ? 'Saving...' : 'Save Video'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
