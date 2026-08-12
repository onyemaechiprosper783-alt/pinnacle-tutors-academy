import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const lifelineSchema = z.object({ type: z.enum(['fifty_fifty', 'ask_crowd']) });

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const caller = await getCurrentProfile();
  if (!caller) return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });

  const { attemptId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = lifelineSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid lifeline.' }, { status: 400 });

  const admin = createAdminClient();
  const { data: attempt } = await admin
    .from('exam_attempts')
    .select('id, student_id, status, millionaire_prize_tier, millionaire_lifelines_used')
    .eq('id', attemptId)
    .single();

  if (!attempt || attempt.student_id !== caller.id) {
    return NextResponse.json({ error: 'Game not found.' }, { status: 404 });
  }
  if (attempt.status !== 'in_progress') {
    return NextResponse.json({ error: 'This game has already ended.' }, { status: 409 });
  }
  if ((attempt.millionaire_lifelines_used ?? []).includes(parsed.data.type)) {
    return NextResponse.json({ error: 'You have already used this lifeline.' }, { status: 409 });
  }

  const currentTierNumber = (attempt.millionaire_prize_tier ?? 0) + 1;
  const { data: attemptQuestion } = await admin
    .from('attempt_questions')
    .select('question_id')
    .eq('attempt_id', attemptId)
    .eq('position', currentTierNumber)
    .single();

  if (!attemptQuestion) return NextResponse.json({ error: 'No active question.' }, { status: 404 });

  const { data: question } = await admin
    .from('questions')
    .select('correct_answer')
    .eq('id', attemptQuestion.question_id)
    .single();

  await admin
    .from('exam_attempts')
    .update({ millionaire_lifelines_used: [...(attempt.millionaire_lifelines_used ?? []), parsed.data.type] })
    .eq('id', attemptId);

  const correctAnswer = question?.correct_answer as 'A' | 'B' | 'C' | 'D';
  const allLetters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const wrongLetters = allLetters.filter((l) => l !== correctAnswer);

  if (parsed.data.type === 'fifty_fifty') {
    // Remove two of the three wrong options at random — the remaining two
    // always include the correct answer, chosen server-side so the client
    // never sees the answer key directly.
    const shuffled = [...wrongLetters].sort(() => Math.random() - 0.5);
    const toRemove = shuffled.slice(0, 2);
    return NextResponse.json({ type: 'fifty_fifty', remove_options: toRemove });
  }

  // Ask the crowd: simulate a plausible poll weighted toward the correct
  // answer, without ever stating the answer outright.
  const correctShare = 45 + Math.floor(Math.random() * 25); // 45–69%
  const remaining = 100 - correctShare;
  const splits = wrongLetters.map(() => Math.random());
  const splitSum = splits.reduce((a, b) => a + b, 0);
  const percentages: Record<string, number> = { [correctAnswer]: correctShare };
  wrongLetters.forEach((l, i) => {
    percentages[l] = Math.round((splits[i] / splitSum) * remaining);
  });

  return NextResponse.json({ type: 'ask_crowd', percentages });
}
