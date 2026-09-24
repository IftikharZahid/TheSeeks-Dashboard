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
        flexDirection: 'column', gap: 14,
      }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>Checking session...</div>
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
