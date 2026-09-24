import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/** Redirects to /login if not authenticated */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg)',
        flexDirection: 'column', gap: 24, padding: 24,
      }}>
        {/* Animated App Logo Wrapper */}
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(46, 49, 96, 0.25)',
          animation: 'pulse 2s infinite ease-in-out'
        }}>
          <img src="/logo_square.png" alt="The Seeks Academy" style={{ width: 44, height: 44, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>The Seeks Academy</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                <span style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 500 }}>Loading Dashboard...</span>
            </div>
        </div>

        <style>
          {`
            @keyframes pulse {
              0% { transform: scale(1); box-shadow: 0 8px 24px rgba(46, 49, 96, 0.25); }
              50% { transform: scale(1.05); box-shadow: 0 12px 32px rgba(46, 49, 96, 0.4); }
              100% { transform: scale(1); box-shadow: 0 8px 24px rgba(46, 49, 96, 0.25); }
            }
          `}
        </style>
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Redirects already-logged-in users away from /login */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : <>{children}</>;
}
