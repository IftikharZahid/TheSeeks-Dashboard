import React from 'react';
import { Link } from 'react-router-dom';
import { Icons } from './DashboardIcons';

interface DashboardHeaderProps {
    todayLabel: string;
    greeting: string;
}

export default function DashboardHeader({ todayLabel, greeting }: DashboardHeaderProps) {
    return (
        <div className="dash-animate" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
                <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {Icons.calendar}
                    {todayLabel}
                </div>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3, margin: 0 }}>
                    {greeting}, <span style={{ color: 'var(--primary)' }}>Admin</span>
                </h1>
            </div>
            <Link to="/settings" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', padding: '6px 12px', borderRadius: 8, background: '#eff6ff', transition: 'all 0.15s' }}>
                Settings {Icons.arrowRight}
            </Link>
        </div>
    );
}
