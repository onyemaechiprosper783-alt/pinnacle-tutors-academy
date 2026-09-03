'use client';

import { FormEvent, useRef, useState } from 'react';

function renderTutorText(text: string) {
  return text.split('\n').map((line, index) => {
    const cleaned = line.replace(/^#{1,6}\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/\$\$(.*?)\$\$/g, '$1').replace(/\$(.*?)\$/g, '$1');
    const isBullet = /^\s*[-*]\s+/.test(cleaned);
    const content = cleaned.replace(/^\s*[-*]\s+/, '').replace(/\^\{([^}]+)\}/g, '$1').replace(/\^([0-9]+)/g, '$1');
    return <p key={index} className={isBullet ? 'relative pl-5 before:absolute before:left-1 before:top-3 before:h-1.5 before:w-1.5 before:rounded-full before:bg-emerald-500' : 'min-h-[1.5rem]'}>{content}</p>;
  });
}

export default function AiTutorPage() {
  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  async function ask(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text || loading) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true); setError(''); setAnswer('');
    try {
      const response = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/plain' },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Unable to get an answer.');
      }
      if (!response.body) throw new Error('The AI Tutor returned no response.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullAnswer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullAnswer += decoder.decode(value, { stream: true });
        setAnswer(fullAnswer);
      }
      fullAnswer += decoder.decode();
      setAnswer(fullAnswer.trim());
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Unable to get an answer.');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  }

  return <main className="mx-auto max-w-3xl px-4 py-6">
    <div className="relative mb-6 overflow-hidden rounded-[30px] bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-xl shadow-emerald-900/15">
      <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">Pinnacle AI Tutor</p>
      <h1 className="mt-1 text-3xl font-black">Meet Nia 🤖</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-white/90">Ask Nia anything you want to understand. She teaches step by step instead of simply giving you an answer.</p>
    </div>
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <form onSubmit={ask}>
        <label className="mb-2 block text-sm font-bold">What would you like to learn?</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={4000} placeholder="Example: Explain photosynthesis to me like I'm preparing for UTME…" className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        <button type="submit" disabled={!message.trim() || loading} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 font-bold text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">{loading && !answer ? 'Nia is connecting…' : loading ? 'Nia is explaining…' : 'Ask Nia ✨'}</button>
      </form>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      {answer && <section className="mt-6 rounded-2xl bg-[var(--background)] p-5"><div className="mb-3 flex items-center gap-2 text-sm font-black"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950">🤖</span>{loading ? 'Nia is explaining…' : "Nia's explanation"}</div><div className="space-y-1 text-sm leading-7 text-[var(--foreground)]">{renderTutorText(answer)}</div></section>}
    </div>
  </main>;
}
