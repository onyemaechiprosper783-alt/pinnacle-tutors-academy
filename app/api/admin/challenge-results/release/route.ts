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
        error:
          'Not authorized.',
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
   * LOAD CHALLENGE ATTEMPTS
   * =====================================================
   *
   * Challenge attempts are stored as:
   *
   *     mode = cbt
   *
   * and identified by:
   *
   *     config.round_id
   *
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
   * FIND ATTEMPTS BELONGING TO THIS ROUND
   * =====================================================
   */

  const challengeAttempts =
    (attempts ?? []).filter(
      (attempt) => {
        const config =
          (attempt.config ??
            {}) as {
            round_id?: string | null;
            challenge?: {
              round_id?: string | null;
            } | null;
          };

        const configRoundId =
          config.round_id ??
          config.challenge
            ?.round_id ??
          null;

        return (
          configRoundId ===
          roundId
        );
      }
    );

  if (
    challengeAttempts.length ===
    0
  ) {
    return NextResponse.json(
      {
        error:
          'No submitted challenge attempts were found for this round.',
      },
      {
        status: 404,
      }
    );
  }

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
          'No submitted challenge attempts were found yet.',
      },
      {
        status: 400,
      }
    );
  }

  /*
   * =====================================================
   * UPDATE ATTEMPT CONFIG
   * =====================================================
   *
   * We store:
   *
   *     results_released: true
   *
   * inside the attempt configuration.
   *
   * The student results API uses this value
   * to decide whether the result can be shown.
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

    const updatedConfig = {
      ...existingConfig,
      results_released:
        true,

      challenge: {
        ...(
          (
            existingConfig.challenge ??
            {}
          ) as Record<
            string,
            unknown
          >
        ),
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
            'Could not release all challenge results.',
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
   *
   * Existing leaderboard entries are created when
   * the challenge is submitted.
   */

  const {
    data: leaderboardEntries,
    error:
      leaderboardLoadError,
  } = await admin
    .from(
      'leaderboard_entries'
    )
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
          'Challenge results were released, but the leaderboard could not be loaded.',
      },
      {
        status: 500,
      }
    );
  }

  /*
   * =====================================================
   * BUILD RANKING
   * =====================================================
   *
   * Highest score ranks first.
   *
   * If two students have the same score,
   * the student who used less time ranks first.
   *
   * This gives the challenge a deterministic
   * ranking system.
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
          scoreB !== scoreA
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
   * SAVE RANKS
   * =====================================================
   */

  for (
    let index = 0;
    index <
    sortedEntries.length;
    index++
  ) {
    const entry =
      sortedEntries[index];

    /*
     * Competition ranking:
     *
     * 100 points
     * 100 points
     * 90 points
     *
     * ranks:
     *
     * 1
     * 1
     * 3
     */

    const previousEntry =
      sortedEntries[
        index - 1
      ];

    let rank =
      index + 1;

    if (
      previousEntry &&
      Number(
        previousEntry.score ??
          0
      ) ===
        Number(
          entry.score ??
            0
        ) &&
      Number(
        previousEntry.time_used_seconds ??
          0
      ) ===
        Number(
          entry.time_used_seconds ??
            0
        )
    ) {
      /*
       * Same score and same time:
       * same rank.
       */

      const previousRank =
        index > 0
          ? index
          : 1;

      rank =
        previousRank;
    }

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
  }

  /*
   * =====================================================
   * UPDATE PARTICIPANT RANKS
   * =====================================================
   *
   * The student dashboard may use the
   * utme_challenge_participants table instead
   * of leaderboard_entries.
   *
   * Therefore we synchronize the rank there too.
   */

  for (
    let index = 0;
    index <
    sortedEntries.length;
    index++
  ) {
    const entry =
      sortedEntries[index];

    const previousEntry =
      sortedEntries[
        index - 1
      ];

    let rank =
      index + 1;

    if (
      previousEntry &&
      Number(
        previousEntry.score ??
          0
      ) ===
        Number(
          entry.score ??
            0
        ) &&
      Number(
        previousEntry.time_used_seconds ??
          0
        ) ===
        Number(
          entry.time_used_seconds ??
            0
        )
    ) {
      rank =
        index;
    }

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
      /*
       * Do not fail the entire release if the
       * participant table does not contain a
       * matching row.
       *
       * The leaderboard_entries rank has already
       * been saved.
       */

      console.error(
        'Participant rank update error:',
        participantRankError
      );
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

    results_released:
      true,

    participants:
      submittedAttempts.length,

    leaderboard_entries:
      sortedEntries.length,

    message:
      'Challenge results have been released and leaderboard ranks have been updated.',
  });
}
