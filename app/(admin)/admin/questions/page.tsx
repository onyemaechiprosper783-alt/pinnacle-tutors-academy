'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface QuestionRow {
  id: string;
  question_text: string;
  difficulty: string;
  exam_type: string;
  is_active: boolean;
  subjects: { name: string } | null;
  topics: { name: string } | null;
}

export default function QuestionsListPage() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set('search', search);
    const res = await fetch(`/api/questions?${params}`);
    const data = await res.json();
    setQuestions(data.questions ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    if (!confirm('Deactivate this question? It will stop appearing in new exams but stays in past results.')) return;
    await fetch(`/api/questions/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Questions ({total})</h1>
        <div className="flex gap-2">
          <Link href="/admin/questions/bulk-import"><Button variant="secondary">Bulk Import</Button></Link>
          <Link href="/admin/questions/new"><Button>Add Question</Button></Link>
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => { setPage(1); setSearch(e.target.value); }}
        placeholder="Search question text..."
        className="mb-4 w-full max-w-md rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <p className="p-6 text-center text-slate-400">Loading...</p>
        ) : questions.length === 0 ? (
          <p className="p-6 text-center text-slate-400">No questions found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Question</th>
                <th className="px-4 py-3">Subject / Topic</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {questions.map((q) => (
                <tr key={q.id}>
                  <td className="max-w-xs truncate px-4 py-3">{q.question_text}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {q.subjects?.name}{q.topics ? ` · ${q.topics.name}` : ''}
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-500">{q.difficulty}</td>
                  <td className="px-4 py-3">
                    <span className={q.is_active ? 'text-emerald-600' : 'text-slate-400'}>
                      {q.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/questions/${q.id}`} className="mr-3 font-medium text-emerald-700">Edit</Link>
                    <button onClick={() => handleDelete(q.id)} className="font-medium text-red-600">Deactivate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
        <span className="text-sm text-slate-500">Page {page} of {Math.max(1, Math.ceil(total / 25))}</span>
        <Button variant="secondary" disabled={page * 25 >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
