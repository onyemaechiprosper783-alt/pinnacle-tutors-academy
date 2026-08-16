import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dedupeHash } from '@/lib/importer/parser';
import type { ParsedQuestion } from '@/types/database';

const commitSchema = z.object({
  batch_id: z.string().uuid(),
  questions: z.array(
    z.object({
      question_text: z.string().min(1),
      option_a: z.string().min(1),
      option_b: z.string().min(1),
      option_c: z.string().min(1),
      option_d: z.string().min(1),
      correct_answer: z.enum(['A', 'B', 'C', 'D']),
      explanation: z.string().optional(),
      subject: z.string().min(1),
      topic: z.string().optional(),
      difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
      exam_type: z.enum(['jamb', 'waec', 'utme', 'general']).optional(),
      year: z.number().optional(),
      passage_text: z.string().optional(),
      modes: z.array(z.string()).optional(),
    })
  ).min(1),
});

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
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
  const parsed = commitSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid request.',
        details: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { batch_id, questions } = parsed.data;

  const subjectCache = new Map<string, string>();
  const topicCache = new Map<string, string>();
  const passageCache = new Map<string, string>();

  async function resolveSubjectId(name: string): Promise<string> {
    const key = name.trim().toLowerCase();

    if (subjectCache.has(key)) {
      return subjectCache.get(key)!;
    }

    const { data: existing, error: lookupError } = await admin
      .from('subjects')
      .select('id')
      .ilike('name', name.trim())
      .maybeSingle();

    if (lookupError) {
      throw new Error(
        `Could not find subject "${name}": ${lookupError.message}`
      );
    }

    if (existing) {
      subjectCache.set(key, existing.id);
      return existing.id;
    }

    const { data: created, error } = await admin
      .from('subjects')
      .insert({
        name: name.trim(),
        slug: slugify(name),
      })
      .select('id')
      .single();

    if (error || !created) {
      throw new Error(
        `Could not create subject "${name}": ${
          error?.message ?? 'Unknown database error'
        }`
      );
    }

    subjectCache.set(key, created.id);
    return created.id;
  }

  async function resolveTopicId(
    subjectId: string,
    name: string
  ): Promise<string> {
    const cleanName = name.trim();
    const key = `${subjectId}:${cleanName.toLowerCase()}`;

    if (topicCache.has(key)) {
      return topicCache.get(key)!;
    }

    const { data: existing, error: lookupError } = await admin
      .from('topics')
      .select('id')
      .eq('subject_id', subjectId)
      .ilike('name', cleanName)
      .maybeSingle();

    if (lookupError) {
      throw new Error(
        `Could not find topic "${cleanName}": ${lookupError.message}`
      );
    }

    if (existing) {
      topicCache.set(key, existing.id);
      return existing.id;
    }

    const { data: created, error } = await admin
      .from('topics')
      .insert({
        subject_id: subjectId,
        name: cleanName,
        slug: slugify(cleanName),
      })
      .select('id')
      .single();

    if (error || !created) {
      throw new Error(
        `Could not create topic "${cleanName}": ${
          error?.message ?? 'Unknown database error'
        }`
      );
    }

    topicCache.set(key, created.id);
    return created.id;
  }

  async function resolvePassageId(
    subjectId: string,
    text: string
  ): Promise<string> {
    const cleanText = text.trim();

    if (passageCache.has(cleanText)) {
      return passageCache.get(cleanText)!;
    }

    const { data: created, error } = await admin
      .from('passages')
      .insert({
        subject_id: subjectId,
        body: cleanText,
        passage_type: 'comprehension',
      })
      .select('id')
      .single();

    if (error || !created) {
      throw new Error(
        `Could not create passage: ${
          error?.message ?? 'Unknown database error'
        }`
      );
    }

    passageCache.set(cleanText, created.id);
    return created.id;
  }

  const rowsToInsert: Record<string, unknown>[] = [];
  const errors: {
    question: ParsedQuestion;
    reason: string;
  }[] = [];

  for (const q of questions) {
    try {
      const subjectId = await resolveSubjectId(q.subject);

      const topicId = q.topic
        ? await resolveTopicId(subjectId, q.topic)
        : null;

      const passageId = q.passage_text
        ? await resolvePassageId(subjectId, q.passage_text)
        : null;

      rowsToInsert.push({
        subject_id: subjectId,
        topic_id: topicId,
        passage_id: passageId,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        explanation: q.explanation ?? null,
        difficulty: q.difficulty ?? 'medium',
        exam_type: q.exam_type ?? 'general',
        year: q.year ?? null,
        modes: q.modes ?? ['practice', 'mock', 'cbt'],
        dedupe_hash: dedupeHash(q.question_text),
        created_by: caller.id,
      });
    } catch (e) {
      errors.push({
        question: q,
        reason:
          e instanceof Error
            ? e.message
            : 'Unknown error while preparing question.',
      });
    }
  }

  let insertedCount = 0;

  if (rowsToInsert.length > 0) {
    const { error: insertError, count } = await admin
      .from('questions')
      .insert(rowsToInsert, { count: 'exact' });

    if (insertError) {
      return NextResponse.json(
        {
          error: 'Import failed while writing questions.',
          database_error: {
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code,
          },
          prepared_questions: rowsToInsert.length,
          preparation_errors: errors,
        },
        { status: 500 }
      );
    }

    insertedCount = count ?? rowsToInsert.length;
  }

  await admin
    .from('import_batches')
    .update({
      status: 'committed',
      committed_count: insertedCount,
    })
    .eq('id', batch_id);

  return NextResponse.json({
    success: true,
    imported: insertedCount,
    failed: errors.length,
    errors,
  });
}
