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
   *
   * IMPORTANT:
   *
   * UTME Challenge attempts are stored with:
   *
   *     mode = 'cbt'
   *
   * They are identified by:
   *
   *     config.round_id
   *
   * Therefore we load the config as well.
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

  /*
   * Normal mode filter.
   *
   * NOTE:
   *
   * A UTME Challenge is CBT mode, so the
   * challenge detection happens below.
   */

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

        /*
         * Challenge identification:
         *
         * mode = cbt
         * AND round_id exists
         */

        const isChallenge =
          attempt.mode ===
            'cbt' &&
          !!roundId;

        return {
          id: attempt.id,

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
                  config.challenge
                    ?.title ??
                  null
                )
              : null,

          /*
           * Results should remain hidden from
           * students, but administrators need
           * the information required to manage
           * the result-release process.
           */

          results_released:
            isChallenge
              ? Boolean(
                  (
                    config as {
                      results_released?: boolean;
                    }
                  )
                    .results_released
                )
              : true,
        };
      }
    );

  return NextResponse.json(
    formatted
  );
}
