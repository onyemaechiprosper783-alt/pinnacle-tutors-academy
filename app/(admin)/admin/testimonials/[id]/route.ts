import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const updateSchema = z.object({
  is_published: z.boolean().optional(),
});

async function requireAdmin() {
  const caller = await getCurrentProfile();

  if (
    !caller ||
    (caller.role !== 'admin' && caller.role !== 'super_admin')
  ) {
    return null;
  }

  return caller;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await requireAdmin();

  if (!caller) {
    return NextResponse.json(
      { error: 'Not authorized.' },
      { status: 403 }
    );
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid testimonial update.' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('testimonials')
    .update(parsed.data)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'Could not update testimonial.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ testimonial: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await requireAdmin();

  if (!caller) {
    return NextResponse.json(
      { error: 'Not authorized.' },
      { status: 403 }
    );
  }

  const { id } = await params;

  const admin = createAdminClient();

  const { error } = await admin
    .from('testimonials')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json(
      { error: 'Could not delete testimonial.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
