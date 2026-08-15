import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const testimonialSchema = z.object({
  student_name: z.string().trim().min(1).max(120),
  exam_type: z.enum(['jamb', 'waec']),
  score: z.string().trim().min(1).max(50),
  year: z.coerce.number().int().min(2000).max(2100),
  message: z.string().trim().min(1).max(1000),
  is_published: z.boolean().default(true),
});

async function requireAdmin() {
  const profile = await getCurrentProfile();

  if (
    !profile ||
    (profile.role !== 'admin' && profile.role !== 'super_admin')
  ) {
    return null;
  }

  return profile;
}

/* =========================
   GET TESTIMONIALS
========================= */

export async function GET() {
  try {
    const caller = await requireAdmin();

    if (!caller) {
      return NextResponse.json(
        { error: 'Not authorized.' },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const { data, error } = await admin
      .from('testimonials')
      .select(
        'id, student_name, exam_type, score, year, message, photo_url, is_published, created_at'
      )
      .order('year', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('TESTIMONIAL GET ERROR:', error);

      return NextResponse.json(
        {
          error: error.message || 'Could not load testimonials.',
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
      { error: 'Could not load testimonials.' },
      { status: 500 }
    );
  }
}

/* =========================
   CREATE TESTIMONIAL
========================= */

export async function POST(request: Request) {
  let uploadedPath: string | null = null;

  try {
    const caller = await requireAdmin();

    if (!caller) {
      return NextResponse.json(
        { error: 'Not authorized.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();

    const studentName = String(
      formData.get('student_name') ?? ''
    );

    const examType = String(
      formData.get('exam_type') ?? 'jamb'
    );

    const score = String(
      formData.get('score') ?? ''
    );

    const year = String(
      formData.get('year') ?? ''
    );

    const message = String(
      formData.get('message') ?? ''
    );

    const isPublished =
      String(formData.get('is_published') ?? 'true') === 'true';

    const parsed = testimonialSchema.safeParse({
      student_name: studentName,
      exam_type: examType,
      score,
      year,
      message,
      is_published: isPublished,
    });

    if (!parsed.success) {
      console.error(
        'TESTIMONIAL VALIDATION ERROR:',
        parsed.error.flatten()
      );

      return NextResponse.json(
        {
          error: 'Please check the testimonial information and try again.',
        },
        { status: 400 }
      );
    }

    const photo = formData.get('photo');

    let photoUrl: string | null = null;

    if (photo instanceof File && photo.size > 0) {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
      ];

      if (!allowedTypes.includes(photo.type)) {
        return NextResponse.json(
          {
            error: 'Photo must be JPG, PNG, or WebP.',
          },
          { status: 400 }
        );
      }

      const maxSize = 5 * 1024 * 1024;

      if (photo.size > maxSize) {
        return NextResponse.json(
          {
            error: 'Photo must be 5MB or smaller.',
          },
          { status: 400 }
        );
      }

      const admin = createAdminClient();

      const extension =
        photo.type === 'image/png'
          ? 'png'
          : photo.type === 'image/webp'
            ? 'webp'
            : 'jpg';

      const filePath = `students/${crypto.randomUUID()}.${extension}`;

      const fileBuffer = Buffer.from(
        await photo.arrayBuffer()
      );

      const { error: uploadError } = await admin.storage
        .from('testimonial-photos')
        .upload(filePath, fileBuffer, {
          contentType: photo.type,
          upsert: false,
        });

      if (uploadError) {
        console.error(
          'TESTIMONIAL PHOTO UPLOAD ERROR:',
          uploadError
        );

        return NextResponse.json(
          {
            error: 'Could not upload the student photo.',
          },
          { status: 500 }
        );
      }

      uploadedPath = filePath;

      const { data: publicUrlData } = admin.storage
        .from('testimonial-photos')
        .getPublicUrl(filePath);

      photoUrl = publicUrlData.publicUrl;
    }

    const admin = createAdminClient();

    const { data, error } = await admin
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
      .select(
        'id, student_name, exam_type, score, year, message, photo_url, is_published, created_at'
      )
      .single();

    if (error) {
      console.error('TESTIMONIAL INSERT ERROR:', error);

      // Remove uploaded photo if database insertion fails.
      if (uploadedPath) {
        await admin.storage
          .from('testimonial-photos')
          .remove([uploadedPath]);
      }

      return NextResponse.json(
        {
          error: error.message || 'Could not save testimonial.',
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
        error: 'Something went wrong while saving the testimonial.',
      },
      { status: 500 }
    );
  }
}
