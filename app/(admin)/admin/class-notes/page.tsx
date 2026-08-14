'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminClassNotesPage() {
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [examType, setExamType] = useState('jamb');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
        setError('You must be logged in as an admin.');
        setLoading(false);
        return;
      }

      const fileExtension = file.name.split('.').pop() || 'pdf';

      const safeFileName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-');

      const filePath = `${user.id}/${Date.now()}-${safeFileName}.${fileExtension}`;

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
        'Class note uploaded successfully and saved as a draft.'
      );
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
    </div>
  );
}
