import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const createKeySchema = z.object({
  key_type: z.enum(['product_key', 'activation_key']),
  notes: z.string().max(500).optional().nullable(),
});

function generateKey(prefix: string) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function segment(length: number) {
    let value = '';
    for (let i = 0; i < length; i++) {
      value += chars[Math.floor(Math.random() * chars.length)];
    }
    return value;
  }

  return `${prefix}-${segment(4)}-${segment(4)}-${segment(4)}`;
}

export async function POST(request: Request) {
  const caller = await getCurrentProfile();

  if (!caller || (caller.role !== 'admin' && caller.role !== 'super_admin')) {
    return NextResponse.json(
      { error: 'Not authorized.' },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createKeySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request.' },
      { status: 400 }
    );
  }

  const { key_type, notes } = parsed.data;

  const admin = createAdminClient();

  // Product Keys expire at the end of September 30, 2026.
  const validFrom = new Date('2026-08-14T00:00:00.000Z');
  const validUntil =
    key_type === 'product_key'
      ? new Date('2026-09-30T23:59:59.999Z')
      : null;

  // Try several times in the extremely unlikely event of a duplicate key.
  for (let attempt = 0; attempt < 5; attempt++) {
    const keyCode = generateKey(
      key_type === 'product_key' ? 'PIN-PROD' : 'PIN-ACT'
    );

    const { data, error } = await admin
      .from('access_keys')
      .insert({
        key_code: keyCode,
        key_type,
        status: 'unused',
        is_active: true,
        valid_from: validFrom.toISOString(),
        valid_until: validUntil?.toISOString() ?? null,
        used_by: null,
        used_at: null,
        created_by: caller.id,
        notes: notes ?? null,
      })
      .select(
        'id, key_code, key_type, status, is_active, valid_from, valid_until, used_by, used_at, created_at, created_by, notes, updated_at'
      )
      .single();

    if (!error && data) {
      return NextResponse.json({
        success: true,
        key: data,
      });
    }

    // PostgreSQL unique violation — try another generated key.
    if (error?.code !== '23505') {
      console.error('Access key creation failed:', error);
      return NextResponse.json(
        { error: 'Could not create access key.' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: 'Could not generate a unique key. Please try again.' },
    { status: 500 }
  );
}
