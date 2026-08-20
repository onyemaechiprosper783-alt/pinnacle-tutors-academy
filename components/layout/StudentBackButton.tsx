'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function StudentBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (!pathname || pathname === '/dashboard') return null;

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-bold text-[var(--foreground)] shadow-sm transition hover:bg-[var(--background)] active:scale-[0.98]"
      aria-label="Go back"
    >
      ← Back
    </button>
  );
}
