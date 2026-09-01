import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProfile, createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const updateSchema = z.object({
  is_published: z.boolean().optional(),
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await requireAdmin();

  if (!caller) {
    return NextResponse.json(
      { error: 'Not authorized.' },
      { status: 403 }
    );
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid testimonial update.' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .schema('public')
      .from('testimonials')
      .update(parsed.data)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      console.error('TESTIMONIAL UPDATE ERROR:', error);
      return NextResponse.json(
        { error: error?.message || 'Could not update testimonial.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ testimonial: data });
  } catch (error) {
    console.error('TESTIMONIAL UPDATE EXCEPTION:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update testimonial.' },
      { status: 500 }
    );
  }
}

function getStoragePath(photoUrl: string | null) {
  if (!photoUrl) return null;

  try {
    const url = new URL(photoUrl);
    const marker = '/storage/v1/object/public/testimonial-photos/';
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    return decodeURIComponent(
      url.pathname.slice(markerIndex + marker.length)
    );
  } catch {
    return null;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await requireAdmin();

  if (!caller) {
    return NextResponse.json(
      { error: 'Not authorized.' },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    // Use the authenticated user's session for the database operation.
    // The testimonials table has an RLS policy allowing only admins to delete.
    const supabase = await createClient();

    const { data: testimonial, error: fetchError } = await supabase
      .schema('public')
      .from('testimonials')
      .select('id, photo_url')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('TESTIMONIAL DELETE FETCH ERROR:', fetchError);
      return NextResponse.json(
        { error: fetchError.message || 'Could not find testimonial.' },
        { status: 500 }
      );
    }

    if (!testimonial) {
      return NextResponse.json(
        { error: 'Testimonial not found.' },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .schema('public')
      .from('testimonials')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('TESTIMONIAL DELETE DB ERROR:', deleteError);
      return NextResponse.json(
        {
          error: deleteError.message || 'Could not delete testimonial.',
          code: deleteError.code,
          details: deleteError.details,
          hint: deleteError.hint,
        },
        { status: 500 }
      );
    }

    // Storage cleanup is best-effort and cannot make the database deletion fail.
    if (testimonial.photo_url) {
      const photoPath = getStoragePath(testimonial.photo_url);

      if (photoPath) {
        try {
          const admin = createAdminClient();
          const { error: storageError } = await admin.storage
            .from('testimonial-photos')
            .remove([photoPath]);

          if (storageError) {
            console.error('TESTIMONIAL PHOTO CLEANUP ERROR:', storageError);
          }
        } catch (storageException) {
          console.error('TESTIMONIAL PHOTO CLEANUP EXCEPTION:', storageException);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('TESTIMONIAL DELETE EXCEPTION:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not delete testimonial.',
      },
      { status: 500 }
    );
  }
}
