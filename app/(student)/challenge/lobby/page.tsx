'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface Round {
  id: string;
  title: string;
  subject_id: string | null;
  question_count: number;
  duration_seconds: number;
  subjects: { name: string } | null;
}

export default function ChallengeLobbyPage() {
  const router = useRouter();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/challenge/rounds').then((r) => r.json()).then(setRounds);
  }, []);

  async function handleJoin(round: Round) {
    if (!round.subject_id) { setError('This round has no subject configured yet.'); return; }
    setLoading(round.id);
    const res = await fetch('/api/exams/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'utme_challenge',
        subject_ids: [round.subject_id],
        question_count: round.question_count,
        duration_seconds: round.duration_seconds,
        round_id: round.id,
      }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) { setError(data.error ?? 'Could not join round.'); return; }
    router.push(`/challenge/${data.attempt_id}`);
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">UTME Challenge</h1>
      <p className="mb-6 text-slate-500">Compete against other students — your best score goes on the leaderboard.</p>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</div>}

      {rounds.length === 0 ? (
        <p className="text-slate-400">No challenge rounds are open right now. Check back soon.</p>
      ) : (
        <div className="space-y-3">
          {rounds.map((round) => (
            <div key={round.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <p className="font-semibold text-slate-900">{round.title}</p>
                <p className="text-sm text-slate-500">
                  {round.subjects?.name ?? 'Mixed'} · {round.question_count} questions · {Math.round(round.duration_seconds / 60)} min
                </p>
              </div>
              <Button loading={loading === round.id} onClick={() => handleJoin(round)}>Join</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
