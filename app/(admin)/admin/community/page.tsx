'use client';

import { useEffect, useState } from 'react';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

export default function AdminCommunityPage() {
  const [form, setForm] = useState({ whatsapp_group_url: '', whatsapp_channel_url: '', telegram_url: '' });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/community').then((r) => r.json()).then((d) =>
      setForm({
        whatsapp_group_url: d.whatsapp_group_url ?? '',
        whatsapp_channel_url: d.whatsapp_channel_url ?? '',
        telegram_url: d.telegram_url ?? '',
      })
    );
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    await fetch('/api/community', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    setLoading(false);
    setSaved(true);
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Community Settings</h1>
      <p className="mb-6 text-slate-500">
        These links appear on the Community page for every student — update them here any time, no deploy needed.
      </p>

      {saved && <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-emerald-700">Saved.</div>}

      <form onSubmit={handleSave}>
        <FormField
          label="WhatsApp group link" value={form.whatsapp_group_url}
          onChange={(e) => setForm({ ...form, whatsapp_group_url: e.target.value })}
          placeholder="https://chat.whatsapp.com/..."
        />
        <FormField
          label="WhatsApp channel link" value={form.whatsapp_channel_url}
          onChange={(e) => setForm({ ...form, whatsapp_channel_url: e.target.value })}
          placeholder="https://whatsapp.com/channel/..."
        />
        <FormField
          label="Telegram link (optional)" value={form.telegram_url}
          onChange={(e) => setForm({ ...form, telegram_url: e.target.value })}
          placeholder="https://t.me/..."
        />
        <Button type="submit" loading={loading}>Save changes</Button>
      </form>
    </div>
  );
}
