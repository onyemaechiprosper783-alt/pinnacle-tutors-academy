import { createAdminClient } from '@/lib/supabase/admin';

export interface SelectQuestionsOptions {
  subjectIds: string[];
  mode: 'practice' | 'mock' | 'cbt' | 'utme_challenge' | 'millionaire';
  questionCount: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  examType?: 'jamb' | 'waec' | 'utme' | 'general';
  year?: number;
}

// Selects eligible active questions and returns a shuffled subset.
export async function selectQuestions(opts: SelectQuestionsOptions) {
  const admin = createAdminClient();

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

  const pool = [...(data ?? [])];

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, opts.questionCount).map((q) => q.id);
}
