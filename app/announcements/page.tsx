import Link from 'next/link';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  active: boolean;
};

export default async function AnnouncementsPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">
            Please log in
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            You need to be logged in to view announcements.
          </p>

          <Link
            href="/login"
            className="mt-5 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white"
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  const admin = createAdminClient();

  const { data: announcementsData } = await admin
    .from('announcements')
    .select('id, title, body, created_at, active')
    .eq('active', true)
    .order('created_at', { ascending: false });

  const announcements = (announcementsData ?? []) as Announcement[];

  const { data: readsData } = await admin
    .from('announcement_reads')
    .select('announcement_id')
    .eq('user_id', profile.id);

  const readIds = new Set(
    (readsData ?? []).map((item) => item.announcement_id)
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl">

        {/* BACK */}
        <Link
          href="/dashboard"
          className="mb-5 inline-flex items-center text-sm font-bold text-emerald-600 hover:text-emerald-700"
        >
          ← Back to Dashboard
        </Link>

        {/* HEADER */}
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 p-6 text-white md:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-3xl">
                🔔
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-100">
                  Pinnacle Tutors Academy
                </p>

                <h1 className="mt-1 text-2xl font-black md:text-3xl">
                  Announcements
                </h1>

                <p className="mt-1 text-sm text-emerald-50 md:text-base">
                  Stay updated with important information from Pinnacle.
                </p>
              </div>
            </div>
          </div>

          {/* ANNOUNCEMENTS */}
          <div className="p-5 md:p-8">

            {announcements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <div className="text-5xl">🔔</div>

                <h2 className="mt-4 text-xl font-black text-slate-900">
                  No announcements yet
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  There are currently no active announcements. Check back
                  later for updates.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => {
                  const isRead = readIds.has(announcement.id);

                  return (
                    <article
                      key={announcement.id}
                      className={`rounded-2xl border p-5 transition ${
                        isRead
                          ? 'border-slate-200 bg-white'
                          : 'border-emerald-200 bg-emerald-50/40 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-4">

                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${
                            isRead
                              ? 'bg-slate-100'
                              : 'bg-emerald-100'
                          }`}
                        >
                          🔔
                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-black text-slate-900">
                              {announcement.title}
                            </h2>

                            {!isRead && (
                              <span className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                                New
                              </span>
                            )}
                          </div>

                          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                            {announcement.body}
                          </p>

                          <p className="mt-4 text-xs font-semibold text-slate-400">
                            {new Date(
                              announcement.created_at
                            ).toLocaleString()}
                          </p>

                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

          </div>
        </section>

      </div>
    </main>
  );
}
