import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const availabilitySchema = z.object({
  subject_id: z.string().uuid(),
  mode: z.enum(['practice', 'mock', 'cbt']),
  exam_type: z.enum(['jamb', 'waec', 'utme', 'general']).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
});

export async function POST(request: Request) {
  const caller = await getCurrentProfile();

  if (!caller) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = availabilitySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid availability request.' }, { status: 400 });
  }

  const { subject_id, mode, exam_type, year, difficulty } = parsed.data;
  const admin = createAdminClient();

  let query = admin
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .contains('modes', [mode])
    .eq('subject_id', subject_id);

  if (exam_type) query = query.eq('exam_type', exam_type);
  if (year) query = query.eq('year', year);
  if (difficulty) query = query.eq('difficulty', difficulty);

  const { count, error } = await query;

  if (error) {
    console.error('Question availability error:', error);
    return NextResponse.json({ error: 'Could not check available questions.' }, { status: 500 });
  }

  // Practice currently offers at most 50 questions in its selector.
  // Keep the availability value aligned with what the student can actually choose.
  const rawAvailable = count ?? 0;
  const available = mode === 'practice' ? Math.min(rawAvailable, 50) : rawAvailable;

  return NextResponse.json({ available });
}
