'use client';

import { useEffect, useState } from 'react';
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
  results_released?: boolean;
  created_at: string;
}

interface Participant {
  id: string;
  student_id: string;
  round_id: string;
  status: string | null;
  started_at: string | null;
  submitted_at: string | null;
  duration_seconds: number | null;
  time_used_seconds: number | null;
  total_questions: number | null;
  correct_count: number | null;
  incorrect_count: number | null;
  unanswered_count: number | null;
  score: number | null;
  whatsapp_number: string | null;
  reward_given: boolean;
  reward_given_at: string | null;
  rank: number;
  student_name: string;
}

export default function AdminChallengePage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const [selectedRound, setSelectedRound] = useState('');
  const [loadingRounds, setLoadingRounds] = useState(true);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [creating, setCreating] = useState(false);
  const [rewarding, setRewarding] = useState<string | null>(null);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    opens_at: '',
    closes_at: '',
    is_active: false,
  });

  /*
   * =====================================================
   * WHATSAPP NUMBER NORMALIZER
   * =====================================================
   *
   * Converts Nigerian phone numbers into the format
   * WhatsApp requires.
   *
   * Examples:
   *
   * 08012345678
   *      ↓
   * 2348012345678
   *
   * +2348012345678
   *      ↓
   * 2348012345678
   *
   * 2348012345678
   *      ↓
   * 2348012345678
   *
   * Numbers from other countries that already contain
   * an international country code are left alone.
   */

  function normalizeWhatsAppNumber(
    phone: string | null
  ): string | null {
    if (!phone) return null;

    let number = phone.trim();

    if (!number) return null;

    // Remove spaces, brackets, hyphens, etc.
    number = number.replace(/\D/g, '');

    if (!number) return null;

    // Nigerian number entered as 080...
    if (number.startsWith('0')) {
      number = `234${number.slice(1)}`;
    }

    // Nigerian number entered as +234...
    // After removing non-digits, it is already 234...
    if (number.startsWith('234')) {
      return number;
    }

    /*
     * If it doesn't start with 0 or 234, assume the student
     * already entered an international number.
     */
    return number;
  }

  /*
   * =====================================================
   * WHATSAPP LINK
   * =====================================================
   */

  function getWhatsAppLink(
    phone: string | null
  ): string | null {
    const normalized = normalizeWhatsAppNumber(phone);

    if (!normalized) return null;

    return `https://wa.me/${normalized}`;
  }

  async function loadRounds() {
    setLoadingRounds(true);
    setError('');

    try {
      const response = await fetch('/api/challenge/rounds', {
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Could not load rounds.'
        );
      }

      setRounds(data);

      if (!selectedRound && data.length > 0) {
        setSelectedRound(data[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load challenge rounds.'
      );
    } finally {
      setLoadingRounds(false);
    }
  }

  async function loadParticipants(roundId: string) {
    if (!roundId) {
      setParticipants([]);
      return;
    }

    setLoadingParticipants(true);
    setError('');

    try {
      const response = await fetch(
        `/api/challenge/rounds/participants?round_id=${encodeURIComponent(
          roundId
        )}`,
        {
          cache: 'no-store',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Could not load participants.'
        );
      }

      setParticipants(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load participants.'
      );
    } finally {
      setLoadingParticipants(false);
    }
  }

  useEffect(() => {
    loadRounds();
  }, []);

  useEffect(() => {
    if (selectedRound) {
      loadParticipants(selectedRound);
    }
  }, [selectedRound]);

  async function handleCreate(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setCreating(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(
        '/api/challenge/rounds',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: form.title.trim(),
            difficulty: form.difficulty,
            question_count: 180,
            duration_seconds: 7200,
            opens_at: form.opens_at
              ? new Date(
                  form.opens_at
                ).toISOString()
              : null,
            closes_at: form.closes_at
              ? new Date(
                  form.closes_at
                ).toISOString()
              : null,
            is_active: form.is_active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not create challenge round.'
        );
      }

      setMessage(
        'Challenge round created successfully.'
      );

      setForm({
        title: '',
        difficulty: 'medium',
        opens_at: '',
        closes_at: '',
        is_active: false,
      });

      await loadRounds();

      if (data.id) {
        setSelectedRound(data.id);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not create challenge round.'
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleShowResults(
    released: boolean
  ) {
    if (!selectedRound) return;

    setMessage('');
    setError('');

    try {
      const response = await fetch(
        '/api/challenge/results',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            round_id: selectedRound,
            released,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not update results.'
        );
      }

      setRounds((current) =>
        current.map((round) =>
          round.id === selectedRound
            ? {
                ...round,
                results_released:
                  data.results_released,
              }
            : round
        )
      );

      setMessage(
        released
          ? 'Results are now visible to students.'
          : 'Results are hidden from students.'
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not update results.'
      );
    }
  }

  async function handleReward(
    participantId: string
  ) {
    setRewarding(participantId);
    setMessage('');
    setError('');

    try {
      const response = await fetch(
        '/api/challenge/rewards',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participant_id: participantId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not record reward.'
        );
      }

      setParticipants((current) =>
        current.map((participant) =>
          participant.id === participantId
            ? {
                ...participant,
                reward_given: true,
                reward_given_at:
                  data.reward_given_at,
              }
            : participant
        )
      );

      setMessage(
        'Reward recorded successfully.'
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not record reward.'
      );
    } finally {
      setRewarding(null);
    }
  }

  function formatDate(
    date: string | null
  ) {
    if (!date) return 'Not set';

    return new Date(
      date
    ).toLocaleString();
  }

  function formatTime(
    seconds: number | null
  ) {
    if (
      seconds === null ||
      seconds === undefined
    ) {
      return '—';
    }

    const minutes =
      Math.floor(seconds / 60);

    const remainingSeconds =
      seconds % 60;

    return `${minutes}m ${remainingSeconds}s`;
  }

  const currentRound =
    rounds.find(
      (round) =>
        round.id === selectedRound
    );

  const topThree =
    participants.filter(
      (participant) =>
        participant.rank >= 1 &&
        participant.rank <= 3
    );

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          UTME Challenge
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Manage challenge rounds,
          participants, leaderboard and
          rewards.
        </p>
      </div>

      {/* MESSAGES */}

      {message && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* CREATE ROUND */}

      <form
        onSubmit={handleCreate}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-slate-900">
          Create Challenge Round
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Questions will automatically come
          from your CBT/imported question bank.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Round name
            </label>

            <input
              required
              value={form.title}
              onChange={(e) =>
                setForm({
                  ...form,
                  title: e.target.value,
                })
              }
              placeholder="e.g. UTME Challenge Round 1"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Difficulty
            </label>

            <select
              value={form.difficulty}
              onChange={(e) =>
                setForm({
                  ...form,
                  difficulty:
                    e.target.value as
                      | 'easy'
                      | 'medium'
                      | 'hard',
                })
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
            >
              <option value="easy">
                Easy
              </option>

              <option value="medium">
                Medium
              </option>

              <option value="hard">
                Hard
              </option>
            </select>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">
              Challenge format
            </p>

            <p className="mt-1 font-semibold text-slate-900">
              180 questions · 120 minutes
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Final score is out of 400.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Opens at
            </label>

            <input
              type="datetime-local"
              value={form.opens_at}
              onChange={(e) =>
                setForm({
                  ...form,
                  opens_at: e.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Closes at
            </label>

            <input
              type="datetime-local"
              value={form.closes_at}
              onChange={(e) =>
                setForm({
                  ...form,
                  closes_at: e.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <label className="mt-5 flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) =>
              setForm({
                ...form,
                is_active:
                  e.target.checked,
              })
            }
            className="h-4 w-4"
          />

          <span className="text-sm font-medium text-slate-700">
            Activate this round
          </span>
        </label>

        <div className="mt-5">
          <Button
            type="submit"
            loading={creating}
          >
            Create Round
          </Button>
        </div>
      </form>

      {/* ROUND SELECTOR */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Select challenge round
        </label>

        <select
          value={selectedRound}
          onChange={(e) =>
            setSelectedRound(
              e.target.value
            )
          }
          disabled={loadingRounds}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500"
        >
          <option value="">
            {loadingRounds
              ? 'Loading rounds...'
              : 'Select a round'}
          </option>

          {rounds.map((round) => (
            <option
              key={round.id}
              value={round.id}
            >
              {round.title} —{' '}
              {round.difficulty}
            </option>
          ))}
        </select>

        {rounds.length === 0 &&
          !loadingRounds && (
            <p className="mt-3 text-sm text-slate-500">
              No challenge rounds have
              been created yet.
            </p>
          )}
      </section>

      {/* CURRENT ROUND */}

      {currentRound && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {currentRound.title}
                </h2>

                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>
                    Difficulty:{' '}
                    <strong>
                      {
                        currentRound.difficulty
                      }
                    </strong>
                  </span>

                  <span>
                    180 questions
                  </span>

                  <span>
                    120 minutes
                  </span>

                  <span>
                    Score /400
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() =>
                    handleShowResults(
                      !currentRound.results_released
                    )
                  }
                >
                  {currentRound.results_released
                    ? '🙈 Hide Results'
                    : '👁 Show Results'}
                </Button>

                <button
                  type="button"
                  onClick={() =>
                    loadParticipants(
                      selectedRound
                    )
                  }
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
              Opens:{' '}
              {formatDate(
                currentRound.opens_at
              )}
              <br />

              Closes:{' '}
              {formatDate(
                currentRound.closes_at
              )}
              <br />

              Student results:{' '}
              <strong className="text-slate-700">
                {currentRound.results_released
                  ? 'Visible'
                  : 'Hidden'}
              </strong>
            </div>
          </section>

          {/* LEADERBOARD */}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-semibold text-slate-900">
                🏆 Leaderboard
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Students ranked by their UTME
                Challenge score.
              </p>
            </div>

            {loadingParticipants ? (
              <div className="p-6 text-sm text-slate-500">
                Loading participants...
              </div>
            ) : participants.length ===
              0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No students have participated
                in this round yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3">
                        Rank
                      </th>

                      <th className="px-4 py-3">
                        Student
                      </th>

                      <th className="px-4 py-3">
                        WhatsApp
                      </th>

                      <th className="px-4 py-3">
                        Score
                      </th>

                      <th className="px-4 py-3">
                        Correct
                      </th>

                      <th className="px-4 py-3">
                        Incorrect
                      </th>
                      
                      <th className="px-4 py-3">
                        Time
                      </th>

                      <th className="px-4 py-3">
                        Reward
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {participants.map((participant) => {
                      const isWinner =
                        participant.rank <= 3;

                      const whatsappLink =
                        getWhatsAppLink(
                          participant.whatsapp_number
                        );

                      return (
                        <tr key={participant.id}>
                          {/* RANK */}
                          <td className="px-4 py-4 font-semibold">
                            {participant.rank === 1
                              ? '🥇 1'
                              : participant.rank === 2
                              ? '🥈 2'
                              : participant.rank === 3
                              ? '🥉 3'
                              : participant.rank}
                          </td>

                          {/* STUDENT */}
                          <td className="px-4 py-4">
                            <p className="font-medium text-slate-900">
                              {participant.student_name}
                            </p>

                            <p className="text-xs text-slate-400">
                              {participant.student_id}
                            </p>
                          </td>

                          {/* WHATSAPP */}
                          <td className="px-4 py-4">
                            {participant.whatsapp_number ? (
                              <div className="flex flex-col gap-2">
                                <span className="text-xs text-slate-600">
                                  {participant.whatsapp_number}
                                </span>

                                {whatsappLink ? (
                                  <a
                                    href={whatsappLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex w-fit rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                  >
                                    💬 Open WhatsApp
                                  </a>
                                ) : (
                                  <span className="text-xs text-red-500">
                                    Invalid number
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">
                                Not provided
                              </span>
                            )}
                          </td>

                          {/* SCORE */}
                          <td className="px-4 py-4 font-bold text-slate-900">
                            {participant.score ?? 0}/400
                          </td>

                          {/* CORRECT */}
                          <td className="px-4 py-4 text-emerald-600">
                            {participant.correct_count ?? 0}
                          </td>

                          {/* INCORRECT */}
                          <td className="px-4 py-4 text-red-500">
                            {participant.incorrect_count ?? 0}
                          </td>

                          {/* TIME */}
                          <td className="px-4 py-4">
                            {formatTime(
                              participant.time_used_seconds
                            )}
                          </td>

                          {/* REWARD */}
                          <td className="px-4 py-4">
                            {participant.reward_given ? (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                                Rewarded
                              </span>
                            ) : isWinner ? (
                              <div className="flex flex-col gap-2">
                                <button
                                  type="button"
                                  disabled={
                                    rewarding ===
                                    participant.id
                                  }
                                  onClick={() =>
                                    handleReward(
                                      participant.id
                                    )
                                  }
                                  className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                                >
                                  {rewarding ===
                                  participant.id
                                    ? 'Recording...'
                                    : '🎁 Give Reward'}
                                </button>

                                {whatsappLink && (
                                  <a
                                    href={whatsappLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-center text-xs font-medium text-emerald-600 hover:underline"
                                  >
                                    💬 WhatsApp
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* REWARD WINNERS */}
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  🎁 Reward Winners
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  The top 3 students in this
                  challenge round are eligible
                  for rewards.
                </p>
              </div>

              <div className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-amber-700">
                Top 3
              </div>
            </div>

            {participants.length === 0 ? (
              <div className="mt-5 rounded-xl bg-white p-6 text-center">
                <p className="font-medium text-slate-700">
                  No winners yet.
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Students must participate in
                  this challenge before the top 3
                  winners can be selected.
                </p>
              </div>
            ) : topThree.length === 0 ? (
              <div className="mt-5 rounded-xl bg-white p-6 text-center">
                <p className="font-medium text-slate-700">
                  No winners yet.
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Completed challenge results
                  are required before winners can
                  be determined.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {topThree.map((participant) => {
                  const whatsappLink =
                    getWhatsAppLink(
                      participant.whatsapp_number
                    );

                  return (
                    <div
                      key={participant.id}
                      className="rounded-xl bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-2xl">
                            {participant.rank === 1
                              ? '🥇'
                              : participant.rank === 2
                              ? '🥈'
                              : '🥉'}
                          </p>

                          <p className="mt-2 font-semibold text-slate-900">
                            {participant.student_name}
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-700">
                            {participant.score ?? 0}/400
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Rank {participant.rank}
                          </p>

                          {participant.whatsapp_number && (
                            <p className="mt-2 text-xs text-slate-500">
                              WhatsApp:{' '}
                              {participant.whatsapp_number}
                            </p>
                          )}
                        </div>

                        {participant.reward_given && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            Rewarded
                          </span>
                        )}
                      </div>

                      <div className="mt-4 space-y-2">
                        {participant.reward_given ? (
                          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-700">
                            ✅ Reward has been given
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={
                              rewarding ===
                              participant.id
                            }
                            onClick={() =>
                              handleReward(
                                participant.id
                              )
                            }
                            className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {rewarding ===
                            participant.id
                              ? 'Recording...'
                              : '🎁 Give Reward'}
                          </button>
                        )}

                        {whatsappLink ? (
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            💬 Open WhatsApp DM
                          </a>
                        ) : (
                          <div className="rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-400">
                            WhatsApp number not provided
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
                                    }

      
