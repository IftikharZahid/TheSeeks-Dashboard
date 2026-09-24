import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Modal } from './SettingsPage';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchStudents } from '../../store/slices/studentsSlice';
import { fetchTeachers } from '../../store/slices/teachersSlice';
import { QRCodeSVG } from 'qrcode.react';
import seeksLogo from '../../assets/the-seeks-logo.png';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CardData {
    name: string;
    secondaryLabel: string;   // Father Name (student) | Qualification (staff)
    tertiary: string;         // Class (student)       | Designation/Role (staff)
    idNumber: string;         // Roll No (student)     | Teacher ID (staff)
    phone: string;
    photo: string | null;
    issueDate: string;
    expiryDate: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d: Date): string =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();

const DARK = '#041B3B'; // Exact Dark Navy from the design
const GOLD = '#C3A03B'; // Muted gold for dividers
const GOLD2 = '#D4A017'; // Rich gold for borders and accents

// ─── SVG Icons (small, filled, amber) ────────────────────────────────────────
const PersonIcon = () => (
    <svg viewBox="0 0 24 24" fill={GOLD2} width="16" height="16">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
);
const FamilyIcon = () => (
    <svg viewBox="0 0 24 24" fill={GOLD2} width="16" height="16">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
);
const CapIcon = () => (
    <svg viewBox="0 0 24 24" fill={GOLD2} width="16" height="16">
        <path d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
    </svg>
);
const BookIcon = () => (
    <svg viewBox="0 0 24 24" fill={GOLD2} width="16" height="16">
        <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
    </svg>
);
const CalendarIcon = () => (
    <svg viewBox="0 0 24 24" fill={GOLD2} width="16" height="16">
        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
    </svg>
);
const CalendarXIcon = () => (
    <svg viewBox="0 0 24 24" fill={GOLD2} width="16" height="16">
        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zm-8.53-3.47l-2.47-2.47 1.41-1.41 1.06 1.06 3.53-3.54 1.41 1.42z" />
    </svg>
);
const LocationIcon = () => (
    <svg viewBox="0 0 24 24" fill={GOLD2} width="20" height="20">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
);
const PhoneIcon = () => (
    <svg viewBox="0 0 24 24" fill={GOLD2} width="18" height="18">
        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
);

