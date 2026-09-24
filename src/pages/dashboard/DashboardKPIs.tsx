import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Icons } from './DashboardIcons';

// ── Animated Counter ───────────────────────────────────────────────────────────
function AnimCount({ to }: { to: number }) {
    const [v, setV] = useState(0);
    const raf = useRef(0); const t0 = useRef(0); const fr = useRef(0);
    useEffect(() => {
        fr.current = v; t0.current = performance.now();
        const tick = (now: number) => {
            const p = Math.min((now - t0.current) / 700, 1);
            setV(Math.round(fr.current + (to - fr.current) * (1 - Math.pow(1 - p, 3))));
            if (p < 1) raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, [to]);
    return <>{v}</>;
}

export interface KPICard {
    label: string;
    value: number;
    icon: React.ReactNode;
    gradient: string;
    link: string;
}

interface DashboardKPIsProps {
    kpiCards: KPICard[];
}

export default function DashboardKPIs({ kpiCards }: DashboardKPIsProps) {
    return (
        <div className="dash-kpi-grid dash-animate" style={{ marginBottom: 12, animationDelay: '0.05s' }}>
            {kpiCards.map((c, i) => (
                <Link key={i} to={c.link} className="dash-card" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: c.gradient,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', flexShrink: 0,
                        fontSize: 16
                    }}>
                        {c.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3, lineHeight: 1 }}>
                            <AnimCount to={c.value} />
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text2)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.label}
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}
