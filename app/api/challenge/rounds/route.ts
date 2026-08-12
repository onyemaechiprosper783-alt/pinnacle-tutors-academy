import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('challenge_rounds')
    .select('*, subjects(name)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Query failed.' }, { status: 500 });
  return NextResponse.json(data);
}

const createSchema = z.object({
  title: z.string().min(2),
  subject_id: z.string().uuid().optional(),
  question_count: z.number().min(5).max(100).default(20),
  duration_seconds: z.number().min(60).default(900),
  opens_at: z.string().optional(),
  closes_at: z.string().optional(),
});

export async function POST(request: Request) {
  const caller = await getCurrentProfile();
  if (!caller || (caller.role !== 'admin' && caller.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid round.' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('challenge_rounds')
    .insert({ ...parsed.data, created_by: caller.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Could not create round.' }, { status: 500 });
  return NextResponse.json(data);
}
