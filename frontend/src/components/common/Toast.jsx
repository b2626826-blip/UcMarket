import { useEffect } from 'react';
import useUiStore from '../../store/uiStore';

export default function Toast() {
  const toast = useUiStore((s) => s.toast);
  const clearToast = useUiStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clearToast, 2500);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;
  return (
    <div className="auth-toast show">
      <span>{toast.title || toast.message}</span>
    </div>
  );
}
