import { createAdminClient } from '@/lib/supabase/admin';

export interface ScoreResult {
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  score: number; // normal exams = percentage
}

/*
 * Scores every question in an attempt against
 * questions.correct_answer.
 *
 * IMPORTANT:
 *
 * This function returns a NORMAL percentage score.
 *
 * The UTME Challenge conversion to 400 marks
 * is handled by the submit route because the
 * challenge is identified by its round_id.
 */
export async function scoreAttempt(
  attemptId: string
): Promise<ScoreResult> {
  const admin =
    createAdminClient();

  /*
   * =====================================================
   * LOAD ATTEMPT QUESTIONS
   * =====================================================
   */

  const {
    data: attemptQuestions,
    error: attemptQuestionsError,
  } = await admin
    .from('attempt_questions')
    .select(
      'id, question_id, selected_answer'
    )
    .eq(
      'attempt_id',
      attemptId
    );

  if (
    attemptQuestionsError
  ) {
    console.error(
      'Attempt questions scoring error:',
      attemptQuestionsError
    );

    throw new Error(
      'Could not load attempt questions for scoring.'
    );
  }

  if (
    !attemptQuestions
  ) {
    throw new Error(
      'Could not load attempt questions for scoring.'
    );
  }

  /*
   * No questions means there is nothing to score.
   */

  if (
    attemptQuestions.length === 0
  ) {
    return {
      total_questions: 0,
      correct_count: 0,
      incorrect_count: 0,
      unanswered_count: 0,
      score: 0,
    };
  }

  /*
   * =====================================================
   * LOAD QUESTION ANSWERS
   * =====================================================
   */

  const questionIds =
    attemptQuestions.map(
      (aq) => aq.question_id
    );

  const {
    data: questions,
    error: questionsError,
  } = await admin
    .from('questions')
    .select(
      'id, correct_answer'
    )
    .in(
      'id',
      questionIds
    );

  if (
    questionsError
  ) {
    console.error(
      'Question answer lookup error:',
      questionsError
    );

    throw new Error(
      'Could not load question answers for scoring.'
    );
  }

  /*
   * =====================================================
   * BUILD ANSWER KEY
   * =====================================================
   */

  const answerKey =
    new Map<
      string,
      string | null
    >(
      (questions ?? []).map(
        (question) => [
          question.id,
          question.correct_answer,
        ]
      )
    );

  /*
   * =====================================================
   * CALCULATE RESULT
   * =====================================================
   */

  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;

  const updates =
    attemptQuestions.map(
      (attemptQuestion) => {
        const selected =
          attemptQuestion.selected_answer;

        const correctAnswer =
          answerKey.get(
            attemptQuestion.question_id
          );

        let isCorrect:
          | boolean
          | null = null;

        /*
         * No answer selected.
         */

        if (
          !selected
        ) {
          unanswered++;
        }

        /*
         * Answer selected and question exists
         * in the answer key.
         */

        else if (
          correctAnswer !==
          undefined &&
          correctAnswer !==
          null
        ) {
          isCorrect =
            selected ===
            correctAnswer;

          if (isCorrect) {
            correct++;
          } else {
            incorrect++;
          }
        }

        /*
         * A selected answer exists but the
         * question answer could not be found.
         *
         * We do NOT count this as correct.
         */

        else {
          incorrect++;
          isCorrect = false;
        }

        return {
          id:
            attemptQuestion.id,

          is_correct:
            isCorrect,
        };
      }
    );

  /*
   * =====================================================
   * SAVE QUESTION-LEVEL RESULTS
   * =====================================================
   *
   * Supabase does not provide a simple multi-row
   * update-by-different-id operation, so update
   * each attempt_question concurrently.
   */

  const updateResults =
    await Promise.all(
      updates.map(
        async (update) => {
          const {
            error,
          } = await admin
            .from(
              'attempt_questions'
            )
            .update({
              is_correct:
                update.is_correct,
            })
            .eq(
              'id',
              update.id
            );

          return error;
        }
      )
    );

  const failedUpdate =
    updateResults.find(
      (error) => error
    );

  if (
    failedUpdate
  ) {
    console.error(
      'Attempt question result update error:',
      failedUpdate
    );

    throw new Error(
      'Could not save question scoring results.'
    );
  }

  /*
   * =====================================================
   * NORMAL SCORE
   * =====================================================
   *
   * Normal exams use percentage.
   */

  const total =
    attemptQuestions.length;

  const score =
    total > 0
      ? Math.round(
          (correct / total) *
            10000
        ) / 100
      : 0;

  return {
    total_questions:
      total,

    correct_count:
      correct,

    incorrect_count:
      incorrect,

    unanswered_count:
      unanswered,

    score,
  };
}
