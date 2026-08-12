import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/leaderboard?category=utme_challenge&limit=50
// Public: uses the admin client only to join profiles for display_name,
// and deliberately selects nothing else identifying (no email, no phone).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') ?? 'utme_challenge';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('leaderboard_entries')
    .select('id, score, time_used_seconds, created_at, student_id, profiles(display_name, full_name)')
    .eq('category', category)
    .order('score', { ascending: false })
    .order('time_used_seconds', { ascending: true })
    .limit(limit);

  if (error) return NextResponse.json({ error: 'Query failed.' }, { status: 500 });

  const ranked = (data ?? []).map((entry, i) => {
    const profile = entry.profiles as unknown as { display_name: string | null; full_name: string } | null;
    return {
      rank: i + 1,
      score: entry.score,
      time_used_seconds: entry.time_used_seconds,
      created_at: entry.created_at,
      // Fall back to first name + last initial if no display_name is set,
      // so full identity isn't exposed by default.
      name: profile?.display_name || anonymizeName(profile?.full_name),
    };
  });

  return NextResponse.json(ranked);
}

function anonymizeName(fullName?: string) {
  if (!fullName) return 'Anonymous Student';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
