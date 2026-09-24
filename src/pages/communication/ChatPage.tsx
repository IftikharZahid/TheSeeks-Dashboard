import React from 'react';
import ChatPortal from '../../components/chat/ChatPortal';

export default function ChatPage() {
  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', minHeight: 0, overflow: 'hidden' }}>
      <div className="page-header" style={{ flexShrink: 0, marginBottom: 12, display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <div className="page-title" style={{ fontSize: 20 }}>Academic Chat</div>
        <div className="page-sub" style={{ margin: 0 }}>Communicate with students and staff instantly</div>
      </div>

      <div style={{
        position: 'relative', width: '100%', flex: 1, minHeight: 0,
        borderRadius: '8px', overflow: 'hidden',
        border: '1px solid #e2e8f0',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <ChatPortal inPage />
      </div>
    </div>
  );
}
