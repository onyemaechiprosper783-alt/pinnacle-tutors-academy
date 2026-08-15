import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentProfile } from '@/lib/supabase/server';

export default async function BookmarksPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center text-sm font-semibold text-emerald-600 hover:text-emerald-700"
          >
            ← Back to Dashboard
          </Link>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
                🔖
              </div>

              <div>
                <h1 className="text-2xl font-black text-slate-900">
                  My Bookmarks
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Questions you save for later will appear here.
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-4xl">
            🔖
          </div>

          <h2 className="mt-5 text-xl font-black text-slate-900">
            No bookmarks yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            When you bookmark a question while practicing, it will be saved
            here so you can easily come back to it later.
          </p>

          <Link
            href="/practice"
            className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
          >
            Start Practicing →
          </Link>
        </section>
      </div>
    </main>
  );
}
