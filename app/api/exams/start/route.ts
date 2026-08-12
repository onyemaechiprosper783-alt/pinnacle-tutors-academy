import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { selectQuestions } from '@/lib/scoring/selectQuestions';

const startSchema = z.object({
  mode: z.enum(['practice', 'mock', 'cbt', 'utme_challenge']),
  subject_ids: z.array(z.string().uuid()).min(1),
  question_count: z.number().min(1).max(250).default(20),
  duration_seconds: z.number().min(60).max(4 * 60 * 60).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  exam_type: z.enum(['jamb', 'waec', 'utme', 'general']).optional(),
  round_id: z.string().uuid().optional(), // links a utme_challenge attempt to a challenge_rounds row
});

// Sensible default durations when the client doesn't specify one.
const DEFAULT_DURATION: Record<string, number> = {
  cbt: 45 * 60,
  mock: 90 * 60,
  practice: 0, // untimed unless configured
  utme_challenge: 15 * 60,
};

export async function POST(request: Request) {
  const caller = await getCurrentProfile();
  if (!caller) return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid exam configuration.' }, { status: 400 });

  const { mode, subject_ids, question_count, difficulty, exam_type, round_id } = parsed.data;
  const duration_seconds = parsed.data.duration_seconds ?? DEFAULT_DURATION[mode];

  const questionIds = await selectQuestions({
    subjectIds: subject_ids, mode, questionCount: question_count, difficulty, examType: exam_type,
  });

  if (questionIds.length === 0) {
    return NextResponse.json(
      { error: 'Questions for this subject are currently being prepared. Please check back soon.' },
      { status: 404 }
    );
  }

  const admin = createAdminClient();

  const { data: attempt, error: attemptError } = await admin
    .from('exam_attempts')
    .insert({
      student_id: caller.id,
      mode,
      subject_ids,
      config: { question_count, difficulty, exam_type, round_id },
      duration_seconds: duration_seconds || null,
      status: 'in_progress',
    })
    .select('id, started_at, duration_seconds')
    .single();

  if (attemptError || !attempt) {
    return NextResponse.json({ error: 'Could not start exam.' }, { status: 500 });
  }

  const attemptQuestionRows = questionIds.map((qId, i) => ({
    attempt_id: attempt.id, question_id: qId, position: i + 1,
  }));
  await admin.from('attempt_questions').insert(attemptQuestionRows);

  const { data: questions } = await admin
    .from('questions_public')
    .select('*')
    .in('id', questionIds);

  // Preserve the randomized order chosen above, since the IN query above
  // does not guarantee row order.
  const orderMap = new Map(questionIds.map((id, i) => [id, i]));
  const orderedQuestions = (questions ?? []).sort(
    (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
  );

  return NextResponse.json({
    attempt_id: attempt.id,
    started_at: attempt.started_at,
    duration_seconds: attempt.duration_seconds,
    questions: orderedQuestions,
  });
}
