'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface Announcement { id: string; title: string; body: string; created_at: string; }

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [form, setForm] = useState({ title: '', body: '' });
  const [loading, setLoading] = useState(false);

  function load() {
    fetch('/api/announcements').then((r) => r.json()).then(setAnnouncements);
  }
  useEffect(() => { load(); }, []);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/announcements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    setForm({ title: '', body: '' });
    setLoading(false);
    load();
  }

  async function handleRemove(id: string) {
    await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Announcements</h1>

      <form onSubmit={handlePost} className="mb-6 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <input
          required placeholder="Title" value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
        />
        <textarea
          required rows={3} placeholder="Message" value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
        />
        <Button type="submit" loading={loading}>Post announcement</Button>
      </form>

      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {announcements.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium text-slate-800">{a.title}</p>
              <p className="text-sm text-slate-500">{a.body}</p>
            </div>
            <button onClick={() => handleRemove(a.id)} className="shrink-0 text-sm font-medium text-red-600">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
