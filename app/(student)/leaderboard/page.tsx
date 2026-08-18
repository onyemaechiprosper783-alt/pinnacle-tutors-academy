import Link from 'next/link';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type Participant = {
  id: string;
  student_id: string;
  status: string;
  score: number | null;
  rank: number | null;
  submitted_at: string | null;
};

type LeaderboardEntry = {
  rank: number;
  student_id: string;
  student_name: string;
  score: number;
  submitted_at: string | null;
};

export default async function LeaderboardPage() {
  const caller = await getCurrentProfile();

  if (!caller) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <h1 className="text-2xl font-black text-[var(--foreground)]">
            Please log in
          </h1>

          <p className="mt-2 text-[var(--muted)]">
            You need to be logged in to view the leaderboard.
          </p>
        </div>
      </div>
    );
  }

  const admin = createAdminClient();

  /*
   * =====================================================
   * FIND THIS STUDENT'S LATEST CHALLENGE PARTICIPATION
   * =====================================================
   */

  const {
    data: participant,
    error: participantError,
  } = await admin
    .from('utme_challenge_participants')
    .select(`
      id,
      round_id,
      status,
      score,
      rank,
      submitted_at
    `)
    .eq('student_id', caller.id)
    .order('created_at', {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (participantError || !participant) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
            Pinnacle Tutors Academy
          </p>

          <h1 className="mt-1 text-3xl font-black text-[var(--foreground)]">
            🏆 UTME Challenge Leaderboard
          </h1>

          <p className="mt-2 text-sm text-[var(--muted)]">
            Your challenge ranking will appear here.
          </p>
        </div>

        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-10 text-center shadow-sm">
          <div className="text-6xl">🏆</div>

          <h2 className="mt-5 text-xl font-black text-[var(--foreground)]">
            You haven't joined a challenge yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
            Join the UTME Challenge to compete with other students and appear
            on the leaderboard when results are released.
          </p>

          <Link
            href="/challenge"
            className="mt-6 inline-flex rounded-xl bg-orange-600 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-orange-700"
          >
            Join Challenge →
          </Link>
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * LOAD THE CHALLENGE ROUND
   * =====================================================
   */

  const {
    data: round,
    error: roundError,
  } = await admin
    .from('challenge_rounds')
    .select(`
      id,
      title,
      results_released
    `)
    .eq('id', participant.round_id)
    .single();

  if (roundError || !round) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="text-xl font-black text-red-700">
            Unable to load leaderboard
          </h1>

          <p className="mt-2 text-sm text-red-600">
            Please try again later.
          </p>
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * CHECK WHETHER RESULTS HAVE BEEN RELEASED
   * =====================================================
   *
   * We support BOTH release systems:
   *
   * 1. challenge_rounds.results_released
   *
   * 2. exam_attempts.config.results_released
   *
   * This fixes the situation where the admin release
   * endpoint has released the student's attempt but the
   * round column has not been updated.
   */

  let resultsReleased =
    Boolean(round.results_released);

  /*
   * Look for this student's challenge attempt.
   */

  const {
    data: studentAttempts,
  } = await admin
    .from('exam_attempts')
    .select(`
      id,
      config,
      status
    `)
    .eq('student_id', caller.id)
    .eq('mode', 'cbt')
    .order('started_at', {
      ascending: false,
    })
    .limit(20);

  if (!resultsReleased) {
    for (
      const attempt of studentAttempts ?? []
    ) {
      const config =
        (attempt.config ?? {}) as {
          round_id?: string | null;
          results_released?: boolean;
          challenge?: {
            round_id?: string | null;
            results_released?: boolean;
          } | null;
        };

      const attemptRoundId =
        config.round_id ??
        config.challenge?.round_id ??
        null;

      if (
        attemptRoundId ===
        participant.round_id
      ) {
        if (
          config.results_released === true ||
          config.challenge
            ?.results_released === true
        ) {
          resultsReleased = true;
          break;
        }
      }
    }
  }

  /*
   * =====================================================
   * RESULTS STILL LOCKED
   * =====================================================
   */

  if (!resultsReleased) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
            Pinnacle Tutors Academy
          </p>

          <h1 className="mt-1 text-3xl font-black text-[var(--foreground)]">
            🏆 UTME Challenge Leaderboard
          </h1>

          <p className="mt-2 text-sm text-[var(--muted)]">
            {round.title}
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[30px] border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-red-50 p-10 text-center shadow-sm dark:border-orange-900 dark:from-orange-950/30 dark:via-[var(--card)] dark:to-red-950/30">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-4xl dark:bg-orange-950/60">
            🔒
          </div>

          <h2 className="mt-6 text-2xl font-black text-[var(--foreground)]">
            Results not released yet
          </h2>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--muted)]">
            The administrator has not released the challenge results yet.
            Your score and ranking will become visible here once the results
            are officially released.
          </p>

          <div className="mt-6 inline-flex rounded-xl border border-orange-200 bg-white px-5 py-3 text-sm font-bold text-orange-700 shadow-sm dark:border-orange-900 dark:bg-[var(--card)] dark:text-orange-400">
            🔐 Results are currently locked
          </div>
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * RESULTS ARE RELEASED
   * =====================================================
   */

  const {
    data: participants,
    error: participantsError,
  } = await admin
    .from('utme_challenge_participants')
    .select(`
      id,
      student_id,
      status,
      score,
      rank,
      submitted_at
    `)
    .eq('round_id', round.id)
    .eq('status', 'submitted')
    .order('score', {
      ascending: false,
      nullsFirst: false,
    })
    .order('submitted_at', {
      ascending: true,
      nullsFirst: false,
    });

  if (participantsError) {
    console.error(
      'Student leaderboard participants error:',
      participantsError
    );

    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="text-xl font-black text-red-700">
            Unable to load leaderboard
          </h1>

          <p className="mt-2 text-sm text-red-600">
            Please try again later.
          </p>
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * LOAD STUDENT NAMES
   * =====================================================
   */

  const studentIds =
    (participants ?? []).map(
      (item) => item.student_id
    );

  let profiles: {
    id: string;
    full_name: string | null;
  }[] = [];

  if (studentIds.length > 0) {
    const {
      data: profileData,
    } = await admin
      .from('profiles')
      .select(`
        id,
        full_name
      `)
      .in(
        'id',
        studentIds
      );

    profiles =
      profileData ?? [];
  }

  const profileMap =
    new Map(
      profiles.map(
        (profile) => [
          profile.id,
          profile.full_name ||
            'Student',
        ]
      )
    );

  /*
   * =====================================================
   * BUILD LEADERBOARD
   * =====================================================
   *
   * Prefer the rank saved by the admin release process.
   *
   * If a rank is missing for any reason, calculate a
   * fallback rank so the leaderboard never appears blank.
   */

  let previousScore:
    | number
    | null = null;

  let previousRank =
    0;

  const leaderboard:
    LeaderboardEntry[] =
    (participants ?? []).map(
      (
        item,
        index
      ) => {
        const score =
          Number(
            item.score ?? 0
          );

        let calculatedRank:
          number;

        if (
          index > 0 &&
          previousScore !==
            null &&
          score ===
            previousScore
        ) {
          calculatedRank =
            previousRank;
        } else {
          calculatedRank =
            index + 1;
        }

        previousScore =
          score;

        previousRank =
          calculatedRank;

        /*
         * Use the database rank when available.
         * Otherwise use calculated rank.
         */

        const rank =
          item.rank ??
          calculatedRank;

        return {
          rank,
          student_id:
            item.student_id,
          student_name:
            profileMap.get(
              item.student_id
            ) ??
            'Student',
          score,
          submitted_at:
            item.submitted_at,
        };
      }
    );

  /*
   * =====================================================
   * FIND CURRENT STUDENT
   * =====================================================
   */

  const myResult =
    leaderboard.find(
      (entry) =>
        entry.student_id ===
        caller.id
    ) ?? null;

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

  return (
    <div className="mx-auto max-w-5xl space-y-7 p-6 pb-10">

      {/* HEADER */}

      <section>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
          Pinnacle Tutors Academy
        </p>

        <h1 className="mt-1 text-3xl font-black text-[var(--foreground)] sm:text-4xl">
          🏆 UTME Challenge Leaderboard
        </h1>

        <p className="mt-2 text-sm text-[var(--muted)]">
          {round.title}
        </p>
      </section>

      {/* MY RESULT */}

      {myResult && (
        <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-orange-600 via-orange-500 to-red-500 p-6 text-white shadow-xl sm:p-8">

          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-100">
            Your Result
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">

            {/* RANK */}

            <div className="rounded-2xl bg-white/15 p-5 backdrop-blur">
              <p className="text-sm font-semibold text-orange-100">
                Your Rank
              </p>

              <p className="mt-1 text-4xl font-black">
                #{myResult.rank}
              </p>
            </div>

            {/* SCORE */}

            <div className="rounded-2xl bg-white/15 p-5 backdrop-blur">
              <p className="text-sm font-semibold text-orange-100">
                Your Score
              </p>

              <p className="mt-1 text-4xl font-black">
                {myResult.score}
              </p>

              <p className="mt-1 text-xs font-semibold text-orange-100">
                points
              </p>
            </div>

          </div>
        </section>
      )}

      {/* LEADERBOARD */}

      <section>

        <div className="mb-4">
          <h2 className="text-xl font-black text-[var(--foreground)]">
            Rankings
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Students are ranked by challenge score.
          </p>
        </div>

        {leaderboard.length ===
        0 ? (
          <div className="rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--card)] p-10 text-center">

            <div className="text-5xl">
              🏆
            </div>

            <h3 className="mt-4 text-xl font-black text-[var(--foreground)]">
              No results yet
            </h3>

            <p className="mt-2 text-sm text-[var(--muted)]">
              The results have been released, but there are no submitted
              challenge results to display.
            </p>

          </div>
        ) : (
          <div className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--card)] shadow-sm">

            {/* TABLE HEADER */}

            <div className="grid grid-cols-[70px_1fr_100px] border-b border-[var(--border)] bg-[var(--background)] px-4 py-3 text-xs font-black uppercase tracking-wider text-[var(--muted)] sm:grid-cols-[90px_1fr_120px] sm:px-6">

              <span>
                Rank
              </span>

              <span>
                Student
              </span>

              <span className="text-right">
                Score
              </span>

            </div>

            {/* ROWS */}

            {leaderboard.map(
              (entry) => {
                const isMe =
                  entry.student_id ===
                  caller.id;

                return (
                  <div
                    key={
                      entry.student_id
                    }
                    className={`grid grid-cols-[70px_1fr_100px] items-center border-b border-[var(--border)] px-4 py-4 last:border-0 sm:grid-cols-[90px_1fr_120px] sm:px-6 ${
                      isMe
                        ? 'bg-orange-50 dark:bg-orange-950/30'
                        : ''
                    }`}
                  >

                    {/* RANK */}

                    <div>
                      {entry.rank ===
                      1 ? (
                        <span className="text-2xl">
                          🥇
                        </span>
                      ) : entry.rank ===
                        2 ? (
                        <span className="text-2xl">
                          🥈
                        </span>
                      ) : entry.rank ===
                        3 ? (
                        <span className="text-2xl">
                          🥉
                        </span>
                      ) : (
                        <span className="font-black text-[var(--muted)]">
                          #{entry.rank}
                        </span>
                      )}
                    </div>

                    {/* NAME */}

                    <div className="min-w-0">
                      <p
                        className={`truncate font-black ${
                          isMe
                            ? 'text-orange-700 dark:text-orange-400'
                            : 'text-[var(--foreground)]'
                        }`}
                      >
                        {
                          entry.student_name
                        }

                        {isMe && (
                          <span className="ml-2 rounded-full bg-orange-100 px-2 py-1 text-[10px] font-black uppercase text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                            You
                          </span>
                        )}
                      </p>
                    </div>

                    {/* SCORE */}

                    <div className="text-right">
                      <span className="font-black text-emerald-600 dark:text-emerald-400">
                        {
                          entry.score
                        }
                      </span>
                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </section>

    </div>
  );
}
