'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Bookmark = {
  id: string;
  question_text: string;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  subject_name?: string;
};

const STORAGE_KEY = 'pinnacle-bookmarked-questions';

export default function BookmarksPage() {
  const [items, setItems] = useState<Bookmark[]>([]);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Bookmark[]);
    } catch {
      setItems([]);
    }
  }, []);

  function remove(id: string) {
    const next = items.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setItems(next);
  }

  function clearAll() {
    localStorage.removeItem(STORAGE_KEY);
    setItems([]);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Study Tools</p>
          <h1 className="mt-1 text-3xl font-black">🔖 Bookmarked Questions</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Save questions while practicing and come back to review them later.</p>
        </div>
        {items.length > 0 && <button type="button" onClick={clearAll} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50">Clear all</button>}
      </div>

      {items.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--card)] p-10 text-center">
          <div className="text-5xl">🔖</div>
          <h2 className="mt-4 text-xl font-black">No bookmarks yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">Start a practice session and tap the Bookmark button on any question you want to review.</p>
          <Link href="/practice" className="mt-5 inline-flex rounded-xl bg-orange-600 px-5 py-3 text-sm font-black text-white">Start Practicing →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <article key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wider text-orange-600">Question {index + 1}{item.subject_name ? ` · ${item.subject_name}` : ''}</p>
                  <p className="mt-3 font-semibold leading-7">{item.question_text}</p>
                </div>
                <button type="button" onClick={() => remove(item.id)} aria-label="Remove bookmark" className="shrink-0 rounded-lg px-2 py-1 text-xl hover:bg-red-50">🗑️</button>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {(['a', 'b', 'c', 'd'] as const).map((letter) => {
                  const value = item[`option_${letter}`];
                  return <div key={letter} className="rounded-xl bg-[var(--background)] p-3 text-sm"><span className="mr-2 font-black">{letter.toUpperCase()}.</span>{value}</div>;
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
