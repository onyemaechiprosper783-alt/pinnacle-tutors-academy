'use client';

import { FormEvent, useState } from 'react';

export default function AiTutorPage() {
  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function ask(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text || loading) return;
    setLoading(true); setError(''); setAnswer('');
    try {
      const response = await fetch('/api/ai-tutor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to get an answer.');
      setAnswer(data.answer || '');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to get an answer.'); }
    finally { setLoading(false); }
  }

  return <main className="mx-auto max-w-3xl px-4 py-6">
    <div className="mb-6 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-lg">
      <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">Pinnacle AI Tutor</p>
      <h1 className="mt-1 text-3xl font-black">Meet Nia 🤖</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-white/90">Ask Nia anything you want to understand. She teaches step by step instead of simply giving you an answer.</p>
    </div>
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <form onSubmit={ask}>
        <label className="mb-2 block text-sm font-bold">What would you like to learn?</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={4000} placeholder="Example: Explain photosynthesis to me like I'm preparing for UTME…" className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        <button type="submit" disabled={!message.trim() || loading} className="mt-3 w-full rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Nia is thinking…' : 'Ask Nia'}</button>
      </form>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      {answer && <section className="mt-6 rounded-2xl bg-[var(--background)] p-5"><div className="mb-3 text-sm font-black">🤖 Nia's explanation</div><div className="whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">{answer}</div></section>}
    </div>
  </main>;
}
