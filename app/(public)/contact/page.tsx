'use client';

import { useState } from 'react';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/contact', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? 'Could not send your message. Please try again.'); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Message sent</h1>
        <p className="text-slate-500">Thanks for reaching out — we&apos;ll get back to you soon.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-1 text-3xl font-bold text-slate-900">Contact & Support</h1>
      <p className="mb-6 text-slate-500">Have a question or ran into an issue? Send us a message.</p>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <FormField label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <FormField label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <FormField label="Phone (optional)" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Message</label>
          <textarea
            required rows={5} value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
        <Button type="submit" fullWidth loading={loading}>Send message</Button>
      </form>
    </div>
  );
}
