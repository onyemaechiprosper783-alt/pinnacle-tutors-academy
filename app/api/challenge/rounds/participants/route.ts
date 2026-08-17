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

  const { data, error } = await admin
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
      reward_given_at,
      profiles:student_id (
        id,
        full_name
      )
    `)
    .eq('round_id', roundId)
    .order('score', { ascending: false })
    .order('submitted_at', { ascending: true });

  if (error) {
    console.error('Challenge participants error:', error);

    return NextResponse.json(
      { error: 'Could not load challenge participants.' },
      { status: 500 }
    );
  }

  let previousScore: number | null = null;
  let previousRank = 0;

  const ranked = (data ?? []).map((participant, index) => {
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

    return {
      ...participant,
      rank,
      student_name:
        participant.profiles?.[0]?.full_name || 'Unknown student',
    };
  });

  return NextResponse.json(ranked);
}
