import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useAppSelector, useAppDispatch } from '../../store/hooks';

const GROUP_IDS = ['g1','g2','g3','g4','g5','g6','g7','g8'];
const GROUP_NAMES: Record<string, string> = {
  g1: '9th Grade — Boys', g2: '9th Grade — Girls',
  g3: '10th Grade — Boys', g4: '10th Grade — Girls',
  g5: '1st Year — Boys', g6: '1st Year — Girls',
  g7: '2nd Year — Boys', g8: '2nd Year — Girls',
};

const CATEGORY_COLORS: Record<string, string> = {
  General: '#6366f1', Academic: '#0ea5e9', Exam: '#ef4444',
  Holiday: '#10b981', Event: '#f59e0b', Fee: '#8b5cf6', Other: '#94a3b8',
};

function fmtTs(ts: any) {
  if (!ts?.seconds) return '';
  const d = new Date(ts.seconds * 1000);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function playBellSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error('Audio play failed', e);
  }
}

function DigitalClock() {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = (hours % 12 || 12).toString().padStart(2, '0');
  const m = time.getMinutes().toString().padStart(2, '0');
  const s = time.getSeconds().toString().padStart(2, '0');
  const blink = time.getSeconds() % 2 === 0;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 12px',
      background: 'var(--bg3)',
      border: '1px solid var(--border)',
      borderRadius: '20px',
      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
      userSelect: 'none'
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: blink ? '#10b981' : 'transparent',
        border: blink ? 'none' : '1px solid #10b981',
        boxShadow: blink ? '0 0 8px rgba(16,185,129,0.8)' : 'none',
        transition: 'all 0.3s ease'
      }} />
      <div style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: 14,
        fontWeight: 800,
        color: 'var(--text)',
        letterSpacing: 1,
        display: 'flex',
        alignItems: 'center'
      }}>
        <span>{h}</span>
        <span style={{ opacity: blink ? 1 : 0.3, transition: 'opacity 0.3s', margin: '0 2px' }}>:</span>
        <span>{m}</span>
        <span style={{ opacity: blink ? 1 : 0.3, transition: 'opacity 0.3s', margin: '0 2px' }}>:</span>
        <span>{s}</span>
        <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text2)', fontFamily: 'sans-serif', fontWeight: 700 }}>{ampm}</span>
      </div>
    </div>
  );
}

