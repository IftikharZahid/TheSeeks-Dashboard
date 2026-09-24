import React from 'react';
import { Link } from 'react-router-dom';
import { Icons } from './DashboardIcons';

export default function DashboardHero() {
    return (
        <div className="dash-hero dash-animate" style={{ marginBottom: 16, animationDelay: '0.1s' }}>
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ maxWidth: 520 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px 0', letterSpacing: -0.2 }}>
                        Welcome to The Seeks Academy Dashboard
                    </h2>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, margin: 0 }}>
                        Manage students, faculty, exams, and fees all from one place.
                    </p>
                </div>
                <Link to="/students" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)',
                    padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', textDecoration: 'none', flexShrink: 0,
                    backdropFilter: 'blur(4px)',
                    transition: 'background 0.15s'
                }}>
                    View Students {Icons.arrowRight}
                </Link>
            </div>
        </div>
    );
}
