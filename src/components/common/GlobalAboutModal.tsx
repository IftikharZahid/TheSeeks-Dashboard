import React from 'react';
import profileImg from '../../assets/profile.jpg';

export function GlobalAboutModal() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-about', handler);
    return () => window.removeEventListener('open-about', handler);
  }, []);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.6)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 20,
        backdropFilter: 'blur(8px)',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          background: 'var(--bg)', borderRadius: 20,
          border: '1px solid var(--border)',
          width: '100%', maxWidth: 540,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          maxHeight: '90vh'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg2)',
        }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>About Platform</span>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: 'var(--bg3)', border: 'none', color: 'var(--text2)',
              cursor: 'pointer', width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, transition: 'all 0.15s',
            }}
          >✕</button>
        </div>

        <div style={{ padding: 24, overflowY: 'auto' }}>
          {/* Hero Section */}
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: 16, padding: 20, marginBottom: 24,
            color: '#fff', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <img src="./logo.png" alt="Logo" style={{ width: 56, height: 56, borderRadius: 12, marginRight: 16, background: '#fff', padding: 4 }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.5 }}>The Seeks Academy</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>Fort Abbas, Bahawalnagar</div>
              </div>
            </div>
            
            <div style={{ height: 1, background: 'rgba(255,255,255,0.2)', marginBottom: 16 }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>📦</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>v1.0.1</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>Version</div>
              </div>
              <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>📅</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>2026</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>Released</div>
              </div>
              <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>⭐</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>5.0</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>Rating</div>
              </div>
            </div>
          </div>

          {/* Developer Card */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text2)', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase', marginLeft: 4 }}>Developer & Connect</div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16 }}>
                <img src={profileImg} alt="Iftikhar Zahid" style={{ width: 64, height: 64, borderRadius: 16, marginRight: 16, objectFit: 'cover', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Iftikhar Zahid</div>
                  <div style={{ display: 'inline-block', background: 'rgba(99,102,241,0.1)', color: '#6366f1', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, marginTop: 4, marginBottom: 8 }}>
                    Full Stack Developer
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                    Building intuitive web & mobile apps with clean code & modern design.
                  </div>
                </div>
              </div>
              
              <div style={{ height: 1, background: 'var(--border)', marginBottom: 16 }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px' }}>
                <a href="https://github.com/iftikharzahid" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'var(--text)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🐙</div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)' }}>GitHub</span>
                </a>
                <a href="https://linkedin.com/in/iftikharzahid" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#0A66C2', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(10,102,194,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💼</div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)' }}>LinkedIn</span>
                </a>
                <a href="https://iftikharzahid.github.io" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#6366f1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🌐</div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)' }}>Portfolio</span>
                </a>
                <a href="https://wa.link/330h0s" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#25D366', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(37,211,102,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💬</div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)' }}>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>

          {/* Mission */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text2)', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase', marginLeft: 4 }}>Our Mission</div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>The Seeks Academy</span> web dashboard provides a comprehensive solution for institutional management. By digitizing core administrative processes including attendance tracking, fee management, and academic & exam monitoring, We strive to cultivate a transparent, collaborative, and highly efficient educational environment.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, fontSize: 11, color: 'var(--text2)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span>Made with ❤️ by</span>
            <a href="https://iftikharzahid.github.io" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>ZahidCodes</a>
          </div>
        </div>
      </div>
    </div>
  );
}
