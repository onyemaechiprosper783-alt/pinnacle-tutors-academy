import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const testimonialSchema = z.object({
  student_name: z.string().trim().min(1).max(120),
  exam_type: z.enum(['jamb', 'waec']),
  score: z.string().trim().min(1).max(50),
  year: z.number().int().min(2000).max(2100),
  message: z.string().trim().min(1).max(1000),
  is_published: z.boolean().default(true),
});

export async function GET() {
  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('testimonials')
      .select('*')
      .order('year', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('TESTIMONIAL GET ERROR:', error);

      return NextResponse.json(
        { error: 'Could not load testimonials.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      testimonials: data ?? [],
    });
  } catch (error) {
    console.error('TESTIMONIAL GET EXCEPTION:', error);

    return NextResponse.json(
      { error: 'Could not load testimonials.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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

    const parsed = testimonialSchema.safeParse(body);

    if (!parsed.success) {
      console.error(
        'TESTIMONIAL VALIDATION ERROR:',
        parsed.error.flatten()
      );

      return NextResponse.json(
        {
          error: 'Invalid testimonial information.',
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const testimonialData = {
      student_name: parsed.data.student_name,
      exam_type: parsed.data.exam_type,
      score: parsed.data.score,
      year: parsed.data.year,
      message: parsed.data.message,
      is_published: parsed.data.is_published,
    };

    const { data, error } = await admin
      .from('testimonials')
      .insert(testimonialData)
      .select('*')
      .single();

    if (error) {
      console.error('TESTIMONIAL INSERT ERROR:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });

      return NextResponse.json(
        {
          error:
            error.message ||
            'Could not save testimonial.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { testimonial: data },
      { status: 201 }
    );
  } catch (error) {
    console.error('TESTIMONIAL POST EXCEPTION:', error);

    return NextResponse.json(
      {
        error: 'Something went wrong while saving the testimonial.',
      },
      { status: 500 }
    );
  }
}
