import { createAdminClient } from '@/lib/supabase/admin';

export interface SelectQuestionsOptions {
  subjectIds: string[];
  mode:
    | 'practice'
    | 'mock'
    | 'cbt'
    | 'utme_challenge'
    | 'millionaire';

  questionCount: number;

  difficulty?: 'easy' | 'medium' | 'hard';
  examType?: 'jamb' | 'waec' | 'utme' | 'general';
  year?: number;

  // Used by the special JAMB CBT structure.
  subjectQuestionCounts?: {
    subjectId: string;
    count: number;
  }[];
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Select questions for an exam.
 *
 * NORMAL EXAMS:
 * Uses questionCount across all selected subjects.
 *
 * SPECIAL CBT:
 * Selects an exact number from each subject.
 *
 * JAMB CBT:
 * - English Language: 50
 * - Lekki Headmaster: 10
 * - Three selected subjects: 40 each
 * - Total: 180
 *
 * IMPORTANT:
 * For the special CBT we DO NOT filter by exam_type.
 *
 * The bulk importer gives newly imported questions
 * exam_type = "general" unless ExamType is supplied.
 *
 * CBT eligibility is therefore determined by:
 *   is_active = true
 *   modes contains "cbt"
 *
 * This prevents valid CBT questions from being excluded
 * simply because their exam_type is "general".
 */
export async function selectQuestions(
  opts: SelectQuestionsOptions
) {
  const admin = createAdminClient();

  /*
   * ====================================================
   * SPECIAL CBT SELECTION
   * ====================================================
   */
  if (opts.subjectQuestionCounts?.length) {
    const selectedIds: string[] = [];

    for (const item of opts.subjectQuestionCounts) {
      let query = admin
        .from('questions')
        .select('id')
        .eq('is_active', true)
        .contains('modes', [opts.mode])
        .eq('subject_id', item.subjectId);

      /*
       * IMPORTANT:
       *
       * Do NOT apply exam_type or year here.
       *
       * The special CBT should be able to use all
       * eligible CBT questions.
       *
       * We only apply difficulty if one was explicitly
       * requested.
       */
      if (opts.difficulty) {
        query = query.eq('difficulty', opts.difficulty);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(
          `Could not load questions for subject ${item.subjectId}.`
        );
      }

      const pool = shuffle(data ?? []);

      if (pool.length < item.count) {
        throw new Error(
          `Not enough CBT questions for subject ${item.subjectId}. ` +
            `Required ${item.count}, but only ${pool.length} are available.`
        );
      }

      selectedIds.push(
        ...pool
          .slice(0, item.count)
          .map((q) => q.id)
      );
    }

    /*
     * Make sure the CBT contains exactly the requested
     * number of questions.
     */
    const requiredTotal =
      opts.subjectQuestionCounts.reduce(
        (total, item) => total + item.count,
        0
      );

    if (selectedIds.length !== requiredTotal) {
      throw new Error(
        `Could not create the required CBT. ` +
          `Required ${requiredTotal}, but selected ${selectedIds.length}.`
      );
    }

    /*
     * Randomize the final CBT order so English,
     * Lekki Headmaster and the other subjects are mixed.
     */
    return shuffle(selectedIds);
  }

  /*
   * ====================================================
   * NORMAL EXAM SELECTION
   * ====================================================
   *
   * Practice, Mock and UTME Challenge continue to use
   * the normal filters.
   */
  let query = admin
    .from('questions')
    .select('id, subject_id')
    .eq('is_active', true)
    .contains('modes', [opts.mode])
    .in('subject_id', opts.subjectIds);

  if (opts.difficulty) {
    query = query.eq(
      'difficulty',
      opts.difficulty
    );
  }

  if (opts.examType) {
    query = query.eq(
      'exam_type',
      opts.examType
    );
  }

  if (opts.year) {
    query = query.eq(
      'year',
      opts.year
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      'Could not load questions.'
    );
  }

  const pool = shuffle(data ?? []);

  if (pool.length < opts.questionCount) {
    throw new Error(
      `Not enough questions available. ` +
        `Required ${opts.questionCount}, ` +
        `but only ${pool.length} are available.`
    );
  }

  return pool
    .slice(0, opts.questionCount)
    .map((q) => q.id);
}
