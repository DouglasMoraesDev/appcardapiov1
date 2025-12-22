import React from 'react';

export interface ToastItem { id: string; title?: string; message: string; persist?: boolean; }

export default function Toasts({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div style={{ position: 'fixed', right: 16, top: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '10px 14px', borderRadius: 8, minWidth: 240, boxShadow: '0 6px 18px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ marginRight: 8 }}>{t.title || 'Notificação'}</strong>
            <button onClick={() => onDismiss(t.id)} style={{ background: 'transparent', border: 'none', color: '#fff' }}>✕</button>
          </div>
          <div style={{ marginTop: 6 }}>{t.message}</div>
        </div>
      ))}
    </div>
  );
}
