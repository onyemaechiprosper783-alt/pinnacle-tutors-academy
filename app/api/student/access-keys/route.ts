import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const profile = await getCurrentProfile();

    if (!profile) {
      return NextResponse.json(
        { error: 'Not authenticated.' },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    const { data, error } = await admin
      .from('student_access')
      .select(`
        access_type,
        profile_id,
        access_key_id,
        granted_at,
        expires_at,
        updated_at,
        access_keys (
          key_code,
          key_type,
          status,
          is_active,
          valid_from,
          valid_until
        )
      `)
      .eq('profile_id', profile.id)
      .order('granted_at', { ascending: false });

    if (error) {
      console.error('Student access key query failed:', error);

      return NextResponse.json(
        { error: 'Could not load your access keys.' },
        { status: 500 }
      );
    }

    const now = Date.now();

    const keys = (data ?? [])
      .map((access: any) => {
        const key = Array.isArray(access.access_keys)
          ? access.access_keys[0]
          : access.access_keys;

        if (!key) return null;

        const isActivation =
          access.access_type === 'activation_key';

        const isProduct =
          access.access_type === 'product_key';

        const notExpired =
          !access.expires_at ||
          new Date(access.expires_at).getTime() > now;

        const active =
          key.is_active === true &&
          key.status === 'used' &&
          (isActivation || notExpired);

        if (!active) return null;

        return {
          access_type: access.access_type,
          key_code: key.key_code,
          granted_at: access.granted_at,
          expires_at: isActivation ? null : access.expires_at,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      keys,
    });
  } catch (error) {
    console.error('Student access keys API error:', error);

    return NextResponse.json(
      { error: 'Could not load your access keys.' },
      { status: 500 }
    );
  }
}
