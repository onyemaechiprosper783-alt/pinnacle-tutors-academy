'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type ClassNote = {
  id: string; title: string; description: string | null; exam_type: string; subject: string; topic: string | null;
  file_name: string; video_url: string | null; is_published: boolean; created_at: string;
};

export default function AdminClassNotesPage() {
  const supabase = createClient();
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [examType, setExamType] = useState('jamb');
  const [subject, setSubject] = useState(''); const [topic, setTopic] = useState(''); const [videoUrl, setVideoUrl] = useState(''); const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState<ClassNote[]>([]); const [loading, setLoading] = useState(false); const [loadingNotes, setLoadingNotes] = useState(true); const [updatingId, setUpdatingId] = useState<string | null>(null); const [message, setMessage] = useState(''); const [error, setError] = useState('');

  async function loadNotes() {
    setLoadingNotes(true);
    const { data, error: notesError } = await supabase.from('class_notes').select('id,title,description,exam_type,subject,topic,file_name,video_url,is_published,created_at').order('created_at', { ascending: false });
    if (notesError) setError(notesError.message); else setNotes((data ?? []) as ClassNote[]);
    setLoadingNotes(false);
  }
  useEffect(() => { loadNotes(); }, []);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMessage(''); setError('');
    if (!title.trim() || !subject.trim()) return setError('Title and subject are required.');
    if (!file) return setError('Please select a PDF class note.');
    if (file.type !== 'application/pdf') return setError('Only PDF files are allowed.');
    if (file.size > 20 * 1024 * 1024) return setError('The PDF must be 20MB or smaller.');
    if (videoUrl.trim()) { try { new URL(videoUrl.trim()); } catch { return setError('Please enter a valid video URL.'); } }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('You must be logged in as an admin.');
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-'); const filePath = `${user.id}/${Date.now()}-${safe}`;
      const { error: uploadError } = await supabase.storage.from('class-notes').upload(filePath, file, { contentType: 'application/pdf', upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      const { error: dbError } = await supabase.from('class_notes').insert({ title: title.trim(), description: description.trim() || null, exam_type: examType, subject: subject.trim(), topic: topic.trim() || null, file_path: filePath, file_name: file.name, video_url: videoUrl.trim() || null, is_published: false, created_by: user.id });
      if (dbError) { await supabase.storage.from('class-notes').remove([filePath]); throw new Error(dbError.message); }
      setTitle(''); setDescription(''); setExamType('jamb'); setSubject(''); setTopic(''); setVideoUrl(''); setFile(null);
      const input = document.getElementById('class-note-file') as HTMLInputElement | null; if (input) input.value = '';
      setMessage('Class note and optional video lesson saved as a draft. Publish it when ready.'); await loadNotes();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not upload class note.'); } finally { setLoading(false); }
  }

  async function togglePublished(note: ClassNote) {
    setUpdatingId(note.id); setMessage(''); setError('');
    const { error: updateError } = await supabase.from('class_notes').update({ is_published: !note.is_published, updated_at: new Date().toISOString() }).eq('id', note.id);
    if (updateError) setError(updateError.message); else { setMessage(note.is_published ? 'Class note unpublished.' : 'Class note published.'); await loadNotes(); }
    setUpdatingId(null);
  }

  async function deleteNote(note: ClassNote) {
    if (!window.confirm(`Delete "${note.title}"?`)) return; setUpdatingId(note.id); setMessage(''); setError('');
    const { data: noteData } = await supabase.from('class_notes').select('file_path').eq('id', note.id).single();
    const { error: dbError } = await supabase.from('class_notes').delete().eq('id', note.id);
    if (dbError) setError(dbError.message); else { if (noteData?.file_path) await supabase.storage.from('class-notes').remove([noteData.file_path]); setMessage('Class note deleted.'); await loadNotes(); }
    setUpdatingId(null);
  }

  return <div className="space-y-6 pb-10">
    <div><h1 className="text-2xl font-bold text-slate-900">Class Notes & Video Lessons</h1><p className="mt-1 text-sm text-slate-500">Upload a PDF note and optionally attach a video lesson for students.</p></div>
    {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div>}
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
    <form onSubmit={handleUpload} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Lesson title" className="rounded-xl border p-3" />
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className="rounded-xl border p-3" />
        <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic (optional)" className="rounded-xl border p-3" />
        <select value={examType} onChange={e => setExamType(e.target.value)} className="rounded-xl border p-3"><option value="jamb">JAMB</option><option value="waec">WAEC</option><option value="both">Both</option></select>
        <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="Video lesson URL (YouTube, Vimeo, etc.)" className="rounded-xl border p-3 md:col-span-2" />
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={3} className="rounded-xl border p-3 md:col-span-2" />
        <input id="class-note-file" type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} className="rounded-xl border p-3 md:col-span-2" />
      </div>
      <button disabled={loading} className="mt-4 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{loading ? 'Uploading…' : 'Upload Class Note'}</button>
    </form>
    <section><h2 className="mb-3 text-xl font-black text-slate-900">Published & Draft Lessons</h2>{loadingNotes ? <p className="text-sm text-slate-500">Loading…</p> : <div className="space-y-3">{notes.map(note => <div key={note.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-black text-slate-900">{note.title}</p><p className="text-sm text-emerald-700">{note.subject}{note.topic ? ` • ${note.topic}` : ''}</p><p className="text-xs text-slate-500">{note.is_published ? 'Published' : 'Draft'} · {note.video_url ? '🎥 Video attached' : 'No video'}</p></div><div className="flex gap-2"><button disabled={updatingId === note.id} onClick={() => togglePublished(note)} className="rounded-lg border px-3 py-2 text-xs font-bold">{note.is_published ? 'Unpublish' : 'Publish'}</button><button disabled={updatingId === note.id} onClick={() => deleteNote(note)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600">Delete</button></div></div>)}</div>}</section>
  </div>;
}
