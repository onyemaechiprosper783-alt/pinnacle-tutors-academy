import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('subjects').select('*').order('name');
  if (error) return NextResponse.json({ error: 'Query failed.' }, { status: 500 });
  return NextResponse.json(data);
}

const createSchema = z.object({
  name: z.string().min(2),
  exam_types: z.array(z.enum(['jamb', 'waec'])).default([]),
  icon: z.string().optional(),
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
  if (!parsed.success) return NextResponse.json({ error: 'Invalid subject.' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('subjects')
    .insert({ ...parsed.data, slug: slugify(parsed.data.name) })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Could not create subject.' }, { status: 500 });
  return NextResponse.json(data);
}
