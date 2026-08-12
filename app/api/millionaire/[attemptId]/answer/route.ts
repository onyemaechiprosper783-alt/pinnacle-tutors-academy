import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PRIZE_LADDER, safeHavenPrizeForTier } from '@/lib/scoring/millionaire';

const answerSchema = z.object({ selected_answer: z.enum(['A', 'B', 'C', 'D']) });

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const caller = await getCurrentProfile();
  if (!caller) return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });

  const { attemptId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = answerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid answer.' }, { status: 400 });

  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from('exam_attempts')
    .select('id, student_id, status, millionaire_prize_tier, config')
    .eq('id', attemptId)
    .single();

  if (!attempt || attempt.student_id !== caller.id) {
    return NextResponse.json({ error: 'Game not found.' }, { status: 404 });
  }
  if (attempt.status !== 'in_progress') {
    return NextResponse.json({ error: 'This game has already ended.' }, { status: 409 });
  }

  const currentTierNumber = (attempt.millionaire_prize_tier ?? 0) + 1;

  const { data: attemptQuestion } = await admin
    .from('attempt_questions')
    .select('id, question_id')
    .eq('attempt_id', attemptId)
    .eq('position', currentTierNumber)
    .single();

  if (!attemptQuestion) return NextResponse.json({ error: 'No question at this tier.' }, { status: 404 });

  const { data: question } = await admin
    .from('questions')
    .select('correct_answer, explanation')
    .eq('id', attemptQuestion.question_id)
    .single();

  const isCorrect = question?.correct_answer === parsed.data.selected_answer;

  await admin
    .from('attempt_questions')
    .update({
      selected_answer: parsed.data.selected_answer,
      is_correct: isCorrect,
      answered_at: new Date().toISOString(),
    })
    .eq('id', attemptQuestion.id);

  const totalTiers = (attempt.config as { total_tiers?: number })?.total_tiers ?? PRIZE_LADDER.length;

  if (!isCorrect) {
    const finalPrize = safeHavenPrizeForTier(currentTierNumber - 1);
    await admin
      .from('exam_attempts')
      .update({
        status: 'submitted', submitted_at: new Date().toISOString(),
        score: currentTierNumber - 1, // reuse `score` column to store tiers cleared
      })
      .eq('id', attemptId);

    return NextResponse.json({
      is_correct: false, correct_answer: question?.correct_answer,
      explanation: question?.explanation, game_over: true, final_prize: finalPrize,
    });
  }

  const wonItAll = currentTierNumber >= totalTiers;

  if (wonItAll) {
    await admin
      .from('exam_attempts')
      .update({
        status: 'submitted', submitted_at: new Date().toISOString(),
        millionaire_prize_tier: currentTierNumber, score: currentTierNumber,
      })
      .eq('id', attemptId);

    return NextResponse.json({
      is_correct: true, game_over: true, won_it_all: true,
      final_prize: PRIZE_LADDER[currentTierNumber - 1].prize,
    });
  }

  await admin
    .from('exam_attempts')
    .update({ millionaire_prize_tier: currentTierNumber })
    .eq('id', attemptId);

  const { data: nextAttemptQuestion } = await admin
    .from('attempt_questions')
    .select('question_id')
    .eq('attempt_id', attemptId)
    .eq('position', currentTierNumber + 1)
    .single();

  const { data: nextQuestion } = await admin
    .from('questions_public')
    .select('*')
    .eq('id', nextAttemptQuestion?.question_id)
    .single();

  return NextResponse.json({
    is_correct: true, game_over: false,
    next_tier: currentTierNumber + 1,
    next_prize: PRIZE_LADDER[currentTierNumber]?.prize,
    question: nextQuestion,
  });
}
