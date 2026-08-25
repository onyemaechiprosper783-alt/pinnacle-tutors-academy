import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const caller = await getCurrentProfile();

  if (
    !caller ||
    (caller.role !== 'admin' &&
      caller.role !== 'super_admin')
  ) {
    return NextResponse.json(
      { error: 'Not authorized.' },
      { status: 403 }
    );
  }

  const { searchParams } =
    new URL(request.url);

  const mode =
    searchParams.get('mode');

  const admin =
    createAdminClient();

  /*
   * =====================================================
   * LOAD EXAM ATTEMPTS
   * =====================================================
   */

  let query = admin
    .from('exam_attempts')
    .select(`
      id,
      student_id,
      mode,
      status,
      score,
      correct_count,
      incorrect_count,
      unanswered_count,
      total_questions,
      submitted_at,
      started_at,
      time_used_seconds,
      config,
      profiles(full_name)
    `)
    .order(
      'started_at',
      { ascending: false }
    )
    .limit(100);

  if (mode) {
    query = query.eq(
      'mode',
      mode
    );
  }

  const {
    data: attempts,
    error,
  } = await query;

  if (error) {
    console.error(
      'Admin results query error:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Query failed.',
      },
      { status: 500 }
    );
  }

  /*
   * =====================================================
   * FIND CHALLENGE ROUND IDS
   * =====================================================
   */

  const challengeRoundIds =
    Array.from(
      new Set(
        (attempts ?? [])
          .map((attempt) => {
            const config =
              (attempt.config ??
                {}) as {
                round_id?: string | null;
                challenge?: {
                  round_id?: string | null;
                } | null;
              };

            return (
              config.round_id ??
              config.challenge
                ?.round_id ??
              null
            );
          })
          .filter(
            (
              id
            ): id is string =>
              !!id
          )
      )
    );

  /*
   * =====================================================
   * LOAD CHALLENGE ROUNDS
   * =====================================================
   *
   * challenge_rounds.results_released is the
   * authoritative source for whether students
   * can see their results.
   */

  let rounds: {
    id: string;
    title: string | null;
    results_released: boolean;
  }[] = [];

  if (
    challengeRoundIds.length > 0
  ) {
    const {
      data: roundData,
      error:
        roundError,
    } = await admin
      .from('challenge_rounds')
      .select(`
        id,
        title,
        results_released
      `)
      .in(
        'id',
        challengeRoundIds
      );

    if (roundError) {
      console.error(
        'Challenge rounds query error:',
        roundError
      );

      return NextResponse.json(
        {
          error:
            'Could not load challenge information.',
        },
        { status: 500 }
      );
    }

    rounds =
      roundData ?? [];
  }

  const roundMap =
    new Map(
      rounds.map(
        (round) => [
          round.id,
          round,
        ]
      )
    );

  /*
   * =====================================================
   * FORMAT RESULTS
   * =====================================================
   */

  const formatted =
    (attempts ?? []).map(
      (attempt) => {
        const config =
          (attempt.config ??
            {}) as {
            round_id?: string | null;

            challenge?: {
              is_challenge?: boolean;
              round_id?: string | null;
              title?: string | null;
            } | null;
          };

        const roundId =
          config.round_id ??
          config.challenge
            ?.round_id ??
          null;

        const isChallenge =
          attempt.mode ===
            'cbt' &&
          !!roundId;

        const round =
          roundId
            ? roundMap.get(
                roundId
              )
            : null;

        return {
          id:
            attempt.id,

          student_id:
            attempt.student_id,

          mode:
            attempt.mode,

          status:
            attempt.status,

          score:
            attempt.score,

          correct_count:
            attempt.correct_count,

          incorrect_count:
            attempt.incorrect_count,

          unanswered_count:
            attempt.unanswered_count,

          total_questions:
            attempt.total_questions,

          submitted_at:
            attempt.submitted_at,

          started_at:
            attempt.started_at,

          time_used_seconds:
            attempt.time_used_seconds,

          student_name:
            (
              attempt.profiles as
                | {
                    full_name?: string;
                  }
                | null
            )?.full_name ??
            '—',

          /*
           * Challenge information
           */

          is_challenge:
            isChallenge,

          round_id:
            isChallenge
              ? roundId
              : null,

          challenge_title:
            isChallenge
              ? (
                  round?.title ??
                  config.challenge
                    ?.title ??
                  null
                )
              : null,

          /*
           * IMPORTANT:
           *
           * Read release status from
           * challenge_rounds.
           */

          results_released:
            isChallenge
              ? Boolean(
                  round
                    ?.results_released
                )
              : true,
        };
      }
    );

  return NextResponse.json(
    formatted
  );
}
