import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const testimonialSchema = z.object({
  student_name: z.string().min(1).max(120),
  exam_type: z.enum(['jamb', 'waec']),
  score: z.string().min(1).max(50),
  year: z.number().int().min(2000).max(2100),
  message: z.string().min(1).max(1000),
  is_published: z.boolean().default(true),
});

export async function GET() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('testimonials')
    .select('*')
    .order('year', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: 'Could not load testimonials.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ testimonials: data ?? [] });
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
  const parsed = testimonialSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid testimonial information.' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('testimonials')
    .insert(parsed.data)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Could not save testimonial.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ testimonial: data }, { status: 201 });
    }
