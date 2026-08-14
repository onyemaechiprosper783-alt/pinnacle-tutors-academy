'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogoutButton } from '@/components/layout/LogoutButton';

const MENU_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/practice', label: 'Practice', icon: '📚' },
  { href: '/mock', label: 'Mock Exam', icon: '📝' },
  { href: '/cbt', label: 'CBT', icon: '💻' },
  { href: '/challenge', label: 'UTME Challenge', icon: '🔥' },
  { href: '/millionaire', label: 'Millionaire', icon: '💰' },
  { href: '/results', label: 'My Results', icon: '📊' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { href: '/bookmarks', label: 'Bookmarks', icon: '🔖' },
  { href: '/community', label: 'Community', icon: '👥' },
  { href: '/profile', label: 'Profile', icon: '👤' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
  { href: '/product-key', label: 'Product Key', icon: '🔑' },
  { href: '/activation-key', label: 'Activation Key', icon: '🔐' },
  { href: '/career', label: 'Career & Institution', icon: '🎓' },
  { href: '/announcements', label: 'Announcements', icon: '📢' },
  { href: '/feedback', label: 'Feedback', icon: '💬' },
  { href: '/about', label: 'About Pinnacle Tutors', icon: 'ℹ️' },
  { href: '/help', label: 'Help & Contact', icon: '❓' },
];

export function MobileStudentMenu({
  firstName,
  fullName,
}: {
  firstName: string;
  fullName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* OPEN MENU BUTTON */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open student menu"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-700 shadow-sm"
      >
        ☰
      </button>

      {/* MENU */}
      {open && (
        <div className="fixed inset-0 z-[99999] md:hidden">

          {/* BACKDROP */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full bg-black/50"
          />

          {/* MENU PANEL */}
          <div className="absolute right-0 top-0 flex h-full w-[90%] max-w-md flex-col bg-white shadow-2xl">

            {/* HEADER */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-lg font-black text-white">
                  P
                </div>

                <div>
                  <p className="text-base font-black text-slate-900">
                    Pinnacle Tutors
                  </p>

                  <p className="text-xs font-medium text-emerald-600">
                    Student Menu
                  </p>
                </div>

              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-2xl text-slate-700"
              >
                ×
              </button>

            </div>

            {/* STUDENT */}
            <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">

              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-700">
                  {firstName.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">
                    {fullName}
                  </p>

                  <p className="text-xs text-slate-400">
                    Student
                  </p>
                </div>

              </div>

            </div>

            {/* MENU LIST */}
            <div className="flex-1 overflow-y-auto bg-white px-4 py-4">

              <p className="mb-3 px-2 text-xs font-black uppercase tracking-wider text-slate-400">
                Student Menu
              </p>

              <div className="space-y-1">

                {MENU_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                  >

                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-lg">
                      {item.icon}
                    </span>

                    <span className="flex-1">
                      {item.label}
                    </span>

                    <span className="text-slate-300">
                      →
                    </span>

                  </Link>
                ))}

              </div>

              {/* COMMUNITY */}
              <div className="mt-5 rounded-2xl bg-emerald-50 p-4">

                <p className="text-sm font-black text-emerald-900">
                  Join the Pinnacle Family 🚀
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-700">
                  Get announcements, motivation and study updates.
                </p>

                <Link
                  href="/community"
                  onClick={() => setOpen(false)}
                  className="mt-3 flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white"
                >
                  Join Community →
                </Link>

              </div>

            </div>

            {/* LOGOUT */}
            <div className="shrink-0 border-t border-slate-200 bg-white p-4">

              <LogoutButton
                className="w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600"
              />

            </div>

          </div>
        </div>
      )}
    </>
  );
}
