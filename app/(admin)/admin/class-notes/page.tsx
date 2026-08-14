import { createAdminClient } from '@/lib/supabase/admin';

export default async function AdminClassNotesPage() {
  const admin = createAdminClient();

  const { data: notes } = await admin
    .from('class_notes')
    .select(
      'id, title, exam_type, subject, topic, file_name, is_published, created_at'
    )
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Class Notes
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Upload and manage PDF notes for your students.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">
          Notes
        </h2>

        {(!notes || notes.length === 0) ? (
          <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-8 text-center">
            <div className="text-4xl">📚</div>

            <p className="mt-3 font-semibold text-slate-700">
              No class notes yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Uploaded PDF notes will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {note.title}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {note.subject}
                      {note.topic ? ` • ${note.topic}` : ''}
                      {' • '}
                      {note.exam_type.toUpperCase()}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {note.file_name}
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
                      note.is_published
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {note.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
