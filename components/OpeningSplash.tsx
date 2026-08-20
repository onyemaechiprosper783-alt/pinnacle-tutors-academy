'use client';

import { useEffect, useState } from 'react';

export default function OpeningSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-[var(--background)] px-6 transition-opacity duration-500" role="status" aria-label="Opening Pinnacle Tutors Academy">
      <div className="flex flex-col items-center text-center animate-[ptaSplash_.9s_ease-out_both]">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-black/5 animate-[ptaLogo_.9s_ease-out_both]">
          <img src="/icon-192.png" alt="" className="h-full w-full object-contain" />
        </div>
        <h1 className="mt-6 text-2xl font-black tracking-tight text-[var(--foreground)] sm:text-3xl">Pinnacle Tutors Academy</h1>
        <p className="mt-2 text-sm font-bold text-brand-600 dark:text-brand-400">The Best for Exams</p>
      </div>
    </div>
  );
}
