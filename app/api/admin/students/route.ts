import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const caller = await getCurrentProfile();
  if (!caller || (caller.role !== 'admin' && caller.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');

  const admin = createAdminClient();
  let query = admin
    .from('profiles')
    .select('id, full_name, phone, role, school, exam_target, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (search) query = query.ilike('full_name', `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Query failed.' }, { status: 500 });
  return NextResponse.json(data);
}
