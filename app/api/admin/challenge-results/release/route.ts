import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: Request
) {
  const caller =
    await getCurrentProfile();

  /*
   * =====================================================
   * ADMIN CHECK
   * =====================================================
   */

  if (
    !caller ||
    (
      caller.role !== 'admin' &&
      caller.role !== 'super_admin'
    )
  ) {
    return NextResponse.json(
      {
        error: 'Not authorized.',
      },
      {
        status: 403,
      }
    );
  }

  /*
   * =====================================================
   * READ ROUND ID
   * =====================================================
   */

  const body =
    await request
      .json()
      .catch(() => null);

  const roundId =
    body?.round_id;

  if (!roundId) {
    return NextResponse.json(
      {
        error:
          'round_id is required.',
      },
      {
        status: 400,
      }
    );
  }

  const admin =
    createAdminClient();

  /*
   * =====================================================
   * VERIFY ROUND EXISTS
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
    .eq(
      'id',
      roundId
    )
    .single();

  if (
    roundError ||
    !round
  ) {
    console.error(
      'Challenge round lookup error:',
      roundError
    );

    return NextResponse.json(
      {
        error:
          'Challenge round could not be found.',
      },
      {
        status: 404,
      }
    );
  }

  /*
   * =====================================================
   * LOAD CHALLENGE ATTEMPTS
   * =====================================================
   *
   * Challenge attempts use:
   *
   *     mode = cbt
   *
   * and contain the round ID inside config.
   * =====================================================
   */

  const {
    data: attempts,
    error: attemptsError,
  } = await admin
    .from('exam_attempts')
    .select(`
      id,
      student_id,
      score,
      correct_count,
      incorrect_count,
      unanswered_count,
      total_questions,
      time_used_seconds,
      submitted_at,
      status,
      config
    `)
    .eq(
      'mode',
      'cbt'
    );

  if (attemptsError) {
    console.error(
      'Challenge attempts lookup error:',
      attemptsError
    );

    return NextResponse.json(
      {
        error:
          'Could not load challenge attempts.',
      },
      {
        status: 500,
      }
    );
  }

  /*
   * =====================================================
   * FIND ATTEMPTS FOR THIS ROUND
   * =====================================================
   */

  const challengeAttempts =
    (attempts ?? []).filter(
      (attempt) => {
        const config =
          (
            attempt.config ??
            {}
          ) as {
            round_id?: string | null;

            challenge?: {
              round_id?: string | null;
            } | null;
          };

        const attemptRoundId =
          config.round_id ??
          config.challenge?.round_id ??
          null;

        return (
          attemptRoundId ===
          roundId
        );
      }
    );

  /*
   * =====================================================
   * ONLY SUBMITTED ATTEMPTS
   * =====================================================
   */

  const submittedAttempts =
    challengeAttempts.filter(
      (attempt) =>
        attempt.status !==
        'in_progress'
    );

  if (
    submittedAttempts.length ===
    0
  ) {
    return NextResponse.json(
      {
        error:
          'No submitted challenge attempts were found for this round.',
      },
      {
        status: 400,
      }
    );
  }

  /*
   * =====================================================
   * RELEASE THE ROUND
   * =====================================================
   *
   * THIS IS THE IMPORTANT FIX.
   *
   * The student leaderboard checks:
   *
   *     challenge_rounds.results_released
   *
   * Therefore we MUST update the round itself.
   */

  const {
    error:
      releaseRoundError,
  } = await admin
    .from('challenge_rounds')
    .update({
      results_released:
        true,
    })
    .eq(
      'id',
      roundId
    );

  if (
    releaseRoundError
  ) {
    console.error(
      'Challenge round release error:',
      releaseRoundError
    );

    return NextResponse.json(
      {
        error:
          'Could not release the challenge results.',
      },
      {
        status: 500,
      }
    );
  }

  /*
   * =====================================================
   * ALSO MARK ATTEMPT CONFIG AS RELEASED
   * =====================================================
   *
   * This keeps compatibility with the existing
   * attempt-results API.
   */

  for (
    const attempt of submittedAttempts
  ) {
    const existingConfig =
      (
        attempt.config ??
        {}
      ) as Record<
        string,
        unknown
      >;

    const existingChallenge =
      (
        existingConfig.challenge ??
        {}
      ) as Record<
        string,
        unknown
      >;

    const updatedConfig = {
      ...existingConfig,

      results_released:
        true,

      challenge: {
        ...existingChallenge,

        results_released:
          true,
      },
    };

    const {
      error:
        updateError,
    } = await admin
      .from('exam_attempts')
      .update({
        config:
          updatedConfig,
      })
      .eq(
        'id',
        attempt.id
      );

    if (updateError) {
      console.error(
        'Attempt release update error:',
        updateError
      );

      return NextResponse.json(
        {
          error:
            'The round was released, but some attempt results could not be updated.',
        },
        {
          status: 500,
        }
      );
    }
  }

  /*
   * =====================================================
   * LOAD LEADERBOARD ENTRIES
   * =====================================================
   */

  const {
    data: leaderboardEntries,
    error:
      leaderboardLoadError,
  } = await admin
    .from('leaderboard_entries')
    .select(`
      id,
      attempt_id,
      student_id,
      score,
      time_used_seconds,
      category
    `)
    .eq(
      'category',
      roundId
    );

  if (
    leaderboardLoadError
  ) {
    console.error(
      'Leaderboard lookup error:',
      leaderboardLoadError
    );

    return NextResponse.json(
      {
        error:
          'Results were released, but the leaderboard could not be loaded.',
      },
      {
        status: 500,
      }
    );
  }

  /*
   * =====================================================
   * SORT LEADERBOARD
   * =====================================================
   *
   * Highest score first.
   *
   * If scores are equal:
   * fastest submission first.
   */

  const sortedEntries =
    [
      ...(leaderboardEntries ??
        []),
    ].sort(
      (a, b) => {
        const scoreA =
          Number(
            a.score ?? 0
          );

        const scoreB =
          Number(
            b.score ?? 0
          );

        if (
          scoreA !==
          scoreB
        ) {
          return (
            scoreB -
            scoreA
          );
        }

        const timeA =
          Number(
            a.time_used_seconds ??
            Number.MAX_SAFE_INTEGER
          );

        const timeB =
          Number(
            b.time_used_seconds ??
            Number.MAX_SAFE_INTEGER
          );

        return (
          timeA -
          timeB
        );
      }
    );

  /*
   * =====================================================
   * CALCULATE AND SAVE RANKS
   * =====================================================
   *
   * Competition ranking:
   *
   * 400
   * 400
   * 390
   *
   * becomes:
   *
   * 1
   * 1
   * 3
   */

  let previousScore:
    number | null = null;

  let previousTime:
    number | null = null;

  let previousRank = 0;

  for (
    let index = 0;
    index <
    sortedEntries.length;
    index++
  ) {
    const entry =
      sortedEntries[index];

    const score =
      Number(
        entry.score ?? 0
      );

    const time =
      Number(
        entry.time_used_seconds ??
        Number.MAX_SAFE_INTEGER
      );

    let rank =
      index + 1;

    if (
      previousScore !== null &&
      previousTime !== null &&
      score ===
        previousScore &&
      time ===
        previousTime
    ) {
      rank =
        previousRank;
    }

    previousScore =
      score;

    previousTime =
      time;

    previousRank =
      rank;

    /*
     * Save rank to leaderboard_entries.
     */

    const {
      error:
        rankError,
    } = await admin
      .from(
        'leaderboard_entries'
      )
      .update({
        rank,
      })
      .eq(
        'id',
        entry.id
      );

    if (rankError) {
      console.error(
        'Leaderboard rank update error:',
        rankError
      );

      return NextResponse.json(
        {
          error:
            'Results were released, but some leaderboard ranks could not be saved.',
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Save the same rank to the challenge
     * participant record.
     */

    const {
      error:
        participantRankError,
    } = await admin
      .from(
        'utme_challenge_participants'
      )
      .update({
        rank,
      })
      .eq(
        'round_id',
        roundId
      )
      .eq(
        'student_id',
        entry.student_id
      );

    if (
      participantRankError
    ) {
      console.error(
        'Participant rank update error:',
        participantRankError
      );

      /*
       * Do not stop the release because the
       * leaderboard_entries rank was saved.
       */
    }
  }

  /*
   * =====================================================
   * SUCCESS
   * =====================================================
   */

  return NextResponse.json({
    success: true,

    round_id:
      roundId,

    title:
      round.title,

    results_released:
      true,

    submitted_attempts:
      submittedAttempts.length,

    leaderboard_entries:
      sortedEntries.length,

    message:
      'Challenge results have been released successfully. Student scores and rankings are now available.',
  });
}
