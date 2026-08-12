import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { bootstrapAdminSchema } from '@/lib/validators/auth';

// POST /api/admin/bootstrap
// Body: { secret: string, email: string }
//
// How this stays safe:
// 1. Requires ADMIN_BOOTSTRAP_SECRET, a server-only env var never shipped
//    to the client and never guessable from the UI (there is no "become
//    admin" button anywhere in the app).
// 2. The target account must already exist as a normal registered student —
//    this endpoint promotes, it never creates an account itself.
// 3. It self-disables: once ANY profile has role = 'super_admin', this
//    route refuses to run again, even with the correct secret. Rotate
//    ADMIN_BOOTSTRAP_SECRET (or remove it from your env) after first use
//    as a second layer of defense.
// 4. All subsequent admin creation must go through an authenticated admin
//    using /api/admin/promote (checked against the caller's own session
//    role, not this secret).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bootstrapAdminSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { secret, email } = parsed.data;

  if (!process.env.ADMIN_BOOTSTRAP_SECRET || secret !== process.env.ADMIN_BOOTSTRAP_SECRET) {
    // Deliberately vague — don't reveal whether the secret was close.
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const admin = createAdminClient();

  const { count: existingAdmins } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'super_admin');

  if (existingAdmins && existingAdmins > 0) {
    return NextResponse.json(
      { error: 'An admin account already exists. Bootstrap is disabled.' },
      { status: 403 }
    );
  }

  const { data: users, error: lookupError } = await admin.auth.admin.listUsers();
  if (lookupError) {
    return NextResponse.json({ error: 'Lookup failed.' }, { status: 500 });
  }

  const targetUser = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!targetUser) {
    return NextResponse.json(
      { error: 'No registered account found with that email. Register first, then bootstrap.' },
      { status: 404 }
    );
  }

  const { error: updateError } = await admin
    .from('profiles')
    .update({ role: 'super_admin' })
    .eq('id', targetUser.id);

  if (updateError) {
    return NextResponse.json({ error: 'Could not promote account.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: `${email} is now a super_admin.` });
}