// ─── Single data row on the ID card ──────────────────────────────────────────
const CardRow = ({ icon, label, value, red = false }: { icon: React.ReactNode; label: string; value: string; red?: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon}
        </div>
        <div style={{ flex: 1, borderBottom: `1px dashed ${GOLD}`, paddingBottom: 2 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#475569', letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: "'Montserrat', sans-serif" }}>{label}</div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: red ? '#D32F2F' : DARK, textTransform: 'uppercase', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Montserrat', sans-serif" }}>{value || '---'}</div>
        </div>
    </div>
);

// ─── Shield badge (pure SVG) ──────────────────────────────────────────────────
const Shield = () => (
    <svg viewBox="0 0 90 104" width="70" height="80">
        <path d="M45 3 L87 20 L87 56 C87 82 67 100 45 104 C23 100 3 82 3 56 L3 20 Z" fill={DARK} stroke={GOLD2} strokeWidth="3.5" />
        <path d="M45 10 L80 25 L80 56 C80 79 62 95 45 98 C28 95 10 79 10 56 L10 25 Z" fill="none" stroke={GOLD2} strokeWidth="1" strokeDasharray="2.5,2" />
        {/* grad cap */}
        <polygon points="45,31 27,40 45,49 63,40" fill={GOLD2} />
        <line x1="57" y1="40" x2="57" y2="53" stroke={GOLD2} strokeWidth="1.8" />
        <ellipse cx="57" cy="54" rx="3.5" ry="2" fill={GOLD2} />
        <line x1="45" y1="49" x2="45" y2="59" stroke={GOLD2} strokeWidth="1.5" />
        <rect x="38" y="59" width="14" height="9" rx="2" fill={GOLD2} />
        {/* stars */}
        <polygon points="45,16 46.4,20.8 51.4,20.8 47.5,23.6 48.9,28.4 45,25.6 41.1,28.4 42.5,23.6 38.6,20.8 43.6,20.8" fill={GOLD2} />
        <polygon points="29,24 29.9,27 33,27 30.5,28.8 31.4,31.8 29,30 26.6,31.8 27.5,28.8 25,27 28.1,27" fill={GOLD2} />
        <polygon points="61,24 61.9,27 65,27 62.5,28.8 63.4,31.8 61,30 58.6,31.8 59.5,28.8 57,27 60.1,27" fill={GOLD2} />
        {/* laurels */}
        <path d="M23,74 Q17,67 21,61 Q25,67 23,74" fill={GOLD2} opacity="0.75" />
        <path d="M67,74 Q73,67 69,61 Q65,67 67,74" fill={GOLD2} opacity="0.75" />
    </svg>
);

// ─── QR placeholder (pure SVG) ───────────────────────────────────────────────
const QR = () => (
    <svg viewBox="0 0 80 80" width="60" height="60" style={{ display: 'block' }}>
        <rect width="80" height="80" fill="#fff" />
        <rect x="3" y="3" width="22" height="22" fill="none" stroke="#000" strokeWidth="2.5" />
        <rect x="8" y="8" width="12" height="12" fill="#000" />
        <rect x="55" y="3" width="22" height="22" fill="none" stroke="#000" strokeWidth="2.5" />
        <rect x="60" y="8" width="12" height="12" fill="#000" />
        <rect x="3" y="55" width="22" height="22" fill="none" stroke="#000" strokeWidth="2.5" />
        <rect x="8" y="60" width="12" height="12" fill="#000" />
        {[
            [30, 3], [38, 3], [46, 3], [30, 10], [46, 10], [30, 17], [38, 17],
            [3, 30], [10, 30], [3, 38], [18, 38], [3, 46], [10, 46],
            [30, 30], [38, 30], [46, 30], [55, 30], [63, 30], [71, 30],
            [55, 38], [71, 38], [55, 46], [63, 46],
            [30, 55], [38, 55], [46, 55], [63, 55], [71, 55],
            [30, 63], [46, 63], [55, 63], [30, 71], [38, 71], [46, 71], [63, 71],
        ].map(([x, y], i) => <rect key={i} x={x} y={y} width="5" height="5" fill="#000" />)}
    </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Card_Generator({ onClose }: { onClose: () => void }) {
    const dispatch = useAppDispatch();
    const students = useAppSelector((s: any) => s.students?.data ?? []);
    const teachers = useAppSelector((s: any) => s.teachers?.data ?? []);

    useEffect(() => {
        dispatch(fetchStudents());
        dispatch(fetchTeachers());
    }, [dispatch]);

    const [idRole, setIdRole] = useState<'Student' | 'Staff'>('Student');
    const [searchQ, setSearchQ] = useState('');
    const [showDrop, setShowDrop] = useState(false);
    const [generating, setGenerating] = useState(false);

    const [card, setCard] = useState<CardData>({
        name: '', secondaryLabel: '', tertiary: '', idNumber: '',
        phone: '', photo: null, issueDate: '', expiryDate: '',
    });

    const [issueDateRaw, setIssueDateRaw] = useState('');
    const [expiryDateRaw, setExpiryDateRaw] = useState('');

    // Dynamically load elegant signature fonts and Montserrat/Playfair Display
    useEffect(() => {
        if (!document.getElementById('card-fonts')) {
            const link = document.createElement('link');
            link.id = 'card-fonts';
            link.href = 'https://fonts.googleapis.com/css2?family=Alex+Brush&family=Great+Vibes&family=Montserrat:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;900&display=swap';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
    }, []);

    useEffect(() => {
        const today = new Date();
        const next = new Date(); next.setFullYear(today.getFullYear() + 1);
        const toISO = (d: Date) => d.toISOString().split('T')[0];
        setIssueDateRaw(toISO(today));
        setExpiryDateRaw(toISO(next));
        setCard(c => ({ ...c, issueDate: fmtDate(today), expiryDate: fmtDate(next) }));
    }, []);

    const resetCard = () => {
        const today = new Date();
        const next = new Date(); next.setFullYear(today.getFullYear() + 1);
        setCard({ name: '', secondaryLabel: '', tertiary: '', idNumber: '', phone: '', photo: null, issueDate: fmtDate(today), expiryDate: fmtDate(next) });
        setSearchQ('');
    };

    const pool = (idRole === 'Student' ? students : teachers) as any[];
    const filtered = pool
        .filter(p => (p.name || '').toLowerCase().includes(searchQ.toLowerCase()))
        .slice(0, 7);

    const fetchImageBase64 = (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = url;
        });
    };

    const selectRecord = async (p: any) => {
        let photoData = idRole === 'Student' ? p.profileImage : p.image;
        
        // Optimistically set data without photo first
        if (idRole === 'Student') {
            setCard(c => ({
                ...c,
                name: p.name || '',
                secondaryLabel: p.fatherName || p.fathername || '',
                tertiary: p.grade || p.class || '',
                idNumber: p.rollno || p.studentId || '',
                phone: p.phone || '',
                photo: null,
            }));
        } else {
            setCard(c => ({
                ...c,
                name: p.name || '',
                secondaryLabel: p.qualification || p.qualifications || '',
                tertiary: p.role || p.subject || '',
                idNumber: p.teacherId || p.id || '',
                phone: p.phone || '',
                photo: null,
            }));
        }
        setSearchQ(p.name || '');
        setShowDrop(false);

        // Fetch image as Base64 to prevent html2canvas CORS issues
        if (photoData && photoData.startsWith('http')) {
            try {
                photoData = await fetchImageBase64(photoData);
                setCard(c => ({ ...c, photo: photoData }));
            } catch (e) {
                console.warn('Failed to convert image to base64 for CORS bypass', e);
                setCard(c => ({ ...c, photo: photoData })); // Fallback to URL
            }
        } else if (photoData) {
            setCard(c => ({ ...c, photo: photoData }));
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fr = new FileReader();
        fr.onload = ev => setCard(c => ({ ...c, photo: ev.target?.result as string }));
        fr.readAsDataURL(file);
    };

    const [errorMsg, setErrorMsg] = useState('');

    const handleDownload = async () => {
        setGenerating(true);
        setErrorMsg('');
        const elem = document.getElementById('id-card-preview');
        const wrapper = document.getElementById('id-card-wrapper');
        if (!elem) return;

        try {
            // Temporarily float the card wrapper to prevent browser reflow from stretching it
            let oldTransform = '', oldPos = '', oldTop = '', oldLeft = '', oldZ = '';
            if (wrapper) {
                oldTransform = wrapper.style.transform;
                oldPos = wrapper.style.position;
                oldTop = wrapper.style.top;
                oldLeft = wrapper.style.left;
                oldZ = wrapper.style.zIndex;

                wrapper.style.transition = 'none';
                wrapper.style.transform = 'none';
                wrapper.style.position = 'fixed';
                wrapper.style.top = '0';
                wrapper.style.left = '-9999px';
                wrapper.style.zIndex = '-9999';
                await new Promise(r => setTimeout(r, 300)); // wait for reflow
            }

            const canvasOptions = {
                scale: 3, // Professional print quality (300+ DPI for PVC Printers)
                width: 400, // Strictly enforce exact CR80 width
                height: 635, // Strictly enforce exact CR80 height
                useCORS: true,
                allowTaint: true,
                backgroundColor: null
            };

            const elemBack = document.getElementById('id-card-back');

            const frontCanvas = await html2canvas(elem, canvasOptions);
            const backCanvas = elemBack ? await html2canvas(elemBack, canvasOptions) : null;

            // Restore transform
            if (wrapper) {
                wrapper.style.transform = oldTransform;
                wrapper.style.position = oldPos;
                wrapper.style.top = oldTop;
                wrapper.style.left = oldLeft;
                wrapper.style.zIndex = oldZ;
            }

            // Download Front
            const frontLink = document.createElement('a');
            frontLink.download = `ID_Card_Front_${card.name.replace(/\s+/g, '_') || 'Preview'}.png`;
            frontLink.href = frontCanvas.toDataURL('image/png');
            frontLink.click();

            // Download Back
            if (backCanvas) {
                await new Promise(r => setTimeout(r, 500)); // small delay for browser to process first download
                const backLink = document.createElement('a');
                backLink.download = `ID_Card_Back_${card.name.replace(/\s+/g, '_') || 'Preview'}.png`;
                backLink.href = backCanvas.toDataURL('image/png');
                backLink.click();
            }
        } catch (error) {
            console.error('Error generating card:', error);
            setErrorMsg('Failed to generate professional ID Card. Some images could not be loaded.');
            setTimeout(() => setErrorMsg(''), 4000);
        } finally {
            setGenerating(false);
        }
    };

    const searchRef = useRef<HTMLDivElement>(null);

    const secondaryLbl = idRole === 'Student' ? 'Father Name' : 'Qualification';
    const tertiaryLbl = idRole === 'Student' ? 'Class' : 'Designation';
    const idNumberLbl = idRole === 'Student' ? 'Roll Number' : 'Employee ID';

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)', zIndex: 99999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '90px 20px 20px', fontFamily: "'Montserrat', sans-serif", overflow: 'auto' }}>
            
            {/* Professional Loading Dialog Overlay */}
            {generating && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: '30px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', width: '80%', maxWidth: 350 }}>
                        <div style={{ width: 40, height: 40, border: `4px solid #e2e8f0`, borderTopColor: GOLD2, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                        <div style={{ fontSize: 16, fontWeight: 800, color: DARK, marginTop: 20, fontFamily: "'Montserrat', sans-serif" }}>Generating Card...</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 8, textAlign: 'center', fontWeight: 500 }}>Please wait while we prepare your high-resolution ID card files.</div>
                    </div>
                </div>
            )}

            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 950, height: '85vh', minHeight: 600, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', margin: '0 auto' }}>
                {/* Premium Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '1px solid #e2e8f0', background: '#fff', zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ background: `${GOLD2}20`, padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 24, lineHeight: 1 }}>🪪</span>
                        </div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: DARK, letterSpacing: -0.5 }}>ID Card Studio</div>
                            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginTop: 2 }}>Design and export professional access credentials</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', width: 38, height: 38, borderRadius: '50%', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = DARK; }} onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
                    </button>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                    {/* ══════════ LEFT PANEL: INPUT FORM ══════════════════════════════════ */}
                    <div style={{ width: 320, flexShrink: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '20px', borderRight: '1px solid #e2e8f0', background: '#f8fafc', zIndex: 5 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: DARK, marginBottom: 4, display: 'block' }}>Card Type</label>
                                <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 8, padding: 4, border: '1px solid #cbd5e1', gap: 4 }}>
                                    {(['Student', 'Staff'] as const).map(r => (
                                        <button key={r} onClick={() => { setIdRole(r); resetCard(); }}
                                            style={{
                                                flex: 1, padding: '8px 0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
                                                background: idRole === r ? '#fff' : 'transparent', color: idRole === r ? DARK : '#64748b', boxShadow: idRole === r ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                            }}>
                                            {r === 'Student' ? '🎓 Student' : '👩‍🏫 Staff'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group" ref={searchRef} style={{ position: 'relative', margin: 0 }}>
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: DARK, marginBottom: 4, display: 'block' }}>Search & Auto-Fill ✨</label>
                                <input className="form-input" style={{ color: '#0f172a', padding: '10px 12px', fontSize: 13, border: `2px solid ${GOLD}`, borderRadius: 8, background: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', width: '100%', boxSizing: 'border-box' }} value={searchQ} placeholder={`Type ${idRole} name to autofill...`} onChange={e => { setSearchQ(e.target.value); setCard(c => ({ ...c, name: e.target.value })); setShowDrop(true); }} onFocus={() => setShowDrop(true)} onBlur={() => setTimeout(() => setShowDrop(false), 200)} />
                                {showDrop && searchQ && filtered.length > 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, zIndex: 300, maxHeight: 220, overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', marginTop: 8 }}>
                                        {filtered.map((p: any) => (
                                            <div key={p.id} onMouseDown={() => selectRecord(p)} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', color: DARK, display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.15s' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = '#fff'}>
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: '#e2e8f0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: DARK }}>
                                                    {(idRole === 'Student' ? p.profileImage : p.image) ? <img src={idRole === 'Student' ? p.profileImage : p.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (p.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: 12 }}>{p.name}</div>
                                                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>{idRole === 'Student' ? (p.grade || p.rollno || '') : (p.subject || p.qualification || '')}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <hr style={{ border: 0, borderBottom: '1px dashed #cbd5e1', margin: '2px 0' }} />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>{secondaryLbl}</label><input className="form-input" style={{ color: '#0f172a', padding: '8px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} value={card.secondaryLabel} onChange={e => setCard(c => ({ ...c, secondaryLabel: e.target.value }))} /></div>
                                <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>{tertiaryLbl}</label><input className="form-input" style={{ color: '#0f172a', padding: '8px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} value={card.tertiary} onChange={e => setCard(c => ({ ...c, tertiary: e.target.value }))} /></div>
                                <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>{idNumberLbl}</label><input className="form-input" style={{ color: '#0f172a', padding: '8px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} value={card.idNumber} onChange={e => setCard(c => ({ ...c, idNumber: e.target.value }))} /></div>
                                <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Phone</label><input className="form-input" style={{ color: '#0f172a', padding: '8px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} value={card.phone} placeholder="0300-0000000" onChange={e => setCard(c => ({ ...c, phone: e.target.value }))} /></div>
                                <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Issue Date</label><input type="date" className="form-input" style={{ color: '#0f172a', padding: '8px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} value={issueDateRaw} onChange={e => { setIssueDateRaw(e.target.value); if (e.target.value) setCard(c => ({ ...c, issueDate: fmtDate(new Date(e.target.value)) })); }} /></div>
                                <div className="form-group" style={{ margin: 0 }}><label className="form-label" style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Expiry Date</label><input type="date" className="form-input" style={{ color: '#0f172a', padding: '8px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} value={expiryDateRaw} onChange={e => { setExpiryDateRaw(e.target.value); if (e.target.value) setCard(c => ({ ...c, expiryDate: fmtDate(new Date(e.target.value)) })); }} /></div>
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'block' }}>Upload Photo (override)</label>
                                <input type="file" accept="image/*" className="form-input" style={{ padding: '6px 8px', fontSize: 11, borderRadius: 6, border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} onChange={handlePhotoUpload} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                                <button style={{ padding: '14px 0', borderRadius: 8, border: 'none', cursor: generating ? 'wait' : 'pointer', fontSize: 13, fontWeight: 800, background: generating ? '#94a3b8' : `linear-gradient(135deg, ${DARK}, ${GOLD2})`, color: '#fff', letterSpacing: 0.5, boxShadow: generating ? 'none' : '0 10px 20px rgba(4, 27, 59, 0.2)', transition: 'all 0.2s', textTransform: 'uppercase' }} onClick={handleDownload} disabled={generating}>
                                    {generating ? '⏳ Generating PNG...' : '📥 Download ID Card'}
                                </button>
                                <button style={{ padding: '10px 0', borderRadius: 8, border: '1px solid #e2e8f0', background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#64748b', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = DARK; }} onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }} onClick={onClose}>Cancel</button>
                                {errorMsg && (
                                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '10px', borderRadius: 8, fontSize: 11, fontWeight: 600, textAlign: 'center', marginTop: 4 }}>
                                        {errorMsg}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ══════════ RIGHT PANEL: PRINT PREVIEW ════════════════════════ */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(#cbd5e1 1.5px, transparent 1.5px) 0 0 / 24px 24px, #f1f5f9`, padding: '40px 20px' }}>

                        <div id="id-card-wrapper" style={{ transform: 'scale(0.65)', transformOrigin: 'center', display: 'flex', gap: 24, flexWrap: 'nowrap', justifyContent: 'center' }}>
                            {/* ─── FRONT CARD ─────────────────────────────────────────── */}
                            {/* Exact CR80 ID card aspect ratio (2.125 x 3.375 inches) translated to 400x635 px */}
                            <div id="id-card-preview" style={{
                                width: 400,
                                height: 635,
                                background: '#ffffff',
                                borderRadius: 16,
                                boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
                                display: 'flex', flexDirection: 'column',
                                overflow: 'hidden',
                                position: 'relative',
                                flexShrink: 0
                            }}>

                                {/* ── HEADER ─────────────────────────────────────────── */}
                                <div style={{ position: 'relative' }}>
                                    {/* Dark background base for header */}
                                    <div style={{ background: DARK, height: 125, width: '100%', position: 'absolute', top: 0, left: 0 }} />

                                    {/* Swooping curves (Gold overlapping Navy) */}
                                    <svg viewBox="0 0 400 160" width="400" height="160" style={{ position: 'absolute', top: 0, left: 0 }}>
                                        {/* Gold wave */}
                                        <path d="M0,135 Q200,165 400,130 L400,0 L0,0 Z" fill={GOLD2} />
                                        {/* Navy wave slightly above */}
                                        <path d="M0,125 Q200,155 400,120 L400,0 L0,0 Z" fill={DARK} />
                                    </svg>

                                    {/* Content container for Header */}
                                    <div style={{ position: 'relative', zIndex: 10, padding: '24px 24px 0', display: 'flex', gap: 16, alignItems: 'center' }}>
                                        {/* Real Academy Logo */}
                                        <div style={{ background: '#fff', borderRadius: '50%', padding: 2, width: 75, height: 75, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 8px rgba(0,0,0,0.15)', boxSizing: 'border-box' }}>
                                            <img src={seeksLogo} alt="Seeks Academy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        </div>

                                        {/* Academy Text */}
                                        <div>
                                            <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: 2, lineHeight: 1, fontFamily: "'Arial', sans-serif" }}>THE</div>
                                            <div style={{ color: '#fff', fontSize: 40, fontWeight: 900, fontFamily: "'Arial', sans-serif", letterSpacing: 2, lineHeight: 1, marginTop: 2 }}>SEEKS</div>
                                            <div style={{ color: GOLD2, fontSize: 15, fontWeight: 900, letterSpacing: 5.5, fontFamily: "'Arial', sans-serif", lineHeight: 1, marginTop: 4 }}>ACADEMY</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                                <div style={{ flex: 1, height: 1.5, background: GOLD2 }} />
                                                <span style={{ color: '#fff', fontSize: 9.5, letterSpacing: 2, fontWeight: 600, fontFamily: "'Arial', sans-serif" }}>FORT ABBAS</span>
                                                <div style={{ flex: 1, height: 1.5, background: GOLD2 }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Push down past curves */}
                                <div style={{ height: 45 }} />

                                {/* ── TAGLINE ────────────────────────────────────────── */}
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '0 0 10px', background: 'transparent' }}>
                                    {['EDUCATION', 'TRAINING', 'CHARACTER BUILDING'].map((t, i) => (
                                        <React.Fragment key={t}>
                                            <span style={{ fontSize: 9, fontWeight: 800, color: DARK, letterSpacing: 0.5, fontFamily: "'Montserrat', sans-serif" }}>{t}</span>
                                            {i < 2 && <span style={{ color: GOLD2, fontWeight: 900, fontSize: 11, fontFamily: "'Montserrat', sans-serif" }}>|</span>}
                                        </React.Fragment>
                                    ))}
                                </div>

                                {/* ── BODY (2 Columns) ────────────────────────────────── */}
                                <div style={{ display: 'flex', padding: '10px 24px', gap: 16, flex: 1 }}>
                                    {/* Left Data rows */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ marginBottom: 16 }}>
                                            <div style={{ fontSize: 24, fontWeight: 900, color: DARK, letterSpacing: 1, lineHeight: 1, fontFamily: "'Montserrat', sans-serif" }}>{idRole.toUpperCase()}</div>
                                            <div style={{ fontSize: 36, fontWeight: 900, color: GOLD2, letterSpacing: 1, lineHeight: 1, marginTop: 2, fontFamily: "'Montserrat', sans-serif" }}>ID CARD</div>
                                        </div>

                                        <CardRow icon={<PersonIcon />} label={`${idRole} Name`} value={card.name} />
                                        <CardRow icon={<FamilyIcon />} label={secondaryLbl} value={card.secondaryLabel} />
                                        <CardRow icon={<CapIcon />} label={tertiaryLbl} value={card.tertiary} />
                                        <CardRow icon={<BookIcon />} label={idNumberLbl} value={card.idNumber} />
                                        <CardRow icon={<CalendarIcon />} label="Issue Date" value={card.issueDate} />
                                        <CardRow icon={<CalendarXIcon />} label="Expiry Date" value={card.expiryDate} red />
                                    </div>

                                    {/* Right Photo & Signature */}
                                    <div style={{ width: 140, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 40 }}>
                                        {/* Photo box with exact gold styling */}
                                        <div style={{ width: 135, height: 175, border: `2.5px solid ${GOLD2}`, borderRadius: 12, overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {card.photo
                                                ? <img src={card.photo} alt="ID" style={{ width: '100%', height: '100%', objectFit: 'cover', flexShrink: 0 }} crossOrigin="anonymous" />
                                                : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.25 }}>
                                                    <svg viewBox="0 0 24 24" fill={DARK} width="50" height="50"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                                </div>
                                            }
                                        </div>

                                        {/* Signature */}
                                        <div style={{ marginTop: 22, width: '100%', textAlign: 'center' }}>
                                            <div style={{ fontFamily: "'Great Vibes', 'Alex Brush', cursive", fontSize: 24, color: DARK, lineHeight: 0.85, paddingBottom: 4, whiteSpace: 'nowrap' }}>
                                                {card.name || 'Signature'}
                                            </div>
                                            <div style={{ width: '100%', height: 1, background: DARK, margin: '2px auto 4px' }} />
                                            <div style={{ fontSize: 9, fontWeight: 700, color: DARK, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: "'Montserrat', sans-serif" }}>{idRole} Signature</div>
                                        </div>

                                        <div style={{ flex: 1 }} />
                                    </div>
                                </div>

                                {/* Shield positioning perfectly aligned over the QR code */}
                                <div style={{ position: 'absolute', bottom: 92, right: 24, zIndex: 20 }}>
                                    <Shield />
                                </div>

                                {/* ── FOOTER ──────────────────────────────────────────── */}
                                <div style={{ position: 'relative', marginTop: 'auto' }}>
                                    {/* Angled background (V-shape) in Gold & Navy */}
                                    <svg viewBox="0 0 400 140" width="400" height="140" style={{ display: 'block' }}>
                                        {/* Gold back shape */}
                                        <polygon points="0,40 200,55 400,10 400,140 0,140" fill={GOLD2} />
                                        {/* Navy front shape */}
                                        <polygon points="0,50 200,65 400,20 400,140 0,140" fill={DARK} />
                                    </svg>

                                    {/* Footer Content */}
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, height: 95 }}>

                                        {/* 3-Column Flex symmetrically spaced without wrapping */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', paddingBottom: 25, height: '100%' }}>

                                            {/* Left: Address */}
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                                <div style={{ marginTop: 2 }}><LocationIcon /></div>
                                                <div style={{ color: '#fff', fontSize: 10, lineHeight: 1.4, fontFamily: "'Montserrat', sans-serif", fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                    Near Madrassa<br />Mazhar al Aloom,<br />Fort Abbas
                                                </div>
                                            </div>

                                            {/* Center: Phones */}
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                                <div style={{ marginTop: 2 }}><PhoneIcon /></div>
                                                <div style={{ color: '#fff', fontSize: 10, lineHeight: 1.4, fontFamily: "'Montserrat', sans-serif", fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                    0348 7000302<br />0309 7000303<br />03000 973498
                                                </div>
                                            </div>
                                            {/* Right: Empty to balance flex-between or just keep 2 columns centered */}
                                        </div>

                                        {/* Bottom pill tag */}
                                        <div style={{ display: 'flex', justifyContent: 'center', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                                            <div style={{ background: GOLD2, padding: '7px 24px 8px', borderRadius: '12px 12px 0 0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ fontSize: 9.5, fontWeight: 900, color: DARK, letterSpacing: 0.8, fontFamily: "'Montserrat', sans-serif", textTransform: 'uppercase', lineHeight: 1 }}>
                                                    SHAPING MINDS, BUILDING FUTURE
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* ─── END FRONT CARD ─────────────────────────────────────────── */}

                            {/* ─── BACK CARD ──────────────────────────────────────────── */}
                            <div id="id-card-back" style={{
                                width: 400,
                                height: 635,
                                background: '#ffffff',
                                borderRadius: 16,
                                boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
                                display: 'flex', flexDirection: 'column',
                                overflow: 'hidden',
                                position: 'relative',
                                flexShrink: 0
                            }}>
                                {/* Header */}
                                <div style={{ background: DARK, height: 80, width: '100%', position: 'absolute', top: 0, left: 0 }} />
                                <svg viewBox="0 0 400 120" width="400" height="120" style={{ position: 'absolute', top: 0, left: 0 }}>
                                    <path d="M0,80 Q200,120 400,80 L400,0 L0,0 Z" fill={DARK} />
                                    <path d="M0,80 Q200,110 400,70 L400,0 L0,0 Z" fill={GOLD2} />
                                </svg>
                                <div style={{ position: 'relative', zIndex: 10, paddingTop: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ background: '#fff', borderRadius: '50%', padding: 2, width: 55, height: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', boxSizing: 'border-box' }}>
                                        <img src={seeksLogo} alt="Seeks Academy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    </div>
                                    <div style={{ color: '#fff', fontSize: 16, fontWeight: 800, letterSpacing: 2, fontFamily: "'Montserrat', sans-serif", marginTop: 8 }}>
                                        THE SEEKS ACADEMY
                                    </div>
                                </div>

                                {/* Content - Terms & QR Code */}
                                <div style={{ padding: '40px 40px 80px', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10 }}>
                                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                        <div style={{ fontSize: 16, fontWeight: 800, color: DARK, letterSpacing: 1, fontFamily: "'Montserrat', sans-serif" }}>Terms of use</div>
                                        <div style={{ width: 40, height: 3, background: GOLD2, margin: '8px auto' }} />
                                    </div>

                                    <ul style={{ paddingLeft: 20, margin: 0, color: '#334155', fontSize: 11, lineHeight: 1.6, fontFamily: "'Arial', sans-serif" }}>
                                        <li style={{ marginBottom: 8 }}>This ID card is the property of The Seeks Academy and must be worn at all times while on campus.</li>
                                        <li style={{ marginBottom: 8 }}>This card is non-transferable and may only be used by the individual named on the front.</li>
                                        <li style={{ marginBottom: 8 }}>If found, please drop this card in any public mailbox or return it directly to the academy administration.</li>
                                        <li style={{ marginBottom: 8 }}>Loss of this card must be reported immediately to the administration office. A replacement fee will apply.</li>
                                    </ul>

                                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ fontSize: 7.5, color: '#000', marginBottom: 5, fontWeight: 800, letterSpacing: 0.5, fontFamily: "'Montserrat', sans-serif", width: 90, textAlign: 'center' }}>SCAN TO VERIFY</div>
                                        <div style={{ width: 100, height: 100, background: '#fff', borderRadius: 8, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${GOLD2}` }}>
                                            <QRCodeSVG value={idRole === 'Student' ? `Name: ${card.name || '---'}\nClass: ${card.tertiary || '---'}\nInstitute: The Seeks Academy` : `Name: ${card.name || '---'}\nDesignation: ${card.tertiary || '---'}\nAcademy Name: The Seeks Academy`} size={84} level="H" fgColor={DARK} />
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 60, background: DARK }}>
                                    <svg viewBox="0 0 400 80" width="400" height="80" style={{ position: 'absolute', bottom: 0, left: 0 }}>
                                        <path d="M0,80 L0,20 Q200,0 400,20 L400,80 Z" fill={GOLD2} />
                                        <path d="M0,80 L0,30 Q200,10 400,30 L400,80 Z" fill={DARK} />
                                    </svg>
                                    <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 26 }}>
                                        <div style={{ color: '#fff', display: 'flex', alignItems: 'center' }}>
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
                                            </svg>
                                        </div>
                                        <div style={{ color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, fontFamily: "'Montserrat', sans-serif" }}>TheSeeksAcademyFTA</div>
                                    </div>
                                </div>
                            </div>
                            {/* ─── END BACK CARD ─────────────────────────────────────────── */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
