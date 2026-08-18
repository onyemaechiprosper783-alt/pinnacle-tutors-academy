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

const updateSchema = z.object({
  round_id: z.string().uuid(),
  is_active: z.boolean(),
});

export async function GET() {
  const caller = await getCurrentProfile();

  if (
    !caller ||
    (caller.role !== 'admin' &&
      caller.role !== 'super_admin')
  ) {
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
      activated_at,
      results_released,
      created_by,
      created_at
    `)
    .order('created_at', {
      ascending: false,
    });

  if (error) {
    console.error(
      'Challenge rounds GET error:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Could not load challenge rounds.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(
  request: Request
) {
  const caller = await getCurrentProfile();

  if (
    !caller ||
    (caller.role !== 'admin' &&
      caller.role !== 'super_admin')
  ) {
    return NextResponse.json(
      { error: 'Not authorized.' },
      { status: 403 }
    );
  }

  const body = await request
    .json()
    .catch(() => null);

  const parsed =
    createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          'Invalid challenge round.',
        details:
          parsed.error.flatten(),
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
    const openDate =
      new Date(opens_at);

    const closeDate =
      new Date(closes_at);

    if (
      Number.isNaN(
        openDate.getTime()
      ) ||
      Number.isNaN(
        closeDate.getTime()
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid opening or closing date.',
        },
        { status: 400 }
      );
    }

    if (closeDate <= openDate) {
      return NextResponse.json(
        {
          error:
            'Closing time must be after opening time.',
        },
        { status: 400 }
      );
    }
  }

  const admin =
    createAdminClient();

  /*
   * If the admin creates the round
   * as active, the challenge clock
   * starts immediately.
   */
  const activatedAt = is_active
    ? new Date().toISOString()
    : null;

  const { data, error } =
    await admin
      .from('challenge_rounds')
      .insert({
        title,
        difficulty,
        opens_at:
          opens_at || null,
        closes_at:
          closes_at || null,

        is_active,

        activated_at:
          activatedAt,

        created_by:
          caller.id,

        // UTME Challenge
        // = 180 questions
        question_count: 180,

        // UTME Challenge
        // = 120 minutes
        duration_seconds:
          120 * 60,

        results_released:
          false,
      })
      .select()
      .single();

  if (error) {
    console.error(
      'Challenge round POST error:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Could not create challenge round.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    data,
    { status: 201 }
  );
}

/*
 * =====================================================
 * ACTIVATE / DEACTIVATE CHALLENGE
 * =====================================================
 *
 * When the admin activates a round:
 *
 * activated_at = NOW()
 *
 * This starts the GLOBAL 120-minute challenge clock.
 *
 * Example:
 *
 * Admin activates at 10:00
 *
 * Student starts at 10:00
 * -> 120 minutes
 *
 * Student starts at 10:30
 * -> 90 minutes
 *
 * Student starts at 11:00
 * -> 60 minutes
 */
export async function PATCH(
  request: Request
) {
  const caller =
    await getCurrentProfile();

  if (
    !caller ||
    (caller.role !== 'admin' &&
      caller.role !== 'super_admin')
  ) {
    return NextResponse.json(
      { error: 'Not authorized.' },
      { status: 403 }
    );
  }

  const body = await request
    .json()
    .catch(() => null);

  const parsed =
    updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          'Invalid challenge activation request.',
      },
      { status: 400 }
    );
  }

  const {
    round_id,
    is_active,
  } = parsed.data;

  const admin =
    createAdminClient();

  /*
   * Activating a round for the
   * first time starts the clock.
   */
  if (is_active) {
    const { data: round, error } =
      await admin
        .from('challenge_rounds')
        .select(`
          id,
          is_active,
          activated_at
        `)
        .eq('id', round_id)
        .single();

    if (error || !round) {
      return NextResponse.json(
        {
          error:
            'Challenge round not found.',
        },
        { status: 404 }
      );
    }

    /*
     * Do not reset the clock if the
     * round is already active.
     */
    if (round.is_active) {
      return NextResponse.json({
        success: true,
        is_active: true,
        activated_at:
          round.activated_at,
      });
    }

    const {
      data,
      error: updateError,
    } = await admin
      .from('challenge_rounds')
      .update({
        is_active: true,

        activated_at:
          new Date().toISOString(),
      })
      .eq('id', round_id)
      .select()
      .single();

    if (updateError) {
      console.error(
        'Challenge activation error:',
        updateError
      );

      return NextResponse.json(
        {
          error:
            'Could not activate challenge.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      is_active:
        data.is_active,
      activated_at:
        data.activated_at,
    });
  }

  /*
   * Deactivating the round does NOT
   * erase activated_at.
   */
  const {
    data,
    error,
  } = await admin
    .from('challenge_rounds')
    .update({
      is_active: false,
    })
    .eq('id', round_id)
    .select()
    .single();

  if (error) {
    console.error(
      'Challenge deactivation error:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Could not deactivate challenge.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    is_active:
      data.is_active,
    activated_at:
      data.activated_at,
  });
}
