import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseBulkImport, dedupeHash } from '@/lib/importer/parser';
import type { ImportPreview } from '@/types/database';

const previewSchema = z.object({ raw_text: z.string().min(1) });

// POST /api/bulk-import/preview
// Read-only: parses the pasted block and flags likely duplicates. Nothing
// is written to `questions` here — that only happens in /commit, and only
// for rows the admin explicitly confirms.
export async function POST(request: Request) {
  const caller = await getCurrentProfile();
  if (!caller || (caller.role !== 'admin' && caller.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { valid, invalid, totalDetected } = parseBulkImport(parsed.data.raw_text);

  const admin = createAdminClient();
  const hashes = valid.map((q) => dedupeHash(q.question_text));

  const { data: existingMatches } = await admin
    .from('questions')
    .select('id, dedupe_hash')
    .in('dedupe_hash', hashes);

  const existingByHash = new Map((existingMatches ?? []).map((r) => [r.dedupe_hash as string, r.id as string]));

  const duplicates: ImportPreview['duplicates'] = [];
  const uniqueValid: typeof valid = [];

  valid.forEach((q, i) => {
    const existingId = existingByHash.get(hashes[i]);
    if (existingId) {
      duplicates.push({ question: q, existing_question_id: existingId });
    } else {
      uniqueValid.push(q);
    }
  });

  const { data: batch, error: batchError } = await admin
    .from('import_batches')
    .insert({
      admin_id: caller.id,
      raw_text: parsed.data.raw_text,
      parsed_json: { valid, invalid, duplicates },
      total_detected: totalDetected,
      valid_count: valid.length,
      invalid_count: invalid.length,
      duplicate_count: duplicates.length,
      status: 'previewing',
    })
    .select('id')
    .single();

  if (batchError) {
    return NextResponse.json({ error: 'Could not save import batch.' }, { status: 500 });
  }

  const preview: ImportPreview & { batch_id: string } = {
    batch_id: batch.id,
    total_detected: totalDetected,
    valid: uniqueValid,
    invalid,
    duplicates,
  };

  return NextResponse.json(preview);
}
