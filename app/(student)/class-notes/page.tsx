import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/server';
import { hasActiveStudentAccess } from '@/lib/access/student-access';

export default async function ClassNotesPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect('/login');
  }

  const hasAccess = await hasActiveStudentAccess();

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <section className="rounded-[28px] bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 px-6 py-8 text-white shadow-xl sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">
          Pinnacle Tutors Academy
        </p>

        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          Class Notes 📚
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">
          Access your study materials, class notes and revision resources.
        </p>
      </section>

      {!hasAccess ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <div className="text-4xl">🔒</div>

          <h2 className="mt-3 text-xl font-black text-slate-900">
            Your access has expired
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Your Product Key access is no longer active. Request an
            Activation Key to continue accessing Class Notes and other
            learning features.
          </p>

          <Link
            href="/register"
            className="mt-5 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
          >
            Request Activation Key
          </Link>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <div className="text-5xl">📖</div>

          <h2 className="mt-4 text-xl font-black text-slate-900">
            Your class notes will appear here
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Notes uploaded by the Pinnacle Tutors admin will appear here,
            organized by subject and topic.
          </p>
        </section>
      )}
    </div>
  );
}