export default function TopBar({
  collapsed, toggleMobile,
}: {
  collapsed: boolean;
  toggleMobile: () => void;
}) {
  const { profile, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const notices = useAppSelector((s: any) => s.general.notices) || [];
  const complaints = useAppSelector((s: any) => s.general.complaints) || [];
  const suggestions = useAppSelector((s: any) => s.general.suggestions) || [];
  const globalSearchQuery = useAppSelector((s: any) => s.general.globalSearchQuery);
  const students = useAppSelector((s: any) => s.students?.students || []);
  const teachers = useAppSelector((s: any) => s.teachers?.teachers || []);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [bellOpen, setBellOpen] = React.useState(false);
  const [msgOpen, setMsgOpen] = React.useState(false);
  const [unreadBellCount, setUnreadBellCount] = React.useState(0);
  const [profileOpen, setProfileOpen] = React.useState(false);

  const bellRef = React.useRef<HTMLDivElement>(null);
  const msgRef = React.useRef<HTMLDivElement>(null);
  const profileRef = React.useRef<HTMLDivElement>(null);

  const unreadBell = unreadBellCount;
  
  const lastBellSeenRef = React.useRef<number>(Date.now());
  
  const allNotifications = React.useMemo(() => {
    const arr: any[] = [];
    notices.forEach((n: any) => arr.push({ ...n, _type: 'notice', category: n.category || 'Notice' }));
    complaints.forEach((c: any) => arr.push({ ...c, _type: 'complaint', category: 'Complaint', title: c.title || 'Complaint' }));
    suggestions.forEach((s: any) => arr.push({ ...s, _type: 'suggestion', category: 'Suggestion', title: s.title || 'Suggestion' }));
    return arr.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
  }, [notices, complaints, suggestions]);

  React.useEffect(() => {
    let count = 0;
    allNotifications.forEach(n => {
      const ts = n.createdAt?.seconds ? n.createdAt.seconds * 1000 : 0;
      if (ts > lastBellSeenRef.current) count++;
    });
    setUnreadBellCount(count);
  }, [allNotifications]);
  const pendingComplaints = complaints.filter((c: any) => c.status === 'Pending').length;

  // ── Live unread chat counter ───────────────────────────────────────────
  const [unreadChatCount, setUnreadChatCount] = React.useState(0);
  const [recentChatMsgs, setRecentChatMsgs] = React.useState<any[]>([]);
  const lastSeenAtRef = React.useRef<number>(Date.now());

  React.useEffect(() => {
    const unsubs: (() => void)[] = [];
    const latestByGroup: Record<string, { text: string; sender: string; ts: number; group: string; groupId: string }> = {};

    GROUP_IDS.forEach(groupId => {
      const q = query(
        collection(db, 'chatGroups', groupId, 'messages'),
        orderBy('timestamp', 'desc'),
        limit(3),
      );
      const unsub = onSnapshot(q, snap => {
        let newCount = 0;
        snap.docs.forEach(doc => {
          const data = doc.data();
          const ts = data.timestamp?.seconds ? data.timestamp.seconds * 1000 : 0;
          if (ts > lastSeenAtRef.current) newCount++;
        });
        if (snap.docs.length > 0) {
          const latest = snap.docs[0].data();
          const ts = latest.timestamp?.seconds ? latest.timestamp.seconds * 1000 : 0;
          latestByGroup[groupId] = {
            text: latest.text || '',
            sender: latest.sender || 'Unknown',
            ts,
            group: GROUP_NAMES[groupId] || groupId,
            groupId,
          };
        }
        setUnreadChatCount(prev => {
          let total = 0;
          GROUP_IDS.forEach(gid => { if (gid === groupId) total += newCount; });
          return Math.max(prev, total);
        });
        const sorted = Object.values(latestByGroup).sort((a, b) => b.ts - a.ts);
        setRecentChatMsgs(sorted.slice(0, 6));

        if (newCount > 0 && snap.docs.length > 0) {
          const latestData = snap.docs[0].data();
          
          const isMine = latestData.senderId === auth?.currentUser?.uid || latestData.sender === 'Admin';
          
          if (!isMine) {
            playBellSound();
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`New Message in ${GROUP_NAMES[groupId] || groupId}`, {
                body: `${latestData.sender || 'Unknown'}: ${latestData.text || ''}`,
                icon: '/logo.png'
              });
            }
          }
        }
      });
      unsubs.push(unsub);
    });
    return () => unsubs.forEach(u => u());
  }, []);

  // ── Live complaints listener for notifications ─────────────────────────
  React.useEffect(() => {
    let initialLoad = true;
    const q = collection(db, 'complaints');
    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const comp = change.doc.data();
          
          if (!initialLoad) {
            playBellSound();

            // Show Notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Complaint Received', {
                body: `${comp.studentName || 'Student'} - ${comp.title || 'No Title'}`,
                icon: '/logo.png'
              });
            }
          }

          dispatch({ type: 'general/addOrUpdateComplaint', payload: { id: change.doc.id, ...comp } });
        } else if (change.type === 'modified') {
          dispatch({ type: 'general/addOrUpdateComplaint', payload: { id: change.doc.id, ...change.doc.data() } });
        } else if (change.type === 'removed') {
          dispatch({ type: 'general/removeComplaint', payload: change.doc.id });
        }
      });
      initialLoad = false;
    });
    return () => unsub();
  }, [dispatch]);

  // ── Live suggestions listener for notifications ─────────────────────────
  React.useEffect(() => {
    let initialLoad = true;
    const q = collection(db, 'suggestions');
    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const sugg = change.doc.data();
          
          if (!initialLoad) {
            playBellSound();

            // Show Notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Suggestion Received', {
                body: `${sugg.teacherName || 'Teacher'} - ${sugg.title || 'No Title'}`,
                icon: '/logo.png'
              });
            }
          }

          dispatch({ type: 'general/addOrUpdateSuggestion', payload: { id: change.doc.id, ...sugg } });
        } else if (change.type === 'modified') {
          dispatch({ type: 'general/addOrUpdateSuggestion', payload: { id: change.doc.id, ...change.doc.data() } });
        } else if (change.type === 'removed') {
          dispatch({ type: 'general/removeSuggestion', payload: change.doc.id });
        }
      });
      initialLoad = false;
    });
    return () => unsub();
  }, [dispatch]);

  const openMsg = () => {
    setMsgOpen(v => !v);
    setBellOpen(false);
    lastSeenAtRef.current = Date.now();
    setUnreadChatCount(0);
  };

  const openBell = () => {
    setBellOpen(v => !v);
    setMsgOpen(false);
    lastBellSeenRef.current = Date.now();
    setUnreadBellCount(0);
  };

  // Close dropdowns on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
      if (msgRef.current && !msgRef.current.contains(e.target as Node)) setMsgOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'general/setGlobalSearchQuery', payload: e.target.value });
  };

  const location = useLocation();
  React.useEffect(() => {
    dispatch({ type: 'general/setGlobalSearchQuery', payload: '' });
  }, [location.pathname, dispatch]);

  // ── Shared dropdown card style — fully theme-aware ─────────────────────
  const dropdownCard: React.CSSProperties = {
    position: 'absolute', top: 'calc(100% + 12px)', right: 0,
    width: 340, background: 'var(--card)', borderRadius: 16,
    boxShadow: 'var(--shadow), 0 20px 60px rgba(0,0,0,0.18)',
    border: '1px solid var(--border)',
    zIndex: 9999, overflow: 'hidden',
  };
  const dpHeader: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 18px', borderBottom: '1px solid var(--border)',
    fontSize: 14, fontWeight: 700, color: 'var(--text)',
    background: 'var(--bg2)',
  };
  const iconBtn = (active = false): React.CSSProperties => ({
    width: 40, height: 40, borderRadius: '50%', border: 'none',
    background: active ? 'var(--bg3)' : 'var(--bg3)',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 18, position: 'relative',
    transition: 'background 0.2s',
    boxShadow: active ? '0 0 0 2px var(--primary)' : 'none',
    color: 'var(--text)',
  });

  return (
    <header className="topbar topbar-custom">
      <button className="mobile-toggle-btn" onClick={toggleMobile}>☰</button>

      {/* Search */}
      <div className="search-wrapper">
        <div style={{
          display: 'flex', alignItems: 'center', background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRadius: 30, padding: '10px 18px', width: '100%', maxWidth: 400, gap: 10,
        }}>
          <span style={{ fontSize: 14, color: 'var(--text2)' }}>🔍</span>
          <input
            type="text"
            placeholder="Search across dashboard..."
            value={globalSearchQuery}
            onChange={handleSearchChange}
            style={{
              border: 'none', background: 'transparent', outline: 'none',
              fontSize: 14, color: 'var(--text)', width: '100%',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {globalSearchQuery.length > 1 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 8,
            width: 400, background: 'var(--card)', borderRadius: 12,
            boxShadow: 'var(--shadow), 0 10px 40px rgba(0,0,0,0.1)',
            border: '1px solid var(--border)', zIndex: 10000,
            maxHeight: 400, overflowY: 'auto'
          }}>
            {(() => {
              const q = globalSearchQuery.toLowerCase();
              const sResults = students.filter((s:any) => s.name?.toLowerCase().includes(q) || s.rollNumber?.toLowerCase().includes(q));
              const tResults = teachers.filter((t:any) => t.name?.toLowerCase().includes(q));
              const nResults = notices.filter((n:any) => n.title?.toLowerCase().includes(q));
              const cResults = complaints.filter((c:any) => c.title?.toLowerCase().includes(q) || c.studentName?.toLowerCase().includes(q));
              
              const total = sResults.length + tResults.length + nResults.length + cResults.length;

              if (total === 0) {
                return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>No results found</div>;
              }

              return (
                <div style={{ padding: '10px 0' }}>
                  {sResults.length > 0 && (
                    <>
                      <div style={{ padding: '6px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Students</div>
                      {sResults.slice(0, 3).map((s:any) => (
                        <div key={s.id} onClick={() => { navigate(`/students`); dispatch({type:'general/setGlobalSearchQuery', payload:''}); }} style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                           <span style={{fontSize: 16}}>🎓</span> <span style={{fontSize: 13, color: 'var(--text)'}}>{s.name} <span style={{color: 'var(--text2)', fontSize:11}}>({s.class})</span></span>
                        </div>
                      ))}
                    </>
                  )}
                  {tResults.length > 0 && (
                    <>
                      <div style={{ padding: '6px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Teachers</div>
                      {tResults.slice(0, 3).map((t:any) => (
                        <div key={t.id} onClick={() => { navigate(`/teachers`); dispatch({type:'general/setGlobalSearchQuery', payload:''}); }} style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                           <span style={{fontSize: 16}}>👨‍🏫</span> <span style={{fontSize: 13, color: 'var(--text)'}}>{t.name}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {nResults.length > 0 && (
                    <>
                      <div style={{ padding: '6px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Notices</div>
                      {nResults.slice(0, 3).map((n:any) => (
                        <div key={n.id} onClick={() => { navigate(`/notifications/${n.id}`); dispatch({type:'general/setGlobalSearchQuery', payload:''}); }} style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                           <span style={{fontSize: 16}}>🔔</span> <span style={{fontSize: 13, color: 'var(--text)'}}>{n.title}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {cResults.length > 0 && (
                    <>
                      <div style={{ padding: '6px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Complaints</div>
                      {cResults.slice(0, 3).map((c:any) => (
                        <div key={c.id} onClick={() => { navigate(`/complaints`); dispatch({type:'general/setGlobalSearchQuery', payload:''}); }} style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                           <span style={{fontSize: 16}}>⚠️</span> <span style={{fontSize: 13, color: 'var(--text)'}}>{c.title} <span style={{color: 'var(--text2)', fontSize:11}}>({c.studentName})</span></span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <style>
        {`
          .topbar-custom {
             padding: 0 30px;
             height: 70px;
             background: var(--bg2);
             border-bottom: 1px solid var(--border);
          }
          .search-wrapper { flex: 1; display: flex; align-items: center; position: relative; }
          .topbar-spacer-custom { flex: 1; display: flex; justify-content: center; align-items: center; }
          .topbar-actions-custom { display: flex; align-items: center; gap: 16px; padding-left: 16px; }
          .clock-container { display: flex; }
          .about-btn { display: flex; align-items: center; justify-content: center; }
          
          @media (max-width: 1024px) {
             .topbar-custom { padding: 0 20px; }
             .topbar-spacer-custom img { height: 36px !important; }
          }
          @media (max-width: 768px) {
             .topbar-custom { padding: 0 12px !important; height: 60px !important; gap: 8px !important; }
             .topbar-spacer-custom { display: none !important; }
             .clock-container { display: none !important; }
             .about-btn { display: none !important; }
             .topbar-actions-custom { gap: 8px !important; padding-left: 0 !important; }
          }
          @media (max-width: 480px) {
             .topbar-custom { padding: 0 8px !important; gap: 4px !important; }
             .topbar-actions-custom { gap: 4px !important; }
          }
        `}
      </style>
      <div className="topbar-spacer-custom">
        <img 
          src="./topbar-banner.png" 
          alt="Alhamdulillah Banner" 
          style={{
            height: 44,
            objectFit: 'contain',
            filter: darkMode ? 'drop-shadow(0 0 4px rgba(255,255,255,0.1))' : 'none',
            userSelect: 'none',
          }}
        />
      </div>

      <div className="topbar-actions-custom">
        <div className="clock-container"><DigitalClock /></div>

        {/* Dark Mode Toggle */}
        <button
          className="hover-brightness"
          onClick={toggleDarkMode}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={iconBtn()}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        {/* About */}
        <button
          className="hover-brightness about-btn"
          onClick={() => window.dispatchEvent(new CustomEvent('open-about'))}
          title="About Dashboard"
          style={iconBtn()}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" strokeLinecap="round" />
            <path d="M12 8h.01" strokeWidth={3} strokeLinecap="round" />
          </svg>
        </button>

        {/* Messages */}
        <div ref={msgRef} style={{ position: 'relative' }}>
          <button onClick={openMsg} style={iconBtn(msgOpen)}>
            💬
            {unreadChatCount > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                background: '#ef4444', color: '#fff', borderRadius: '50%',
                width: 16, height: 16, fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--bg2)',
              }}>
                {unreadChatCount > 9 ? '9+' : unreadChatCount}
              </span>
            )}
          </button>

          {msgOpen && (
            <div style={dropdownCard}>
              <div style={dpHeader}>
                <span>💬 Recent Messages</span>
                <NavLink to="/chat" onClick={() => setMsgOpen(false)}
                  style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                  Open Chat →
                </NavLink>
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto', background: 'var(--card)' }}>
                {recentChatMsgs.length === 0 ? (
                  <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>No messages yet</div>
                ) : recentChatMsgs.map((msg, i) => {
                  const avatarBg = ['#6366f1','#10b981','#f59e0b','#ef4444','#0ea5e9','#8b5cf6'][i % 6];
                  const elapsed = msg.ts ? (() => {
                    const s = (Date.now() - msg.ts) / 1000;
                    if (s < 60) return 'Just now';
                    if (s < 3600) return `${Math.floor(s/60)}m ago`;
                    return `${Math.floor(s/3600)}h ago`;
                  })() : '';
                  return (
                    <div key={i} onClick={() => { setMsgOpen(false); navigate(`/chat?group=${msg.groupId}`); }} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 16px', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer'
                    }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8, background: avatarBg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
                      }}>
                        {(msg.sender || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{msg.sender}</span>
                          <span style={{ fontSize: 10, color: 'var(--text2)' }}>{elapsed}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.text}</div>
                        <div style={{ fontSize: 9, color: avatarBg, background: `${avatarBg}18`, padding: '1px 6px', borderRadius: 10, fontWeight: 700, display: 'inline-block', marginTop: 4 }}>{msg.group}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bell */}
        <div ref={bellRef} style={{ position: 'relative' }}>
          <button onClick={openBell} style={iconBtn(bellOpen)}>
            🔔
            {unreadBell > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                background: '#ef4444', color: '#fff', borderRadius: '50%',
                width: 16, height: 16, fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--bg2)',
              }}>
                {unreadBell > 9 ? '9+' : unreadBell}
              </span>
            )}
          </button>

          {bellOpen && (
            <div style={dropdownCard}>
              <div style={dpHeader}>
                <span>🔔 Notifications</span>
                <NavLink to="/notifications/list" onClick={() => setBellOpen(false)}
                  style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                  View all →
                </NavLink>
              </div>
              <div style={{ maxHeight: 360, overflowY: 'auto', background: 'var(--card)' }}>
                {allNotifications.length === 0 ? (
                  <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>No notifications yet</div>
                ) : allNotifications.slice(0, 6).map((n: any, i: number) => {
                  const color = CATEGORY_COLORS[n.category] || (n._type === 'complaint' ? '#ef4444' : n._type === 'suggestion' ? '#f59e0b' : '#6366f1');
                  const navPath = n._type === 'complaint' ? '/complaints' : n._type === 'suggestion' ? '/suggestions' : `/notifications/${n.id}`;
                  const icon = n._type === 'complaint' ? '🚨' : n._type === 'suggestion' ? '💡' : (n.category === 'Exam' ? '📄' : n.category === 'Holiday' ? '📅' : n.category === 'Event' ? '⭐' : n.category === 'Fee' ? '💳' : n.category === 'Academic' ? '🏫' : '🔔');
                  return (
                    <div key={n.id || i} onClick={() => { setBellOpen(false); navigate(navPath); }} style={{
                      display: 'flex', gap: 10, padding: '10px 16px',
                      borderBottom: '1px solid var(--border)', alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: `${color}20`, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
                      }}>
                        {icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                          <span style={{ fontSize: 9, color, background: `${color}18`, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>{n.category}</span>
                          <span style={{ fontSize: 10, color: 'var(--text2)' }}>{fmtTs(n.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {allNotifications.length > 0 && (
                <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', textAlign: 'center', background: 'var(--bg2)' }}>
                  <NavLink to="/notifications/list" onClick={() => setBellOpen(false)}
                    style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                    See all {allNotifications.length} notifications
                  </NavLink>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <div
            onClick={() => { setProfileOpen(v => !v); setBellOpen(false); setMsgOpen(false); }}
            style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 800, color: '#fff', cursor: 'pointer',
              boxShadow: profileOpen ? '0 0 0 3px rgba(99,102,241,0.3)' : '0 4px 10px rgba(0,0,0,0.1)',
              transition: 'box-shadow 0.2s',
            }}
          >
            {(profile?.fullname || 'A').charAt(0).toUpperCase()}
          </div>

          {profileOpen && (
            <div style={{ ...dropdownCard, width: 260 }}>
              {/* Profile header */}
              <div style={{
                padding: '16px 18px', borderBottom: '1px solid var(--border)',
                background: 'var(--bg2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 800, color: '#fff',
                    boxShadow: '0 4px 10px rgba(99,102,241,0.25)',
                  }}>
                    {(profile?.fullname || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {profile?.fullname || 'Admin User'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {profile?.email || ''}
                    </div>
                    <span style={{
                      marginTop: 5, display: 'inline-block', fontSize: 9, fontWeight: 800,
                      background: 'rgba(99,102,241,0.12)', color: '#6366f1',
                      padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(99,102,241,0.25)',
                    }}>
                      ✦ SUPER ADMIN
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              {([
                { icon: '⚙️', label: 'Settings', to: '/settings' },
                { icon: '✏️', label: 'Edit Profile', to: '/settings' },
              ] as { icon: string; label: string; to: string }[]).map(item => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  onClick={() => setProfileOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 18px', borderBottom: '1px solid var(--border)',
                    textDecoration: 'none', color: 'var(--text)',
                    fontSize: 13, fontWeight: 500, transition: 'background 0.15s',
                    background: 'var(--card)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}

              <button
                onClick={() => { setProfileOpen(false); logout(); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 18px', border: 'none', background: 'var(--card)',
                  color: '#ef4444', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}
              >
                <span style={{ fontSize: 16 }}>🚪</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
