import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get('subject_id');

  const supabase = await createClient();
  let query = supabase.from('topics').select('*').order('name');
  if (subjectId) query = query.eq('subject_id', subjectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Query failed.' }, { status: 500 });
  return NextResponse.json(data);
}

const createSchema = z.object({
  subject_id: z.string().uuid(),
  name: z.string().min(2),
});

function slugify(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function POST(request: Request) {
  const caller = await getCurrentProfile();
  if (!caller || (caller.role !== 'admin' && caller.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid topic.' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('topics')
    .insert({ ...parsed.data, slug: slugify(parsed.data.name) })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Could not create topic.' }, { status: 500 });
  return NextResponse.json(data);
}
