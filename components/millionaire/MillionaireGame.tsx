'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { QuestionPublic } from '@/types/database';

interface PrizeTier { tier: number; prize: string; isSafeHaven: boolean; }

interface GameState {
  attemptId: string;
  currentTier: number;
  totalTiers: number;
  question: QuestionPublic;
  prizeLadder: PrizeTier[];
}

export function MillionaireGame() {
  const [game, setGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [locked, setLocked] = useState(false);
  const [removedOptions, setRemovedOptions] = useState<string[]>([]);
  const [crowdPercentages, setCrowdPercentages] = useState<Record<string, number> | null>(null);
  const [lifelinesUsed, setLifelinesUsed] = useState<string[]>([]);
  const [result, setResult] = useState<{ gameOver: boolean; won?: boolean; finalPrize?: string; isCorrect?: boolean; correctAnswer?: string; explanation?: string | null } | null>(null);

  async function startGame() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/millionaire/start', { method: 'POST' });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? 'Could not start game.'); return; }
    setGame({
      attemptId: data.attempt_id, currentTier: data.current_tier,
      totalTiers: data.total_tiers, question: data.question, prizeLadder: data.prize_ladder,
    });
    setResult(null);
    setSelected(null);
    setRemovedOptions([]);
    setCrowdPercentages(null);
    setLifelinesUsed([]);
  }

  async function useLifeline(type: 'fifty_fifty' | 'ask_crowd') {
    if (!game) return;
    const res = await fetch(`/api/millionaire/${game.attemptId}/lifeline`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }),
    });
    const data = await res.json();
    if (!res.ok) return;
    setLifelinesUsed((prev) => [...prev, type]);
    if (type === 'fifty_fifty') setRemovedOptions(data.remove_options);
    if (type === 'ask_crowd') setCrowdPercentages(data.percentages);
  }

  async function lockInAnswer() {
    if (!game || !selected) return;
    setLocked(true);
    const res = await fetch(`/api/millionaire/${game.attemptId}/answer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selected_answer: selected }),
    });
    const data = await res.json();
    setLocked(false);

    if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return; }

    if (data.game_over) {
      setResult({
        gameOver: true, won: data.won_it_all, finalPrize: data.final_prize,
        isCorrect: data.is_correct, correctAnswer: data.correct_answer, explanation: data.explanation,
      });
      return;
    }

    // Advance to next tier
    setGame({
      ...game, currentTier: data.next_tier, question: data.question,
    });
    setSelected(null);
    setRemovedOptions([]);
    setCrowdPercentages(null);
  }

  if (!game && !result) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Who Wants to Be a Pinnacle Scholar?</h1>
        <p className="mb-6 text-slate-500">Answer 15 progressively harder questions. Use your lifelines wisely.</p>
        {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</div>}
        <Button onClick={startGame} loading={loading} fullWidth>Play</Button>
      </div>
    );
  }

  if (result?.gameOver) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-2 text-3xl font-bold">{result.won ? '🏆 You won it all!' : 'Game Over'}</h1>
        <p className="mb-1 text-lg font-semibold text-emerald-700">You take home: {result.finalPrize}</p>
        {result.isCorrect === false && (
          <p className="mb-4 text-sm text-slate-500">The correct answer was {result.correctAnswer}.</p>
        )}
        {result.explanation && <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{result.explanation}</p>}
        <Button onClick={startGame} fullWidth>Play Again</Button>
      </div>
    );
  }

  if (!game) return null;

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1fr_180px]">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">Question {game.currentTier} of {game.totalTiers}</span>
          <div className="flex gap-2">
            <button
              onClick={() => useLifeline('fifty_fifty')}
              disabled={lifelinesUsed.includes('fifty_fifty')}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
            >
              50/50
            </button>
            <button
              onClick={() => useLifeline('ask_crowd')}
              disabled={lifelinesUsed.includes('ask_crowd')}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
            >
              Ask the Crowd
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-5 text-lg font-medium leading-relaxed text-slate-900">{game.question.question_text}</p>
          <div className="space-y-2.5">
            {(['A', 'B', 'C', 'D'] as const).map((letter) => {
              if (removedOptions.includes(letter)) return null;
              const text = game.question[`option_${letter.toLowerCase()}` as 'option_a'];
              const isSelected = selected === letter;
              return (
                <button
                  key={letter}
                  onClick={() => setSelected(letter)}
                  className={`flex w-full items-center justify-between rounded-xl border p-4 text-left text-base ${
                    isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {letter}
                    </span>
                    {text}
                  </span>
                  {crowdPercentages && <span className="text-xs font-semibold text-slate-500">{crowdPercentages[letter]}%</span>}
                </button>
              );
            })}
          </div>
        </div>

        <Button onClick={lockInAnswer} disabled={!selected} loading={locked} fullWidth className="mt-4">
          Lock in answer
        </Button>
      </div>

      <div className="rounded-2xl bg-slate-900 p-4">
        <ol className="flex flex-col-reverse gap-1">
          {game.prizeLadder.map((t) => (
            <li
              key={t.tier}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                t.tier === game.currentTier ? 'bg-emerald-500 text-white' :
                t.isSafeHaven ? 'text-amber-400' : 'text-slate-300'
              }`}
            >
              {t.tier}. {t.prize}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
