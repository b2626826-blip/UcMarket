import { useEffect } from 'react';

export default function useGlowEffect(selector) {
  useEffect(() => {
    function handler(e) {
      const target = e.target.closest(selector);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty('--mouse-x', (e.clientX - rect.left) + 'px');
      target.style.setProperty('--mouse-y', (e.clientY - rect.top) + 'px');
    }
    document.addEventListener('mousemove', handler);
    return () => document.removeEventListener('mousemove', handler);
  }, [selector]);
}
