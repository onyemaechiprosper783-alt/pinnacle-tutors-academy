import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';

const updateSchema = z.object({
  full_name: z.string().min(2).optional(),
  display_name: z.string().min(2).max(30).optional().or(z.literal('')),
  phone: z.string().optional(),
  school: z.string().optional(),
  exam_target: z.enum(['jamb', 'waec', 'both']).optional(),
});

// Uses the session-scoped client (not the admin client) so RLS enforces
// that a user can only ever update their own row, and the `role` column is
// separately protected by the "not their role" policy even if this route
// were ever changed to accept it.
export async function PATCH(request: Request) {
  const caller = await getCurrentProfile();
  if (!caller) return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid profile data.' }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update(parsed.data).eq('id', caller.id);

  if (error) return NextResponse.json({ error: 'Could not update profile.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
