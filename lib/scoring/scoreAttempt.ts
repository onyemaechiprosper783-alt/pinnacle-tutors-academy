import { createAdminClient } from '@/lib/supabase/admin';

export interface ScoreResult {
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  score: number; // percentage
}

// Scores every attempt_question for a given attempt against the real
// `questions.correct_answer`, writes is_correct back onto each row, and
// returns the aggregate. Called from the submit route for every exam mode
// (practice questions are also scored this way when the student ends the
// session, even though they saw feedback per-question already).
export async function scoreAttempt(attemptId: string): Promise<ScoreResult> {
  const admin = createAdminClient();

  const { data: attemptQuestions, error } = await admin
    .from('attempt_questions')
    .select('id, question_id, selected_answer')
    .eq('attempt_id', attemptId);

  if (error || !attemptQuestions) {
    throw new Error('Could not load attempt questions for scoring.');
  }

  const questionIds = attemptQuestions.map((aq) => aq.question_id);
  const { data: questions } = await admin
    .from('questions')
    .select('id, correct_answer')
    .in('id', questionIds);

  const answerKey = new Map((questions ?? []).map((q) => [q.id, q.correct_answer]));

  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;

  const updates = attemptQuestions.map((aq) => {
    const correctAnswer = answerKey.get(aq.question_id);
    let isCorrect: boolean | null = null;

    if (!aq.selected_answer) {
      unanswered++;
    } else {
      isCorrect = aq.selected_answer === correctAnswer;
      isCorrect ? correct++ : incorrect++;
    }

    return { id: aq.id, is_correct: isCorrect };
  });

  // Batch update — Supabase has no multi-row update-by-id in one call, so
  // fire them concurrently rather than sequentially.
  await Promise.all(
    updates.map((u) => admin.from('attempt_questions').update({ is_correct: u.is_correct }).eq('id', u.id))
  );

  const total = attemptQuestions.length;
  const score = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;

  return { total_questions: total, correct_count: correct, incorrect_count: incorrect, unanswered_count: unanswered, score };
}
