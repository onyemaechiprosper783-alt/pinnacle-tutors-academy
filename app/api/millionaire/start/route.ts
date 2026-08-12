import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PRIZE_LADDER } from '@/lib/scoring/millionaire';

// POST /api/millionaire/start
// No body needed — pulls one active question per configured
// millionaire_tier, in tier order. If fewer than 15 tiers have questions,
// the game simply runs shorter (e.g. 10 tiers) rather than failing, since
// the question bank grows over time.
export async function POST() {
  const caller = await getCurrentProfile();
  if (!caller) return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });

  const admin = createAdminClient();

  const tierQuestionIds: string[] = [];
  for (const tier of PRIZE_LADDER) {
    const { data } = await admin
      .from('questions')
      .select('id')
      .eq('is_active', true)
      .eq('millionaire_tier', tier.tier)
      .contains('modes', ['millionaire']);

    if (data && data.length > 0) {
      const pick = data[Math.floor(Math.random() * data.length)];
      tierQuestionIds.push(pick.id);
    } else {
      break; // stop the ladder at the first tier with no questions available
    }
  }

  if (tierQuestionIds.length === 0) {
    return NextResponse.json(
      { error: 'Questions for this subject are currently being prepared. Please check back soon.' },
      { status: 404 }
    );
  }

  const { data: attempt, error } = await admin
    .from('exam_attempts')
    .insert({
      student_id: caller.id,
      mode: 'millionaire',
      config: { total_tiers: tierQuestionIds.length },
      status: 'in_progress',
      millionaire_prize_tier: 0,
      millionaire_lifelines_used: [],
    })
    .select('id')
    .single();

  if (error || !attempt) return NextResponse.json({ error: 'Could not start game.' }, { status: 500 });

  await admin.from('attempt_questions').insert(
    tierQuestionIds.map((qId, i) => ({ attempt_id: attempt.id, question_id: qId, position: i + 1 }))
  );

  const { data: firstQuestion } = await admin
    .from('questions_public')
    .select('*')
    .eq('id', tierQuestionIds[0])
    .single();

  return NextResponse.json({
    attempt_id: attempt.id,
    total_tiers: tierQuestionIds.length,
    current_tier: 1,
    question: firstQuestion,
    prize_ladder: PRIZE_LADDER.slice(0, tierQuestionIds.length),
  });
}
