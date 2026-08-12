import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const promoteSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['student', 'admin']), // only super_admin can grant 'admin'; nobody can grant 'super_admin' here
});

// POST /api/admin/promote
// Requires the CALLER to already be an admin/super_admin — checked from
// their own session via getCurrentProfile(), never from anything the
// request body claims about itself.
export async function POST(request: Request) {
  const caller = await getCurrentProfile();

  if (!caller || (caller.role !== 'admin' && caller.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = promoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  // Only a super_admin can grant admin rights; regular admins can only
  // demote back to student (e.g. offboarding).
  if (parsed.data.role === 'admin' && caller.role !== 'super_admin') {
    return NextResponse.json(
      { error: 'Only a super admin can grant admin access.' },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({ role: parsed.data.role })
    .eq('id', parsed.data.user_id);

  if (error) {
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
