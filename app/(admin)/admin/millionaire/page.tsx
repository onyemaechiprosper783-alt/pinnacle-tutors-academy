'use client';

import { useEffect, useState } from 'react';

interface Question { id: string; question_text: string; millionaire_tier: number | null; modes: string[]; subjects: { name: string } | null; }
const TIERS = Array.from({ length: 15 }, (_, i) => i + 1);

type ParsedImport = { question_text: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: 'A'|'B'|'C'|'D'; explanation?: string; subject: string; topic?: string; difficulty?: 'easy'|'medium'|'hard'; exam_type?: 'jamb'|'waec'|'utme'|'general'; year?: number; passage_text?: string };
const key = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

export default function AdminMillionairePage() {
  const [questions, setQuestions] = useState<Question[]>([]); const [search, setSearch] = useState(''); const [bulkText, setBulkText] = useState(''); const [bulkMessage, setBulkMessage] = useState(''); const [bulkError, setBulkError] = useState(''); const [importing, setImporting] = useState(false);
  function load() { const params = new URLSearchParams({ mode: 'millionaire' }); if (search) params.set('search', search); fetch(`/api/questions?${params}`).then(r => r.json()).then(d => setQuestions(d.questions ?? [])); }
  useEffect(() => { load(); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  async function assignTier(id: string, tier: number | null) { await fetch(`/api/questions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ millionaire_tier: tier }) }); load(); }

  async function bulkImport() {
    setBulkMessage(''); setBulkError('');
    if (!bulkText.trim()) { setBulkError('Paste your questions first.'); return; }
    setImporting(true);
    try {
      const tierMap = new Map<string, number>(); let currentTier: number | null = null;
      for (const line of bulkText.split(/\r?\n/)) { const m = line.trim().match(/^Tier\s*:\s*(\d{1,2})$/i); if (m) { const n = Number(m[1]); if (n < 1 || n > 15) throw new Error('Tier must be between 1 and 15.'); currentTier = n; } }
      if (!currentTier) throw new Error('Add a Tier: 1 through Tier: 15 line before each question.');
      const cleaned = bulkText.split(/\r?\n/).filter(line => !/^\s*Tier\s*:\s*\d{1,2}\s*$/i.test(line)).join('\n');
      const previewRes = await fetch('/api/bulk-import/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raw_text: cleaned }) });
      const preview = await previewRes.json(); if (!previewRes.ok) throw new Error(preview.error || 'Could not preview import.');
      const tierLines = bulkText.split(/\r?\n/); let tier: number | null = null; const tierByQuestion = new Map<string, number>();
      for (const line of tierLines) { const m = line.trim().match(/^Tier\s*:\s*(\d{1,2})$/i); if (m) tier = Number(m[1]); else if (line.trim().toLowerCase().startsWith('question:') && tier) tierByQuestion.set(key(line.replace(/^\s*question\s*:\s*/i, '')), tier); }
      const valid = (preview.valid ?? []) as ParsedImport[];
      if (!valid.length) throw new Error('No valid questions were found. Check the bulk-import format.');
      const questionsWithTier = valid.map(q => ({ ...q, modes: ['millionaire'], millionaire_tier: tierByQuestion.get(key(q.question_text)) ?? null })).filter(q => q.millionaire_tier);
      if (!questionsWithTier.length) throw new Error('No Tier values could be matched to the imported questions.');
      const commitRes = await fetch('/api/bulk-import/commit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ batch_id: preview.batch_id, questions: questionsWithTier }) });
      const result = await commitRes.json(); if (!commitRes.ok) throw new Error(result.database_error?.message || result.error || 'Could not import questions.');
      setBulkMessage(`Imported ${result.imported ?? 0} Millionaire questions. Their tiers were assigned automatically.`); setBulkText(''); load();
    } catch (e) { setBulkError(e instanceof Error ? e.message : 'Import failed.'); } finally { setImporting(false); }
  }

  const byTier = new Map(questions.map(q => [q.millionaire_tier, q]));
  return <div className="space-y-8 pb-10">
    <div><h1 className="mb-1 text-2xl font-bold text-slate-900">Millionaire Mode 💰</h1><p className="text-slate-500">Build the 15-level game and import questions in bulk.</p></div>
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="text-lg font-black text-emerald-900">Bulk Import Millionaire Questions</h2><p className="mt-1 text-sm text-emerald-800">Use the normal bulk-question format, but put <b>Tier: 1</b> through <b>Tier: 15</b> immediately before each question. Imported questions are automatically tagged for Millionaire.</p><textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={12} placeholder={'Tier: 1\nQuestion: What is ...?\nA: ...\nB: ...\nC: ...\nD: ...\nAnswer: B\nSubject: General'} className="mt-4 w-full rounded-xl border border-emerald-200 bg-white p-4 font-mono text-sm" />{bulkMessage && <p className="mt-3 text-sm font-bold text-emerald-700">{bulkMessage}</p>}{bulkError && <p className="mt-3 text-sm font-bold text-red-600">{bulkError}</p>}<button disabled={importing} onClick={bulkImport} className="mt-4 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{importing ? 'Importing…' : 'Preview & Import Questions'}</button></section>
    <section><h2 className="mb-3 text-xl font-black text-slate-800">Prize Tiers</h2><div className="grid grid-cols-1 gap-2 md:grid-cols-3">{TIERS.map(tier => { const assigned = byTier.get(tier); return <div key={tier} className="rounded-xl border border-slate-200 bg-white p-3"><p className="mb-1 text-xs font-semibold uppercase text-slate-400">Tier {tier}</p>{assigned ? <><p className="mb-2 truncate text-sm text-slate-800">{assigned.question_text}</p><button onClick={() => assignTier(assigned.id, null)} className="text-xs font-medium text-red-600">Remove</button></> : <p className="text-sm text-slate-300">Empty</p>}</div>; })}</div></section>
    <section><h2 className="mb-2 font-semibold text-slate-800">Unassigned millionaire-tagged questions</h2><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="mb-3 w-full max-w-sm rounded-lg border border-slate-300 px-4 py-2 text-sm" /><div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">{questions.filter(q => !q.millionaire_tier).map(q => <div key={q.id} className="flex items-center justify-between gap-3 px-4 py-3"><span className="flex-1 truncate text-sm text-slate-800">{q.question_text}</span><select onChange={e => e.target.value && assignTier(q.id, parseInt(e.target.value, 10))} defaultValue="" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"><option value="" disabled>Assign tier...</option>{TIERS.filter(t => !byTier.has(t)).map(t => <option key={t} value={t}>Tier {t}</option>)}</select></div>)}</div></section>
  </div>;
}
