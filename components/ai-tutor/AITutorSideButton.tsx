'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AITutorSideButton() {
  const pathname = usePathname();

  // Nia is a study assistant, not part of the exam UI.
  // Hide the floating tutor button anywhere a student is actively
  // working through an exam/practice attempt.
  const isExamRoute =
    pathname === '/cbt' ||
    pathname.startsWith('/cbt/') ||
    pathname === '/mock' ||
    pathname.startsWith('/mock/') ||
    pathname === '/practice' ||
    pathname.startsWith('/practice/') ||
    pathname === '/challenge' ||
    pathname.startsWith('/challenge/');

  if (isExamRoute) return null;

  return (
    <Link
      href="/ai-tutor"
      aria-label="Open Nia AI Tutor"
      className="group fixed bottom-5 right-4 z-50 flex items-center gap-3 overflow-hidden rounded-[22px] border border-emerald-200/70 bg-[var(--card)]/95 px-3 py-2.5 shadow-[0_14px_40px_rgba(5,150,105,0.22)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_18px_50px_rgba(5,150,105,0.3)] dark:border-emerald-700/50 sm:bottom-6 sm:right-6 md:right-8"
    >
      <span className="absolute inset-0 -z-10 bg-gradient-to-r from-emerald-500/10 via-teal-400/10 to-cyan-400/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[17px] bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-2xl text-white shadow-lg shadow-emerald-500/25">
        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full border-2 border-[var(--card)] bg-lime-400" />
        🤖
      </span>
      <span className="hidden min-w-0 pr-1 sm:block">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
          Nia <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] tracking-normal text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">AI</span>
        </span>
        <span className="block text-sm font-black text-[var(--foreground)]">Ask Nia</span>
        <span className="block text-[11px] text-[var(--muted)]">Your personal study tutor ✨</span>
      </span>
    </Link>
  );
}
