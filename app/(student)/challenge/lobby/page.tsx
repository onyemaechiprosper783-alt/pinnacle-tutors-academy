'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface Round {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_count: number;
  duration_seconds: number;
  opens_at: string | null;
  closes_at: string | null;
  is_active: boolean;
}

interface Subject {
  id: string;
  name: string;
}

export default function ChallengeLobbyPage() {
  const router = useRouter();

  const [rounds, setRounds] = useState<Round[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedRound, setSelectedRound] =
    useState<Round | null>(null);

  const [selectedSubjects, setSelectedSubjects] =
    useState<string[]>([]);

  const [whatsappNumber, setWhatsappNumber] =
    useState('');

  const [loadingRounds, setLoadingRounds] =
    useState(true);

  const [joining, setJoining] =
    useState(false);

  const [error, setError] =
    useState('');

  useEffect(() => {
    async function loadChallengeData() {
      try {
        setLoadingRounds(true);

        const [roundsRes, subjectsRes] =
          await Promise.all([
            fetch('/api/challenge/available'),
            fetch('/api/subjects'),
          ]);

        const roundsData =
          await roundsRes.json();

        const subjectsData =
          await subjectsRes.json();

        if (!roundsRes.ok) {
          throw new Error(
            roundsData.error ??
              'Could not load challenge rounds.'
          );
        }

        if (!subjectsRes.ok) {
          throw new Error(
            subjectsData.error ??
              'Could not load subjects.'
          );
        }

        setRounds(
          Array.isArray(roundsData)
            ? roundsData
            : []
        );

        setSubjects(
          Array.isArray(subjectsData)
            ? subjectsData
            : subjectsData.subjects ?? []
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load challenge.'
        );
      } finally {
        setLoadingRounds(false);
      }
    }

    loadChallengeData();
  }, []);

  function toggleSubject(subjectId: string) {
    setError('');

    setSelectedSubjects((current) => {
      if (current.includes(subjectId)) {
        return current.filter(
          (id) => id !== subjectId
        );
      }

      if (current.length >= 3) {
        setError(
          'You can select exactly 3 JAMB subjects.'
        );

        return current;
      }

      return [...current, subjectId];
    });
  }

  async function handleJoin() {
    setError('');

    if (!selectedRound) {
      setError(
        'Please select a challenge round.'
      );
      return;
    }

    if (selectedSubjects.length !== 3) {
      setError(
        'Please select exactly 3 JAMB subjects.'
      );
      return;
    }

    if (!whatsappNumber.trim()) {
      setError(
        'Please enter your WhatsApp number.'
      );
      return;
    }

    setJoining(true);

    try {
      const res = await fetch(
        '/api/challenge/join',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            round_id:
              selectedRound.id,

            selected_subject_ids:
              selectedSubjects,

            whatsapp_number:
              whatsappNumber.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ??
            'Could not join challenge.'
        );
      }

      if (!data.attempt_id) {
        throw new Error(
          'Challenge started, but no exam attempt was returned.'
        );
      }

      router.push(
        `/challenge/${data.attempt_id}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not join challenge.'
      );

      setJoining(false);
    }
  }

  if (loadingRounds) {
    return (
      <div className="p-8 text-center text-slate-400">
        Loading challenge...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">
        UTME Challenge
      </h1>

      <p className="mb-6 text-slate-500">
        Compete against other students. Your
        best score goes on the leaderboard.
      </p>

      {error && (
        <div className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {rounds.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-slate-500">
            No challenge rounds are open right
            now. Check back soon.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 space-y-3">
            {rounds.map((round) => {
              const selected =
                selectedRound?.id === round.id;

              return (
                <button
                  key={round.id}
                  type="button"
                  onClick={() => {
                    setSelectedRound(round);
                    setError('');
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {round.title}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {round.question_count} questions
                        {' · '}
                        {Math.round(
                          round.duration_seconds /
                            60
                        )}{' '}
                        minutes
                        {' · '}
                        {round.difficulty}
                      </p>
                    </div>

                    <div
                      className={`h-5 w-5 rounded-full border ${
                        selected
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-slate-300'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {selectedRound && (
            <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Choose your 3 JAMB subjects
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  English Language and The Lekki
                  Headmaster are automatically included.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {subjects.map((subject) => {
                  const selected =
                    selectedSubjects.includes(
                      subject.id
                    );

                  return (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() =>
                        toggleSubject(
                          subject.id
                        )
                      }
                      className={`rounded-xl border p-3 text-left transition ${
                        selected
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {subject.name}
                        </span>

                        <span className="text-sm">
                          {selected
                            ? '✓'
                            : ''}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div>
                <label
                  htmlFor="whatsapp"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  WhatsApp number
                </label>

                <input
                  id="whatsapp"
                  type="tel"
                  value={whatsappNumber}
                  onChange={(event) =>
                    setWhatsappNumber(
                      event.target.value
                    )
                  }
                  placeholder="e.g. 08012345678"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <p className="text-sm text-slate-500">
                  {selectedSubjects.length}/3
                  subjects selected
                </p>

                <Button
                  loading={joining}
                  onClick={handleJoin}
                >
                  Join Challenge
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
