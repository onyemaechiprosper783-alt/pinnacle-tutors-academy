'use client';

import { useEffect, useState } from 'react';

interface LeaderboardEntry {
  rank: number;
  student_id: string;
  student_name: string;
  score: number;
}

interface LeaderboardResponse {
  released: boolean;
  round: {
    id: string;
    title: string;
  } | null;
  leaderboard: LeaderboardEntry[];
  my_result: LeaderboardEntry | null;
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        /*
         * First find the student's challenge participation.
         * The participant record tells us which round they joined.
         */
        const participantRes = await fetch(
          '/api/challenge/participant'
        );

        const participantData = await participantRes.json();

        if (!participantRes.ok) {
          throw new Error(
            participantData.error ??
              'Could not load your challenge information.'
          );
        }

        if (!participantData.round_id) {
          setData({
            released: false,
            round: null,
            leaderboard: [],
            my_result: null,
          });
          return;
        }

        /*
         * Now load the protected leaderboard.
         *
         * The server decides whether results have been released.
         */
        const leaderboardRes = await fetch(
          `/api/challenge/leaderboard?round_id=${encodeURIComponent(
            participantData.round_id
          )}`
        );

        const leaderboardData =
          await leaderboardRes.json();

        if (!leaderboardRes.ok) {
          throw new Error(
            leaderboardData.error ??
              'Could not load leaderboard.'
          );
        }

        setData(leaderboardData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load leaderboard.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="mb-1 text-2xl font-bold text-slate-900">
          Leaderboard
        </h1>

        <p className="text-slate-400">
          Loading leaderboard...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="mb-1 text-2xl font-bold text-slate-900">
          Leaderboard
        </h1>

        <div className="mt-4 rounded-xl bg-amber-50 p-5 text-amber-800">
          {error}
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * RESULTS NOT RELEASED
   * =====================================================
   */

  if (!data?.released) {
    return (
      <div>
        <h1 className="mb-1 text-2xl font-bold text-slate-900">
          Leaderboard
        </h1>

        <p className="mb-6 text-slate-500">
          UTME Challenge results
        </p>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-4 text-5xl">
            🔒
          </div>

          <h2 className="text-xl font-bold text-slate-900">
            Results not released yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-slate-500">
            The administrator will release the
            challenge results soon.
          </p>
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * RESULTS RELEASED
   * =====================================================
   */

  const leaderboard = data.leaderboard ?? [];
  const myResult = data.my_result;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">
        🏆 UTME Challenge Leaderboard
      </h1>

      <p className="mb-6 text-slate-500">
        {data.round?.title ?? 'Challenge Results'}
      </p>

      {myResult && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-medium text-emerald-700">
            Your Result
          </p>

          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Your Rank
              </p>

              <p className="text-2xl font-bold text-slate-900">
                {myResult.rank}
                {getRankSuffix(myResult.rank)}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-slate-500">
                Your Score
              </p>

              <p className="text-2xl font-bold text-emerald-700">
                {myResult.score}/400
              </p>
            </div>
          </div>
        </div>
      )}

      {leaderboard.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-slate-400">
            No challenge results are available.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {leaderboard.map((entry) => (
            <div
              key={entry.student_id}
              className={`flex items-center justify-between border-b border-slate-100 px-4 py-4 last:border-0 ${
                entry.student_id === myResult?.student_id
                  ? 'bg-emerald-50'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                    entry.rank === 1
                      ? 'bg-amber-100 text-amber-700'
                      : entry.rank === 2
                        ? 'bg-slate-200 text-slate-700'
                        : entry.rank === 3
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-slate-50 text-slate-500'
                  }`}
                >
                  {entry.rank}
                </span>

                <div>
                  <p className="font-medium text-slate-800">
                    {entry.student_name}
                  </p>

                  {entry.student_id ===
                    myResult?.student_id && (
                    <p className="text-xs font-medium text-emerald-600">
                      You
                    </p>
                  )}
                </div>
              </div>

              <span className="font-bold text-emerald-700">
                {entry.score}/400
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getRankSuffix(rank: number) {
  if (rank % 100 >= 11 && rank % 100 <= 13) {
    return 'th';
  }

  switch (rank % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}
