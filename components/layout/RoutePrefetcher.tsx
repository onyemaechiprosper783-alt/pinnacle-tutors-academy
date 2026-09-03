'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ROUTES = [
  '/practice',
  '/mock',
  '/cbt',
  '/challenge',
  '/ai-tutor',
  '/progress',
  '/results',
  '/class-notes',
];

export default function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType ?? '')) return;

    const prefetch = () => {
      let index = 0;
      const next = () => {
        if (index >= ROUTES.length) return;
        router.prefetch(ROUTES[index++]);
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(next, { timeout: 1200 });
        } else {
          window.setTimeout(next, 180);
        }
      };
      next();
    };

    const timer = window.setTimeout(prefetch, 1200);
    return () => window.clearTimeout(timer);
  }, [router]);

  return null;
}
