'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') return;

    const registerSW = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    };

    const timer = window.setTimeout(registerSW, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
