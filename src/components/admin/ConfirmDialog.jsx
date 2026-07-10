import { useState } from 'react';

export default function ConfirmDialog({ open, title, message, inputLabel, onConfirm, onCancel }) {
  const [value, setValue] = useState('');

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: '#22252D', border: '1px solid var(--border)',
        borderRadius: 12, padding: 28, width: 420, maxWidth: '90%',
      }}>
        <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{title}</h3>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 16 }}>{message}</p>
        {inputLabel && (
          <div className="form-group">
            <label className="form-label">{inputLabel}</label>
            <input className="form-control" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn" onClick={() => { setValue(''); onCancel?.(); }}>取消</button>
          <button className="btn btn-primary" onClick={() => { onConfirm?.(value); setValue(''); }}>確認</button>
        </div>
      </div>
    </div>
  );
}
