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

/*
 * GET /api/admin/access-keys
 *
 * Returns all access keys and, when a key has been used,
 * the name of the student who used it.
 */
export async function GET() {
  const caller = await getCurrentProfile();

  if (
    !caller ||
    (caller.role !== 'admin' && caller.role !== 'super_admin')
  ) {
    return NextResponse.json(
      { error: 'Not authorized.' },
      { status: 403 }
    );
  }

  const admin = createAdminClient();

  const { data: keys, error } = await admin
    .from('access_keys')
    .select(
      'id, key_code, key_type, status, is_active, valid_from, valid_until, used_by, used_at, created_at, created_by, notes, updated_at'
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Access key listing failed:', error);

    return NextResponse.json(
      { error: 'Could not load access keys.' },
      { status: 500 }
    );
  }

  const usedUserIds = Array.from(
    new Set(
      (keys ?? [])
        .map((key) => key.used_by)
        .filter((id): id is string => Boolean(id))
    )
  );

  let students: Record<string, { full_name: string | null; phone: string | null }> =
    {};

  if (usedUserIds.length > 0) {
    const { data: profiles, error: profilesError } = await admin
      .from('profiles')
      .select('id, full_name, phone')
      .in('id', usedUserIds);

    if (profilesError) {
      console.error('Used-key student lookup failed:', profilesError);
    } else {
      students = Object.fromEntries(
        (profiles ?? []).map((profile) => [
          profile.id,
          {
            full_name: profile.full_name,
            phone: profile.phone,
          },
        ])
      );
    }
  }

  const result = (keys ?? []).map((key) => ({
    ...key,
    used_by_student: key.used_by
      ? students[key.used_by] ?? {
          full_name: 'Unknown student',
          phone: null,
        }
      : null,
  }));

  return NextResponse.json(result);
}

/*
 * POST /api/admin/access-keys
 *
 * Existing key-generation system.
 */
export async function POST(request: Request) {
  const caller = await getCurrentProfile();

  if (
    !caller ||
    (caller.role !== 'admin' && caller.role !== 'super_admin')
  ) {
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

  const validFrom = new Date('2026-08-14T00:00:00.000Z');

  const validUntil =
    key_type === 'product_key'
      ? new Date('2026-09-30T23:59:59.999Z')
      : null;

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
