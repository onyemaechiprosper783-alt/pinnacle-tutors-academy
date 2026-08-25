import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const caller = await getCurrentProfile();

  if (!caller) {
    return NextResponse.json(
      { error: 'Not authorized.' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const roundId = searchParams.get('round_id');

  if (!roundId) {
    return NextResponse.json(
      { error: 'round_id is required.' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  /*
   * =====================================================
   * GET ROUND
   * =====================================================
   */

  const { data: round, error: roundError } = await admin
    .from('challenge_rounds')
    .select(`
      id,
      title,
      results_released
    `)
    .eq('id', roundId)
    .single();

  if (roundError || !round) {
    return NextResponse.json(
      { error: 'Challenge round not found.' },
      { status: 404 }
    );
  }

  /*
   * =====================================================
   * RESULTS MUST BE RELEASED BY ADMIN
   * =====================================================
   *
   * This is intentionally checked on the SERVER.
   *
   * Before the admin taps "Show Results", students
   * receive no scores, ranks, names, or leaderboard data.
   */

  if (!round.results_released) {
    return NextResponse.json({
      released: false,
      round: {
        id: round.id,
        title: round.title,
      },
      leaderboard: [],
      my_result: null,
    });
  }

  /*
   * =====================================================
   * LOAD PARTICIPANTS
   * =====================================================
   *
   * Only public leaderboard information is returned.
   *
   * WhatsApp numbers, reward information, etc. are
   * intentionally NOT selected.
   */

  const { data: participants, error: participantsError } =
    await admin
      .from('utme_challenge_participants')
      .select(`
        id,
        student_id,
        status,
        score,
        submitted_at,
        profiles:student_id (
          full_name
        )
      `)
      .eq('round_id', roundId)
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
      'Student leaderboard error:',
      participantsError
    );

    return NextResponse.json(
      { error: 'Could not load leaderboard.' },
      { status: 500 }
    );
  }

  /*
   * =====================================================
   * CALCULATE RANKS
   * =====================================================
   *
   * Same score = same rank.
   *
   * Example:
   *
   * 1
   * 2
   * 2
   * 4
   *
   * This matches the ranking behavior already used
   * by the admin participants endpoint.
   */

  let previousScore: number | null = null;
  let previousRank = 0;

  const leaderboard = (participants ?? []).map(
    (participant, index) => {
      const score = participant.score ?? 0;

      let rank: number;

      if (
        index > 0 &&
        previousScore !== null &&
        score === previousScore
      ) {
        rank = previousRank;
      } else {
        rank = index + 1;
      }

      previousScore = score;
      previousRank = rank;

      const profile = Array.isArray(
        participant.profiles
      )
        ? participant.profiles[0]
        : participant.profiles;

      return {
        rank,
        student_id: participant.student_id,
        student_name:
          profile?.full_name ?? 'Student',
        score,
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
        entry.student_id === caller.id
    ) ?? null;

  /*
   * =====================================================
   * RETURN PUBLIC RESULTS
   * =====================================================
   */

  return NextResponse.json({
    released: true,

    round: {
      id: round.id,
      title: round.title,
    },

    leaderboard,

    my_result: myResult,
  });
}
