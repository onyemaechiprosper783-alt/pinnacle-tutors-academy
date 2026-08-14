import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile, createClient } from '@/lib/supabase/server';
import { hasActiveStudentAccess } from '@/lib/access/student-access';

type ClassNote = {
  id: string;
  title: string;
  description: string | null;
  exam_type: 'jamb' | 'waec' | 'both';
  subject: string;
  topic: string | null;
  file_name: string;
  created_at: string;
};

export default async function ClassNotesPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect('/login');
  }

  const hasAccess = await hasActiveStudentAccess();

  const supabase = await createClient();

  let notes: ClassNote[] = [];

  if (hasAccess) {
    const { data } = await supabase
      .from('class_notes')
      .select(
        'id, title, description, exam_type, subject, topic, file_name, created_at'
      )
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    notes = (data ?? []) as ClassNote[];
  }

  // Activation Key request should appear exactly 2 weeks
  // before October 1, 2026.
  const activationStart = new Date('2026-09-17T00:00:00+01:00');
  const now = new Date();

  const showActivationRequest = now >= activationStart;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">

      {/* HEADER */}
      <section className="rounded-[28px] bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 px-6 py-8 text-white shadow-xl sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">
          Pinnacle Tutors Academy
        </p>

        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          Class Notes 📚
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">
          Study materials, revision notes and learning resources from
          Pinnacle Tutors Academy.
        </p>
      </section>

      {/* ACCESS LOCK */}
      {!hasAccess ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <div className="text-4xl">🔒</div>

          <h2 className="mt-3 text-xl font-black text-slate-900">
            Your access has expired
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Your Product Key access is no longer active.
            {showActivationRequest
              ? ' Request an Activation Key to continue accessing Class Notes.'
              : ' Product Key access is currently required to access Class Notes.'}
          </p>

          {showActivationRequest ? (
            <Link
              href="/register"
              className="mt-5 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
            >
              Request Activation Key
            </Link>
          ) : (
            <Link
              href="/register"
              className="mt-5 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
            >
              Request Product Key
            </Link>
          )}
        </section>
      ) : notes.length === 0 ? (
        /* EMPTY STATE */
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <div className="text-5xl">📖</div>

          <h2 className="mt-4 text-xl font-black text-slate-900">
            No class notes published yet
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Your teachers haven't published any class notes yet.
            Check back soon.
          </p>
        </section>
      ) : (
        /* NOTES */
        <section>
          <div className="mb-5">
            <h2 className="text-2xl font-black text-slate-900">
              Available Notes
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Choose a note below to continue studying.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <article
                key={note.id}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-2xl">
                    📄
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700">
                    {note.exam_type}
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-black text-slate-900">
                  {note.title}
                </h3>

                <p className="mt-2 text-sm font-semibold text-emerald-700">
                  {note.subject}
                  {note.topic ? ` • ${note.topic}` : ''}
                </p>

                {note.description && (
                  <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate-500">
                    {note.description}
                  </p>
                )}

                <p className="mt-4 truncate text-xs text-slate-400">
                  {note.file_name}
                </p>

                <div className="mt-5">
                  <Link
                    href={`/class-notes/${note.id}`}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
                  >
                    Open Note →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
