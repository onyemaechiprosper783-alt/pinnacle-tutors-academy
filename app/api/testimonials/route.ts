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
  const caller = await getCurrentProfile();

  if (
    !caller ||
    (caller.role !== 'admin' && caller.role !== 'super_admin')
  ) {
    return null;
  }

  return caller;
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
      .schema('public')
      .from('testimonials')
      .select('*')
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
  try {
    const caller = await requireAdmin();

    if (!caller) {
      return NextResponse.json(
        { error: 'Not authorized.' },
        { status: 403 }
      );
    }

    /*
      The admin page sends FormData because it contains
      both text fields and an optional photo.
    */
    const formData = await request.formData();

    const studentName = String(
      formData.get('student_name') ?? ''
    );

    const examType = String(
      formData.get('exam_type') ?? ''
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

    const isPublishedValue = String(
      formData.get('is_published') ?? 'true'
    );

    const parsed = testimonialSchema.safeParse({
      student_name: studentName,
      exam_type: examType,
      score,
      year,
      message,
      is_published: isPublishedValue === 'true',
    });

    if (!parsed.success) {
      console.error(
        'TESTIMONIAL VALIDATION ERROR:',
        parsed.error.flatten()
      );

      return NextResponse.json(
        {
          error: 'Invalid testimonial information.',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    let photoUrl: string | null = null;

    /* =========================
       PHOTO UPLOAD
    ========================= */

    const photo = formData.get('photo');

    if (photo instanceof File && photo.size > 0) {
      if (!photo.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'The uploaded file must be an image.' },
          { status: 400 }
        );
      }

      if (photo.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Photo must be 5MB or smaller.' },
          { status: 400 }
        );
      }

      const extension =
        photo.name.split('.').pop()?.toLowerCase() || 'jpg';

      const allowedExtensions = [
        'jpg',
        'jpeg',
        'png',
        'webp',
      ];

      if (!allowedExtensions.includes(extension)) {
        return NextResponse.json(
          {
            error:
              'Only JPG, JPEG, PNG and WebP images are allowed.',
          },
          { status: 400 }
        );
      }

      const fileName = `${crypto.randomUUID()}.${extension}`;

      const filePath = `testimonials/${fileName}`;

      const fileBuffer = Buffer.from(
        await photo.arrayBuffer()
      );

      const { error: uploadError } = await admin.storage
        .from('testimonials')
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
            error:
              'Could not upload the student photo.',
            details: uploadError.message,
          },
          { status: 500 }
        );
      }

      const { data: publicUrlData } =
        admin.storage
          .from('testimonials')
          .getPublicUrl(filePath);

      photoUrl = publicUrlData.publicUrl;
    }

    /* =========================
       SAVE TESTIMONIAL
    ========================= */

    const testimonialData = {
      student_name: parsed.data.student_name,
      exam_type: parsed.data.exam_type,
      score: parsed.data.score,
      year: parsed.data.year,
      message: parsed.data.message,
      is_published: parsed.data.is_published,
      photo_url: photoUrl,
    };

    const { data, error } = await admin
      .schema('public')
      .from('testimonials')
      .insert(testimonialData)
      .select('*')
      .single();

    if (error) {
      console.error(
        'TESTIMONIAL INSERT ERROR:',
        error
      );

      /*
        If the database insert fails after the photo
        was uploaded, remove the photo so we don't
        leave an unused file in Storage.
      */
      if (photoUrl) {
        const urlParts = photoUrl.split(
          '/storage/v1/object/public/testimonials/'
        );

        if (urlParts[1]) {
          await admin.storage
            .from('testimonials')
            .remove([urlParts[1]]);
        }
      }

      return NextResponse.json(
        {
          error:
            error.message ||
            'Could not save testimonial.',
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
    console.error(
      'TESTIMONIAL POST EXCEPTION:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Something went wrong while saving the testimonial.',
      },
      { status: 500 }
    );
  }
}
