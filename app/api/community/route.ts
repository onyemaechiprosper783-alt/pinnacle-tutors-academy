import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('community_settings').select('*').eq('id', 1).single();
  if (error) return NextResponse.json({ error: 'Query failed.' }, { status: 500 });
  return NextResponse.json(data);
}

const updateSchema = z.object({
  whatsapp_group_url: z.string().url().optional().or(z.literal('')),
  whatsapp_channel_url: z.string().url().optional().or(z.literal('')),
  telegram_url: z.string().url().optional().or(z.literal('')),
});

export async function PATCH(request: Request) {
  const caller = await getCurrentProfile();
  if (!caller || (caller.role !== 'admin' && caller.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid links.' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from('community_settings')
    .update({ ...parsed.data, updated_by: caller.id, updated_at: new Date().toISOString() })
    .eq('id', 1);

  if (error) return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
