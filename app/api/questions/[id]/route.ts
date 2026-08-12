import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dedupeHash } from '@/lib/importer/parser';

async function requireAdmin() {
  const caller = await getCurrentProfile();
  if (!caller || (caller.role !== 'admin' && caller.role !== 'super_admin')) return null;
  return caller;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireAdmin();
  if (!caller) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin.from('questions').select('*').eq('id', id).single();

  if (error || !data) return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
  return NextResponse.json(data);
}

const updateSchema = z.object({
  subject_id: z.string().uuid().optional(),
  topic_id: z.string().uuid().nullable().optional(),
  question_text: z.string().min(1).optional(),
  option_a: z.string().min(1).optional(),
  option_b: z.string().min(1).optional(),
  option_c: z.string().min(1).optional(),
  option_d: z.string().min(1).optional(),
  correct_answer: z.enum(['A', 'B', 'C', 'D']).optional(),
  explanation: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  exam_type: z.enum(['jamb', 'waec', 'utme', 'general']).optional(),
  year: z.number().nullable().optional(),
  modes: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  millionaire_tier: z.number().min(1).max(15).nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireAdmin();
  if (!caller) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update.' }, { status: 400 });

  const admin = createAdminClient();
  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.question_text) updates.dedupe_hash = dedupeHash(parsed.data.question_text);

  const { error } = await admin.from('questions').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: 'Update failed.' }, { status: 500 });

  return NextResponse.json({ success: true });
}

// DELETE is a soft delete (is_active = false) by default — questions are
// referenced by past exam_attempts, so hard-deleting would corrupt
// historical results. Pass ?hard=true to permanently remove one that was
// never used in any attempt.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireAdmin();
  if (!caller) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const admin = createAdminClient();

  if (searchParams.get('hard') === 'true') {
    const { count } = await admin
      .from('attempt_questions')
      .select('id', { count: 'exact', head: true })
      .eq('question_id', id);

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'This question has been used in past exam attempts and cannot be hard-deleted. Deactivate it instead.' },
        { status: 409 }
      );
    }

    const { error } = await admin.from('questions').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
    return NextResponse.json({ success: true, deleted: 'hard' });
  }

  const { error } = await admin.from('questions').update({ is_active: false }).eq('id', id);
  if (error) return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
  return NextResponse.json({ success: true, deleted: 'soft' });
}
