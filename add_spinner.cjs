const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'finance', 'FeePage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const target = `            <div className="page-header no-print" style={{ padding: '10px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)', zIndex: 10, flexShrink: 0 }}>`;

const replacement = `            {saving && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(2px)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="spinner" style={{ width: 48, height: 48, border: '4px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', marginBottom: 16 }}></div>
                    <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 16 }}>Processing...</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Saving fee records, please wait</div>
                </div>
            )}
            <div className="page-header no-print" style={{ padding: '10px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)', zIndex: 10, flexShrink: 0 }}>`;

if (content.includes(target) && !content.includes('backdropFilter')) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Added global saving spinner');
} else {
    console.log('Target not found or already added');
}
