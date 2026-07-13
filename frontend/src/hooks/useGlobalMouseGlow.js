import { useEffect } from 'react';

export default function useGlobalMouseGlow() {
  useEffect(() => {
    function handler(event) {
      document.documentElement.style.setProperty('--app-mouse-x', `${event.clientX}px`);
      document.documentElement.style.setProperty('--app-mouse-y', `${event.clientY}px`);
    }

    document.addEventListener('mousemove', handler);
    return () => document.removeEventListener('mousemove', handler);
  }, []);
}
