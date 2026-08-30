'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    let cancelled = false;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none',
        });

        if (!cancelled) {
          console.info('Pinnacle service worker ready:', registration.scope);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Service worker registration failed:', error);
        }
      }
    };

    void registerSW();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
