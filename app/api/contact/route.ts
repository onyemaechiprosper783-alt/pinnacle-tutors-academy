import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(10, 'Please include a few more details.'),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Please check your details and try again.' },
      { status: 400 }
    );
  }

  // Uses the anon session client, not the service role — insert is allowed
  // for anyone per the "Anyone can submit a contact message" RLS policy,
  // but reading messages back still requires an admin session.
  const supabase = await createClient();
  const { error } = await supabase.from('contact_messages').insert(parsed.data);

  if (error) {
    return NextResponse.json({ error: 'Could not send your message. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
