import { createAdminClient } from '@/lib/supabase/admin';

export interface SelectQuestionsOptions {
  subjectIds: string[];
  mode: 'practice' | 'mock' | 'cbt' | 'utme_challenge' | 'millionaire';
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

// Selects eligible active questions and returns a shuffled subset.
//
// For normal exams, questionCount is used.
//
// For the special CBT structure, subjectQuestionCounts can be supplied
// to request a different number of questions from each subject.
export async function selectQuestions(
  opts: SelectQuestionsOptions
) {
  const admin = createAdminClient();

  /*
   * SPECIAL SUBJECT-BY-SUBJECT SELECTION
   *
   * Example:
   *
   * English Language       -> 50
   * Lekki Headmaster       -> 10
   * Mathematics            -> 40
   * Physics                -> 40
   * Chemistry              -> 40
   *
   * Total                   -> 180
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

      if (opts.difficulty) {
        query = query.eq('difficulty', opts.difficulty);
      }

      if (opts.examType) {
        query = query.eq('exam_type', opts.examType);
      }

      if (opts.year) {
        query = query.eq('year', opts.year);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error('Could not load questions.');
      }

      const pool = shuffle(data ?? []);

      if (pool.length < item.count) {
        throw new Error(
          `Not enough questions available for one of the selected subjects. ` +
          `Required ${item.count}, but only ${pool.length} are available.`
        );
      }

      selectedIds.push(
        ...pool.slice(0, item.count).map((q) => q.id)
      );
    }

    // Shuffle the complete CBT so subjects are not simply
    // presented in database order.
    return shuffle(selectedIds);
  }

  /*
   * NORMAL SELECTION
   *
   * Used by Practice, Mock and any other mode that does not
   * provide subjectQuestionCounts.
   */
  let query = admin
    .from('questions')
    .select('id, subject_id')
    .eq('is_active', true)
    .contains('modes', [opts.mode])
    .in('subject_id', opts.subjectIds);

  if (opts.difficulty) {
    query = query.eq('difficulty', opts.difficulty);
  }

  if (opts.examType) {
    query = query.eq('exam_type', opts.examType);
  }

  if (opts.year) {
    query = query.eq('year', opts.year);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Could not load questions.');
  }

  const pool = shuffle(data ?? []);

  if (pool.length < opts.questionCount) {
    throw new Error(
      `Not enough questions available. Required ${opts.questionCount}, but only ${pool.length} are available.`
    );
  }

  return pool
    .slice(0, opts.questionCount)
    .map((q) => q.id);
}
