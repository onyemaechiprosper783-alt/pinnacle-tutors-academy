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
  is_published: z
    .union([z.boolean(), z.string()])
    .transform((value) => {
      if (typeof value === 'boolean') return value;
      return value === 'true';
    }),
});

const PHOTO_BUCKET = 'testimonial-photos';

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
      console.error('TESTIMONIAL GET ERROR:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });

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
      {
        error: 'Could not load testimonials.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let uploadedPhotoPath: string | null = null;

  try {
    // Check admin permission
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

    // Read FormData because the admin page sends a photo
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

    const isPublished = String(
      formData.get('is_published') ?? 'true'
    );

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
          error: 'Invalid testimonial information.',
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Get photo from FormData
    const photo = formData.get('photo');

    let photoUrl: string | null = null;

    // Upload photo if one was selected
    if (photo instanceof File && photo.size > 0) {
      // Maximum 5MB
      if (photo.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          {
            error: 'Photo must be 5MB or smaller.',
          },
          { status: 400 }
        );
      }

      // Only allow images
      if (!photo.type.startsWith('image/')) {
        return NextResponse.json(
          {
            error: 'Please upload a valid image file.',
          },
          { status: 400 }
        );
      }

      // Get file extension
      const originalName = photo.name || '';
      const extension =
        originalName.split('.').pop()?.toLowerCase() || 'jpg';

      // Create a unique filename
      const fileName = `${crypto.randomUUID()}.${extension}`;

      uploadedPhotoPath = `testimonials/${fileName}`;

      const { error: uploadError } = await admin.storage
        .from(PHOTO_BUCKET)
        .upload(
          uploadedPhotoPath,
          photo,
          {
            contentType: photo.type,
            upsert: false,
          }
        );

      if (uploadError) {
        console.error('TESTIMONIAL PHOTO UPLOAD ERROR:', {
          message: uploadError.message,
          name: uploadError.name,
        });

        return NextResponse.json(
          {
            error:
              uploadError.message ||
              'Could not upload student photo.',
          },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: publicUrlData } = admin.storage
        .from(PHOTO_BUCKET)
        .getPublicUrl(uploadedPhotoPath);

      photoUrl = publicUrlData.publicUrl;
    }

    // Save testimonial
    const testimonialData = {
      student_name: parsed.data.student_name,
      exam_type: parsed.data.exam_type,
      score: parsed.data.score,
      year: parsed.data.year,
      message: parsed.data.message,
      photo_url: photoUrl,
      is_published: parsed.data.is_published,
    };

    const { data, error } = await admin
      .schema('public')
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

      // Remove uploaded photo if database insert failed
      if (uploadedPhotoPath) {
        await admin.storage
          .from(PHOTO_BUCKET)
          .remove([uploadedPhotoPath]);
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
        testimonial: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('TESTIMONIAL POST EXCEPTION:', error);

    // Clean up photo if something unexpected happened
    if (uploadedPhotoPath) {
      try {
        const admin = createAdminClient();

        await admin.storage
          .from(PHOTO_BUCKET)
          .remove([uploadedPhotoPath]);
      } catch (cleanupError) {
        console.error(
          'TESTIMONIAL PHOTO CLEANUP ERROR:',
          cleanupError
        );
      }
    }

    return NextResponse.json(
      {
        error:
          'Something went wrong while saving the testimonial.',
      },
      { status: 500 }
    );
  }
}
