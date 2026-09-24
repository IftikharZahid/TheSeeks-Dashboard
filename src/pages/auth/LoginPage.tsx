import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const ERR: Record<string, string> = {
    'auth/invalid-email': 'Invalid email address.',
    'auth/user-not-found': 'This email is not registered in our database.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/not-admin': 'Access denied: This dashboard is strictly for administrators only.',
};

export default function LoginPage() {
    const { login, resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resetSent, setResetSent] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email.trim()) { setError('Please enter your email.'); return; }
        if (!password) { setError('Please enter your password.'); return; }

        setLoading(true);
        try {
            await login(email, password);
            // Navigation handled automatically by AuthProvider → App.tsx ProtectedRoute
        } catch (err: any) {
            setError(ERR[err.code] || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (!email.trim()) { setError('Enter your email above first.'); return; }
        setError(''); setLoading(true);
        try {
            await resetPassword(email);
            setResetSent(true);
        } catch (err: any) {
            setError(ERR[err.code] || 'Could not send reset email.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <style>
                {`
                    .login-container {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        z-index: 99999;
                        background: #2e3160;
                        display: flex;
                        flex-direction: column;
                        overflow-y: auto;
                        overflow-x: hidden;
                    }
                    .login-card-wrapper {
                        flex: 1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 24px 16px;
                        width: 100%;
                        box-sizing: border-box;
                    }
                    .login-card {
                        background: #ffffff;
                        border-radius: 12px;
                        box-shadow: 0 24px 64px rgba(0,0,0,0.3);
                        width: 100%;
                        max-width: 1240px;
                        min-height: 640px;
                        display: flex;
                        flex-direction: row;
                        overflow: hidden;
                        position: relative;
                        box-sizing: border-box;
                    }
                    .login-left {
                        flex: 1;
                        padding: 80px 100px;
                        display: flex;
                        flex-direction: column;
                        position: relative;
                        box-sizing: border-box;
                    }
                    .login-right {
                        width: 540px;
                        padding: 60px 100px 60px 40px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        z-index: 10;
                        box-sizing: border-box;
                    }
                    .login-form-card {
                        background: #f8fafc;
                        padding: 40px 44px;
                        border-radius: 16px;
                        border: 1px solid #e2e8f0;
                        box-shadow: 0 8px 30px rgba(0,0,0,0.04);
                        box-sizing: border-box;
                        width: 100%;
                    }
                    .center-typo {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                    }
                    .powered-by {
                        position: absolute;
                        bottom: 30px;
                        width: calc(100% - 540px);
                        left: 0;
                        text-align: center;
                        font-size: 11px;
                        font-weight: 800;
                        color: #2e3160;
                        z-index: 20;
                    }
                    .brand-text {
                        color: #2e3160;
                        font-size: 24px;
                        font-weight: 800;
                        text-transform: uppercase;
                        line-height: 1.1;
                        letter-spacing: -0.5px;
                    }
                    .main-heading {
                        color: #2e3160;
                        font-size: 28px;
                        font-weight: 800;
                        line-height: 1.1;
                        margin-top: 8px;
                        letter-spacing: -0.5px;
                    }
                    .sub-heading {
                        color: #ef4444;
                        font-size: 13px;
                        letter-spacing: 2px;
                        font-weight: 700;
                        text-transform: uppercase;
                    }
                    .brand-container {
                        display: flex;
                        align-items: center;
                        gap: 16px;
                    }
                    .brand-logo {
                        width: 72px;
                        height: 72px;
                        object-fit: contain;
                    }
                    .login-btn {
                        width: 100%;
                        height: 54px;
                        margin-top: 10px;
                        color: #ffffff;
                        border: none;
                        border-radius: 10px;
                        font-size: 18px;
                        font-weight: 700;
                        transition: background 0.2s;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .login-footer {
                        text-align: center;
                        font-size: 11px;
                        color: rgba(255,255,255,0.4);
                        padding: 16px;
                        margin-top: auto;
                    }
                    
                    /* ── Form Element Classes ── */
                    .admin-portal-title {
                        font-size: 26px;
                        font-weight: 800;
                        color: #2e3160;
                        margin-bottom: 28px;
                        text-align: center;
                    }
                    .login-form {
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                    }
                    .form-label {
                        display: block;
                        font-size: 14px;
                        font-weight: 700;
                        color: #475569;
                        margin-bottom: 8px;
                    }
                    .form-input {
                        width: 100%;
                        height: 52px;
                        padding-left: 42px;
                        background: #ffffff;
                        border: 1px solid #cbd5e1;
                        border-radius: 10px;
                        font-size: 15px;
                        color: #1e293b;
                        outline: none;
                        transition: border-color 0.2s;
                        box-sizing: border-box;
                    }
                    .form-input:focus {
                        border-color: #2e3160;
                    }
                    .form-input-pass {
                        padding-right: 44px;
                    }
                    .form-icon {
                        position: absolute;
                        left: 14px;
                        top: 50%;
                        transform: translateY(-50%);
                        font-size: 16px;
                        pointer-events: none;
                        color: #94a3b8;
                    }
                    .pass-toggle-btn {
                        position: absolute;
                        right: 10px;
                        top: 50%;
                        transform: translateY(-50%);
                        background: none;
                        border: none;
                        cursor: pointer;
                        font-size: 16px;
                        color: #94a3b8;
                        padding: 6px;
                    }
                    .forgot-pass-btn {
                        background: none;
                        border: none;
                        color: #3071c7;
                        font-size: 13px;
                        font-weight: 600;
                        cursor: pointer;
                        padding: 0;
                    }

                    @media (max-width: 1024px) {
                        .login-left { padding: 60px 40px; }
                        .login-right { width: 450px; padding: 40px; }
                        .powered-by { width: calc(100% - 450px); }
                    }
                    
                    @media (max-width: 768px) {
                        .login-card-wrapper {
                            align-items: flex-start;
                            padding: 16px 12px;
                        }
                        .login-card { 
                            flex-direction: column; 
                            min-height: auto;
                            border-radius: 16px;
                        }
                        .login-left { 
                            padding: 32px 20px 16px; 
                            align-items: center;
                            text-align: center;
                        }
                        .center-typo {
                            align-items: center;
                            margin-top: 16px;
                            margin-bottom: 0px;
                        }
                        .brand-text { font-size: 28px; }
                        .main-heading { font-size: 16px; font-weight: 600; }
                        .powered-by {
                            position: relative;
                            bottom: auto;
                            width: 100%;
                            padding: 16px 0 24px;
                            order: 3;
                        }
                        .login-right { 
                            width: 100%; 
                            padding: 0 16px 16px; 
                            order: 2;
                        }
                        .login-form-card {
                            padding: 24px 20px;
                        }
                        .decorations { display: none; }
                    }

                    @media (max-width: 480px) {
                        .login-card-wrapper { padding: 10px 8px; }
                        .login-card { border-radius: 12px; }
                        .login-left { padding: 20px 12px 10px; }
                        .login-right { padding: 0 10px 12px; }
                        .login-form-card { padding: 20px 14px; border-radius: 12px; }
                        
                        /* Typography & Branding Scale Down */
                        .brand-text { font-size: 24px; }
                        .brand-logo { width: 56px; height: 56px; }
                        .main-heading { font-size: 14px; margin-top: 4px; font-weight: 600; line-height: 1.2; }
                        .sub-heading { font-size: 9px; letter-spacing: 1px; }
                        .brand-container { gap: 12px; margin-bottom: 4px; }
                        
                        /* Form Elements Scale Down */
                        .admin-portal-title { font-size: 20px; margin-bottom: 18px; }
                        .login-form { gap: 14px; }
                        .form-label { font-size: 12px; margin-bottom: 6px; }
                        .form-input { height: 44px; font-size: 14px; padding-left: 36px; border-radius: 8px; }
                        .form-input-pass { padding-right: 38px; }
                        .form-icon { font-size: 14px; left: 12px; }
                        .pass-toggle-btn { font-size: 14px; padding: 4px; right: 8px; }
                        .login-btn { height: 44px; font-size: 14px; border-radius: 8px; margin-top: 4px; }
                        .forgot-pass-btn { font-size: 12px; }
                        
                        .login-footer { padding: 10px; font-size: 10px; }
                    }
                `}
            </style>

            <div className="login-card-wrapper">
                {/* The white container card */}
                <div className="login-card">
                {/* Loader Overlay */}
                {loading && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(4px)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        zIndex: 50,
                    }}>
                        <div style={{ width: 50, height: 50, border: '4px solid rgba(46, 49, 96, 0.2)', borderTopColor: '#2e3160', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <div style={{ marginTop: 16, color: '#2e3160', fontSize: 15, fontWeight: 700 }}>Authenticating...</div>
                    </div>
                )}

                {/* Left Side (Branding & Copy) */}
                <div className="login-left">
                    {/* Logo Top Left */}
                    <div className="brand-container">
                        <img src="/logo.png" alt="Logo" className="brand-logo" />
                        <div className="brand-text">THE SEEKS<br/>ACADEMY</div>
                    </div>

                    {/* Center Typography */}
                    <div className="center-typo">
                        <div className="sub-heading">A Comprehensive</div>
                        <div className="main-heading">
                            Education Management<br/>Solution
                        </div>
                        <div style={{ width: 112, height: 4, background: '#ef4444', marginTop: 20, borderRadius: 2 }} />
                    </div>
                </div>

                {/* Right Side (Form) */}
                <div className="login-right">
                    <div className="login-form-card">
                        <div className="admin-portal-title">Admin Portal</div>
                        
                        <form className="login-form" onSubmit={handleLogin}>
                            
                            {/* Email */}
                            <div>
                                <label className="form-label">Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <span className="form-icon">✉️</span>
                                    <input
                                        id="login-email"
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        autoComplete="email"
                                        disabled={loading}
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="form-label">Password</label>
                                <div style={{ position: 'relative' }}>
                                    <span className="form-icon">🔒</span>
                                    <input
                                        id="login-password"
                                        type={showPass ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        autoComplete="current-password"
                                        disabled={loading}
                                        className="form-input form-input-pass"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(p => !p)}
                                        tabIndex={-1}
                                        className="pass-toggle-btn"
                                    >
                                        {showPass ? '👁️' : '👁️‍🗨️'}
                                    </button>
                                </div>
                            </div>

                            {/* Error / Success Messages */}
                            {error && (
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: 10, padding: '10px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>⚠️</span> {error}
                                </div>
                            )}
                            {resetSent && (
                                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#10b981', borderRadius: 10, padding: '10px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>✅</span> Reset link sent to {email}.
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                id="login-submit"
                                type="submit"
                                disabled={loading}
                                className="login-btn"
                                style={{
                                    background: loading ? '#64748b' : '#3071c7',
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>

                        <div style={{ textAlign: 'center', marginTop: 16 }}>
                            <button
                                onClick={handleReset}
                                disabled={loading}
                                className="forgot-pass-btn"
                            >
                                Forgot password?
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom Right Decorative Orange Stripes */}
                <div className="decorations" style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 350,
                    height: 350,
                    pointerEvents: 'none',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', bottom: -100, right: -150, width: 400, height: 200, transform: 'rotate(-45deg)' }}>
                        <div style={{ position: 'absolute', bottom: 180, width: '100%', height: 32, background: '#f59e0b' }} />
                        <div style={{ position: 'absolute', bottom: 120, width: '100%', height: 32, background: '#f59e0b' }} />
                    </div>
                </div>

                {/* Bottom Center "Powered By" */}
                <div className="powered-by">
                    Powered by <a href="https://iftikharzahid.me" target="_blank" rel="noopener noreferrer" style={{ color: '#ef4444', textDecoration: 'none' }}>ZahidCodes</a>
                </div>
            </div>
            </div>
            
            <div className="login-footer">
                © {new Date().getFullYear()} The Seeks Academy, Fort Abbas. All rights reserved.
            </div>
        </div>
    );
}
