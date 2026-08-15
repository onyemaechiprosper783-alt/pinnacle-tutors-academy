'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Announcement = {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  created_at: string;
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnnouncements = async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, body, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setError('Unable to load announcements.');
      setLoading(false);
      return;
    }

    setAnnouncements(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl">

        <Link
          href="/dashboard"
          className="mb-5 inline-flex items-center text-sm font-bold text-emerald-600 hover:text-emerald-700"
        >
          ← Back to Dashboard
        </Link>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">

          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-white md:p-8">
            <div className="flex items-center gap-4">

              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-3xl">
                🔔
              </div>

              <div>
                <h1 className="text-2xl font-black md:text-3xl">
                  Announcements
                </h1>

                <p className="mt-1 text-sm text-emerald-50 md:text-base">
                  Stay updated with the latest news from Pinnacle Tutors.
                </p>
              </div>

            </div>
          </div>

          <div className="p-5 md:p-8">

            {loading && (
              <div className="py-12 text-center">
                <div className="text-4xl">🔄</div>

                <p className="mt-3 text-sm font-semibold text-slate-500">
                  Loading announcements...
                </p>
              </div>
            )}

            {!loading && error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
                <div className="text-4xl">⚠️</div>

                <h2 className="mt-3 font-black text-red-900">
                  Something went wrong
                </h2>

                <p className="mt-2 text-sm text-red-700">
                  {error}
                </p>

                <button
                  onClick={loadAnnouncements}
                  className="mt-5 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && announcements.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <div className="text-5xl">📭</div>

                <h2 className="mt-4 text-xl font-black text-slate-900">
                  No announcements yet
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  There are currently no new announcements from Pinnacle
                  Tutors.
                </p>
              </div>
            )}

            {!loading && !error && announcements.length > 0 && (
              <div className="space-y-4">

                {announcements.map((announcement) => (
                  <article
                    key={announcement.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/20"
                  >
                    <div className="flex items-start gap-4">

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
                        📢
                      </div>

                      <div className="min-w-0 flex-1">

                        <h2 className="text-lg font-black text-slate-900">
                          {announcement.title}
                        </h2>

                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {new Date(
                            announcement.created_at
                          ).toLocaleString()}
                        </p>

                        <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                          {announcement.body}
                        </div>

                      </div>

                    </div>
                  </article>
                ))}

              </div>
            )}

          </div>
        </section>

      </div>
    </main>
  );
}
