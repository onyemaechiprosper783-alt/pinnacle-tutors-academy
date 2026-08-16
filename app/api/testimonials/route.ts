import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const PHOTO_BUCKET = 'testimonial-photos';

const testimonialSchema = z.object({
  student_name: z.string().trim().min(1).max(120),
  exam_type: z.enum(['jamb', 'waec']),
  score: z.string().trim().min(1).max(50),
  year: z.coerce.number().int().min(2000).max(2100),
  message: z.string().trim().min(1).max(1000),
  is_published: z
    .union([z.boolean(), z.string()])
    .transform((value) =>
      typeof value === 'boolean' ? value : value === 'true'
    ),
});

export async function GET() {
  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .schema('public')
      .from('testimonials')
      .select('*')
      .order('year', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('TESTIMONIAL GET ERROR:', error);

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      testimonials: data ?? [],
    });
  } catch (error) {
    console.error('TESTIMONIAL GET EXCEPTION:', error);

    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : 'Could not load testimonials.',
      },
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

    const formData = await request.formData();

    const parsed = testimonialSchema.safeParse({
      student_name: String(formData.get('student_name') ?? ''),
      exam_type: String(formData.get('exam_type') ?? ''),
      score: String(formData.get('score') ?? ''),
      year: String(formData.get('year') ?? ''),
      message: String(formData.get('message') ?? ''),
      is_published: String(
        formData.get('is_published') ?? 'true'
      ),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid testimonial information.',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const photo = formData.get('photo');

    let photoUrl: string | null = null;

    if (photo instanceof File && photo.size > 0) {
      if (photo.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          {
            error: 'Photo must be 5MB or smaller.',
          },
          { status: 400 }
        );
      }

      if (!photo.type.startsWith('image/')) {
        return NextResponse.json(
          {
            error: 'Please upload a valid image file.',
          },
          { status: 400 }
        );
      }

      const extension =
        photo.name.split('.').pop()?.toLowerCase() || 'jpg';

      const filePath =
        `testimonials/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await admin.storage
        .from(PHOTO_BUCKET)
        .upload(filePath, photo, {
          contentType: photo.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('PHOTO UPLOAD ERROR:', uploadError);

        return NextResponse.json(
          {
            error: `Photo upload failed: ${uploadError.message}`,
            details: uploadError,
          },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = admin.storage
        .from(PHOTO_BUCKET)
        .getPublicUrl(filePath);

      photoUrl = publicUrlData.publicUrl;
    }

    const { data, error } = await admin
      .schema('public')
      .from('testimonials')
      .insert({
        student_name: parsed.data.student_name,
        exam_type: parsed.data.exam_type,
        score: parsed.data.score,
        year: parsed.data.year,
        message: parsed.data.message,
        is_published: parsed.data.is_published,
        photo_url: photoUrl,
      })
      .select('*')
      .single();

    if (error) {
      console.error('TESTIMONIAL INSERT ERROR:', error);

      return NextResponse.json(
        {
          error: `Testimonial database save failed: ${error.message}`,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        testimonial: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('TESTIMONIAL POST EXCEPTION:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unknown server error.',
      },
      { status: 500 }
    );
  }
}
