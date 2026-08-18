import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const caller = await getCurrentProfile();

  if (
    !caller ||
    (caller.role !== 'admin' && caller.role !== 'super_admin')
  ) {
    return NextResponse.json(
      { error: 'Not authorized.' },
      { status: 403 }
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
   * LOAD PARTICIPANTS
   * =====================================================
   */

  const { data: participants, error: participantsError } =
    await admin
      .from('utme_challenge_participants')
      .select(`
        id,
        student_id,
        round_id,
        selected_subject_ids,
        status,
        started_at,
        submitted_at,
        duration_seconds,
        time_used_seconds,
        total_questions,
        correct_count,
        incorrect_count,
        unanswered_count,
        score,
        whatsapp_number,
        reward_given,
        reward_given_at
      `)
      .eq('round_id', roundId)
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
      'Challenge participants query error:',
      participantsError
    );

    return NextResponse.json(
      {
        error: 'Could not load challenge participants.',
        details: participantsError.message,
      },
      { status: 500 }
    );
  }

  /*
   * =====================================================
   * LOAD STUDENT PROFILES
   * =====================================================
   */

  const studentIds = [
    ...new Set(
      (participants ?? [])
        .map((participant) => participant.student_id)
        .filter(Boolean)
    ),
  ];

  let profiles: {
    id: string;
    full_name: string | null;
  }[] = [];

  if (studentIds.length > 0) {
    const { data: profileData, error: profilesError } =
      await admin
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);

    if (profilesError) {
      console.error(
        'Challenge participant profiles error:',
        profilesError
      );

      return NextResponse.json(
        {
          error: 'Could not load student profiles.',
          details: profilesError.message,
        },
        { status: 500 }
      );
    }

    profiles = profileData ?? [];
  }

  /*
   * =====================================================
   * CREATE PROFILE LOOKUP
   * =====================================================
   */

  const profileMap = new Map(
    profiles.map((profile) => [
      profile.id,
      profile,
    ])
  );

  /*
   * =====================================================
   * CALCULATE RANK
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
   */

  let previousScore: number | null = null;
  let previousRank = 0;

  const ranked = (participants ?? []).map(
    (participant, index) => {
      const currentScore = participant.score ?? 0;

      let rank: number;

      if (
        index > 0 &&
        previousScore !== null &&
        currentScore === previousScore
      ) {
        rank = previousRank;
      } else {
        rank = index + 1;
      }

      previousScore = currentScore;
      previousRank = rank;

      const profile = profileMap.get(
        participant.student_id
      );

      return {
        ...participant,
        rank,
        student_name:
          profile?.full_name || 'Unknown student',
      };
    }
  );

  return NextResponse.json(ranked);
}
