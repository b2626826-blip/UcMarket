import { useEffect } from 'react';

export default function Modal({ open, onClose, title, description, children }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="wallet-modal active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wallet-modal-card">
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h3>{title}</h3>
        <p>{description}</p>
        {children}
      </div>
    </div>
  );
}
