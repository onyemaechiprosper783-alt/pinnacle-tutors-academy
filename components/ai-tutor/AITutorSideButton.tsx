'use client';

import Link from 'next/link';

export default function AITutorSideButton() {
  return (
    <Link
      href="/ai-tutor"
      aria-label="Open Nia AI Tutor"
      className="fixed bottom-5 right-4 z-50 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-[var(--card)] px-3 py-3 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl sm:bottom-6 sm:right-6 md:right-8"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-md">
        🤖
      </span>
      <span className="hidden min-w-0 sm:block">
        <span className="block text-[10px] font-black uppercase tracking-widest text-emerald-600">
          AI Tutor
        </span>
        <span className="block text-sm font-black text-[var(--foreground)]">
          Ask Nia
        </span>
        <span className="block text-xs text-[var(--muted)]">
          Learn anything
        </span>
      </span>
    </Link>
  );
}
