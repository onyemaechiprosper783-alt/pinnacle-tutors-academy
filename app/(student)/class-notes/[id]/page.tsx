import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentProfile, createClient } from '@/lib/supabase/server';
import { hasActiveStudentAccess } from '@/lib/access/student-access';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClassNotePage({ params }: PageProps) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect('/login');
  }

  const hasAccess = await hasActiveStudentAccess();

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <div className="text-5xl">🔒</div>

          <h1 className="mt-4 text-2xl font-black text-slate-900">
            Your access has expired
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
            Your Product Key is no longer active. You need an Activation
            Key to continue accessing Class Notes.
          </p>

          <Link
            href="/register"
            className="mt-6 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white"
          >
            Request Activation Key
          </Link>
        </div>
      </div>
    );
  }

  const { id } = await params;

  const supabase = await createClient();

  const { data: note, error } = await supabase
    .from('class_notes')
    .select(
      'id, title, description, exam_type, subject, topic, file_path, file_name'
    )
    .eq('id', id)
    .eq('is_published', true)
    .single();

  if (error || !note) {
    notFound();
  }

  const { data: signedUrlData, error: signedUrlError } =
    await supabase.storage
      .from('class-notes')
      .createSignedUrl(note.file_path, 60 * 60);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="text-4xl">⚠️</div>

          <h1 className="mt-4 text-xl font-black text-slate-900">
            Unable to open this note
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            The note file could not be loaded. Please try again later.
          </p>

          <Link
            href="/class-notes"
            className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white"
          >
            Back to Class Notes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">
            {note.exam_type}
          </p>

          <h1 className="mt-1 text-2xl font-black text-slate-900">
            {note.title}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {note.subject}
            {note.topic ? ` • ${note.topic}` : ''}
          </p>
        </div>

        <Link
          href="/class-notes"
          className="inline-flex w-fit rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ← Back to Notes
        </Link>
      </div>

      {note.description && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm leading-6 text-slate-600">
            {note.description}
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-lg">
        <iframe
          src={signedUrlData.signedUrl}
          title={note.title}
          className="h-[80vh] w-full"
        />
      </div>
    </div>
  );
}
