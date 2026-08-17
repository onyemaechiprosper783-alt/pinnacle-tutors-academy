import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const createSchema = z.object({
  title: z.string().min(2).max(100),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  opens_at: z.string().nullable().optional(),
  closes_at: z.string().nullable().optional(),
  is_active: z.boolean().default(false),
});

export async function GET() {
  const caller = await getCurrentProfile();

  if (!caller || (caller.role !== 'admin' && caller.role !== 'super_admin')) {
    return NextResponse.json(
      { error: 'Not authorized.' },
      { status: 403 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('challenge_rounds')
    .select(`
      id,
      title,
      difficulty,
      question_count,
      duration_seconds,
      opens_at,
      closes_at,
      is_active,
      created_by,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Challenge rounds GET error:', error);

    return NextResponse.json(
      { error: 'Could not load challenge rounds.' },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
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

  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid challenge round.',
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const {
    title,
    difficulty,
    opens_at,
    closes_at,
    is_active,
  } = parsed.data;

  if (opens_at && closes_at) {
    const openDate = new Date(opens_at);
    const closeDate = new Date(closes_at);

    if (
      Number.isNaN(openDate.getTime()) ||
      Number.isNaN(closeDate.getTime())
    ) {
      return NextResponse.json(
        { error: 'Invalid opening or closing date.' },
        { status: 400 }
      );
    }

    if (closeDate <= openDate) {
      return NextResponse.json(
        { error: 'Closing time must be after opening time.' },
        { status: 400 }
      );
    }
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('challenge_rounds')
    .insert({
      title,
      difficulty,
      opens_at: opens_at || null,
      closes_at: closes_at || null,
      is_active,
      created_by: caller.id,

      // UTME Challenge = 180 questions
      question_count: 180,

      // UTME Challenge = 120 minutes
      duration_seconds: 120 * 60,
    })
    .select()
    .single();

  if (error) {
    console.error('Challenge round POST error:', error);

    return NextResponse.json(
      { error: 'Could not create challenge round.' },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
