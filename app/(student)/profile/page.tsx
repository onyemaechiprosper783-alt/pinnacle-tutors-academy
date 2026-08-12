'use client';

import { useEffect, useState } from 'react';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

export default function ProfilePage() {
  const [form, setForm] = useState({ full_name: '', display_name: '', phone: '', school: '', exam_target: 'jamb' });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/profile/me');
      if (res.ok) {
        const p = await res.json();
        setForm({
          full_name: p.full_name ?? '', display_name: p.display_name ?? '',
          phone: p.phone ?? '', school: p.school ?? '', exam_target: p.exam_target ?? 'jamb',
        });
      }
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    await fetch('/api/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    setLoading(false);
    setSaved(true);
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Your Profile</h1>
      {saved && <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-emerald-700">Saved.</div>}

      <form onSubmit={handleSave}>
        <FormField label="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <FormField
          label="Leaderboard display name (optional)" value={form.display_name}
          onChange={(e) => setForm({ ...form, display_name: e.target.value })}
          placeholder="Shown instead of your full name"
        />
        <FormField label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <FormField label="School" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Exam target</label>
          <select
            value={form.exam_target} onChange={(e) => setForm({ ...form, exam_target: e.target.value })}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500"
          >
            <option value="jamb">JAMB / UTME</option>
            <option value="waec">WAEC</option>
            <option value="both">Both</option>
          </select>
        </div>
        <Button type="submit" loading={loading}>Save changes</Button>
      </form>
    </div>
  );
}
