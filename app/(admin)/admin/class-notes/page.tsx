'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type ClassNote = {
  id: string;
  title: string;
  description: string | null;
  exam_type: string;
  subject: string;
  topic: string | null;
  file_name: string;
  is_published: boolean;
  created_at: string;
};

export default function AdminClassNotesPage() {
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [examType, setExamType] = useState('jamb');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [notes, setNotes] = useState<ClassNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadNotes() {
    setLoadingNotes(true);

    const { data, error: notesError } = await supabase
      .from('class_notes')
      .select(
        'id, title, description, exam_type, subject, topic, file_name, is_published, created_at'
      )
      .order('created_at', { ascending: false });

    if (notesError) {
      setError(notesError.message);
      setLoadingNotes(false);
      return;
    }

    setNotes((data ?? []) as ClassNote[]);
    setLoadingNotes(false);
  }

  useEffect(() => {
    loadNotes();
  }, []);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage('');
    setError('');

    if (!title.trim()) {
      setError('Please enter a note title.');
      return;
    }

    if (!subject.trim()) {
      setError('Please enter the subject.');
      return;
    }

    if (!file) {
      setError('Please select a PDF file.');
      return;
    }

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('The PDF must be 20MB or smaller.');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('You must be logged in as an admin.');
      }

      const safeFileName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-');

      const filePath = `${user.id}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('class-notes')
        .upload(filePath, file, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { error: databaseError } = await supabase
        .from('class_notes')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          exam_type: examType,
          subject: subject.trim(),
          topic: topic.trim() || null,
          file_path: filePath,
          file_name: file.name,
          is_published: false,
          created_by: user.id,
        });

      if (databaseError) {
        await supabase.storage
          .from('class-notes')
          .remove([filePath]);

        throw new Error(databaseError.message);
      }

      setTitle('');
      setDescription('');
      setExamType('jamb');
      setSubject('');
      setTopic('');
      setFile(null);

      const fileInput = document.getElementById(
        'class-note-file'
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = '';
      }

      setMessage(
        'Class note uploaded successfully as a draft. Publish it below when ready.'
      );

      await loadNotes();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while uploading the note.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function togglePublished(
    noteId: string,
    currentlyPublished: boolean
  ) {
    setMessage('');
    setError('');
    setUpdatingId(noteId);

    const { error: updateError } = await supabase
      .from('class_notes')
      .update({
        is_published: !currentlyPublished,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId);

    if (updateError) {
      setError(updateError.message);
      setUpdatingId(null);
      return;
    }

    setMessage(
      currentlyPublished
        ? 'Class note unpublished successfully.'
        : 'Class note published successfully.'
    );

    await loadNotes();

    setUpdatingId(null);
  }

  async function deleteNote(note: ClassNote) {
    const confirmed = window.confirm(
      `Delete "${note.title}"? This will remove the note from the system.`
    );

    if (!confirmed) return;

    setMessage('');
    setError('');
    setUpdatingId(note.id);

    const { data: noteData, error: fetchError } = await supabase
      .from('class_notes')
      .select('file_path')
      .eq('id', note.id)
      .single();

    if (fetchError || !noteData) {
      setError(
        fetchError?.message || 'Could not find the note file.'
      );
      setUpdatingId(null);
      return;
    }

    const { error: deleteDatabaseError } = await supabase
      .from('class_notes')
      .delete()
      .eq('id', note.id);

    if (deleteDatabaseError) {
      setError(deleteDatabaseError.message);
      setUpdatingId(null);
      return;
    }

    await supabase.storage
      .from('class-notes')
      .remove([noteData.file_path]);

    setMessage('Class note deleted successfully.');

    await loadNotes();

    setUpdatingId(null);
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Class Notes
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Upload and manage PDF notes for your students.
        </p>
      </div>

      {message && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* UPLOAD */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">
          Upload Class Note
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Upload a PDF and add the information students will see.
        </p>

        <form onSubmit={handleUpload} className="mt-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Note title
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. JAMB Biology - Cell Structure"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Description
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this note..."
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Exam type
              </label>

              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="jamb">JAMB / UTME</option>
                <option value="waec">WAEC</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Subject
              </label>

              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Biology"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Topic
            </label>

            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Cell Structure and Functions"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              PDF file
            </label>

            <input
              id="class-note-file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) =>
                setFile(e.target.files?.[0] ?? null)
              }
              className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
            />

            <p className="mt-2 text-xs text-slate-400">
              PDF only. Maximum size: 20MB.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {loading ? 'Uploading...' : 'Upload Class Note'}
          </button>
        </form>
      </div>

      {/* MANAGE NOTES */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            Manage Class Notes
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Publish notes when they are ready for students.
          </p>
        </div>

        {loadingNotes ? (
          <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
            Loading notes...
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <div className="text-4xl">📚</div>

            <p className="mt-3 font-semibold text-slate-700">
              No class notes yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-900">
                        {note.title}
                      </h3>

                      {note.is_published ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                          Published
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                          Draft
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {note.subject}
                      {note.topic ? ` • ${note.topic}` : ''}
                      {' • '}
                      {note.exam_type.toUpperCase()}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-400">
                      {note.file_name}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={updatingId === note.id}
                      onClick={() =>
                        togglePublished(
                          note.id,
                          note.is_published
                        )
                      }
                      className={
                        note.is_published
                          ? 'rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50'
                          : 'rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50'
                      }
                    >
                      {updatingId === note.id
                        ? 'Updating...'
                        : note.is_published
                          ? 'Unpublish'
                          : 'Publish'}
                    </button>

                    <button
                      type="button"
                      disabled={updatingId === note.id}
                      onClick={() => deleteNote(note)}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
