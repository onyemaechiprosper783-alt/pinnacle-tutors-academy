import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dedupeHash } from '@/lib/importer/parser';

const PAGE_SIZE = 25;

// GET /api/questions?search=&subject_id=&topic_id=&difficulty=&exam_type=&mode=&page=&sort=
export async function GET(request: Request) {
  const caller = await getCurrentProfile();
  if (!caller || (caller.role !== 'admin' && caller.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const admin = createAdminClient();

  let query = admin.from('questions').select(
    'id, question_text, subject_id, topic_id, difficulty, exam_type, year, modes, is_active, created_at, subjects(name), topics(name)',
    { count: 'exact' }
  );

  const search = searchParams.get('search');
  if (search) query = query.ilike('question_text', `%${search}%`);

  const subjectId = searchParams.get('subject_id');
  if (subjectId) query = query.eq('subject_id', subjectId);

  const topicId = searchParams.get('topic_id');
  if (topicId) query = query.eq('topic_id', topicId);

  const difficulty = searchParams.get('difficulty');
  if (difficulty) query = query.eq('difficulty', difficulty);

  const examType = searchParams.get('exam_type');
  if (examType) query = query.eq('exam_type', examType);

  const mode = searchParams.get('mode');
  if (mode) query = query.contains('modes', [mode]);

  const sort = searchParams.get('sort') ?? 'created_at';
  const ascending = searchParams.get('order') === 'asc';
  query = query.order(sort, { ascending });

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const from = (page - 1) * PAGE_SIZE;
  query = query.range(from, from + PAGE_SIZE - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: 'Query failed.' }, { status: 500 });

  return NextResponse.json({ questions: data, total: count, page, page_size: PAGE_SIZE });
}

const createSchema = z.object({
  subject_id: z.string().uuid(),
  topic_id: z.string().uuid().optional().nullable(),
  question_text: z.string().min(1),
  option_a: z.string().min(1),
  option_b: z.string().min(1),
  option_c: z.string().min(1),
  option_d: z.string().min(1),
  correct_answer: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  exam_type: z.enum(['jamb', 'waec', 'utme', 'general']).default('general'),
  year: z.number().optional(),
  modes: z.array(z.string()).default(['practice', 'mock', 'cbt']),
  millionaire_tier: z.number().min(1).max(15).optional(),
});

// POST /api/questions — manual single-question creation from the admin form
export async function POST(request: Request) {
  const caller = await getCurrentProfile();
  if (!caller || (caller.role !== 'admin' && caller.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid question data.', details: parsed.error.issues }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('questions')
    .insert({
      ...parsed.data,
      dedupe_hash: dedupeHash(parsed.data.question_text),
      created_by: caller.id,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: 'Could not create question.' }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}
