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

  /*
   * ---------------------------------------------------------
   * FIND OR CREATE SUBJECT
   * ---------------------------------------------------------
   *
   * First we look by slug.
   * This prevents the duplicate subjects_slug_key problem.
   */
  async function resolveSubjectId(name: string): Promise<string> {
    const cleanName = name.trim();
    const slug = slugify(cleanName);
    const cacheKey = slug;

    if (subjectCache.has(cacheKey)) {
      return subjectCache.get(cacheKey)!;
    }

    // 1. Find existing subject by slug
    const { data: existingBySlug, error: slugLookupError } =
      await admin
        .from('subjects')
        .select('id, name, slug')
        .eq('slug', slug)
        .maybeSingle();

    if (slugLookupError) {
      throw new Error(
        `Could not check subject "${cleanName}": ${slugLookupError.message}`
      );
    }

    if (existingBySlug) {
      subjectCache.set(cacheKey, existingBySlug.id);
      return existingBySlug.id;
    }

    // 2. Find existing subject by name
    const { data: existingByName, error: nameLookupError } =
      await admin
        .from('subjects')
        .select('id, name, slug')
        .ilike('name', cleanName)
        .maybeSingle();

    if (nameLookupError) {
      throw new Error(
        `Could not check subject "${cleanName}": ${nameLookupError.message}`
      );
    }

    if (existingByName) {
      subjectCache.set(cacheKey, existingByName.id);
      return existingByName.id;
    }

    // 3. Create only if it truly does not exist
    const { data: created, error: createError } =
      await admin
        .from('subjects')
        .insert({
          name: cleanName,
          slug,
        })
        .select('id')
        .single();

    if (created) {
      subjectCache.set(cacheKey, created.id);
      return created.id;
    }

    /*
     * 4. Race-condition protection:
     * If another request created the same subject at the
     * same time, fetch it again instead of failing.
     */
    if (
      createError?.code === '23505' ||
      createError?.message?.includes('subjects_slug_key')
    ) {
      const { data: duplicateSubject } = await admin
        .from('subjects')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (duplicateSubject) {
        subjectCache.set(cacheKey, duplicateSubject.id);
        return duplicateSubject.id;
      }
    }

    throw new Error(
      `Could not create subject "${cleanName}": ${
        createError?.message ?? 'Unknown error'
      }`
    );
  }

  /*
   * ---------------------------------------------------------
   * FIND OR CREATE TOPIC
   * ---------------------------------------------------------
   */
  async function resolveTopicId(
    subjectId: string,
    name: string
  ): Promise<string> {
    const cleanName = name.trim();

    const key = `${subjectId}:${slugify(cleanName)}`;

    if (topicCache.has(key)) {
      return topicCache.get(key)!;
    }

    const { data: existing } = await admin
      .from('topics')
      .select('id')
      .eq('subject_id', subjectId)
      .ilike('name', cleanName)
      .maybeSingle();

    if (existing) {
      topicCache.set(key, existing.id);
      return existing.id;
    }

    const slug = slugify(cleanName);

    const { data: created, error } = await admin
      .from('topics')
      .insert({
        subject_id: subjectId,
        name: cleanName,
        slug,
      })
      .select('id')
      .single();

    if (created) {
      topicCache.set(key, created.id);
      return created.id;
    }

    // Handle duplicate topic safely
    if (error?.code === '23505') {
      const { data: duplicateTopic } = await admin
        .from('topics')
        .select('id')
        .eq('subject_id', subjectId)
        .eq('slug', slug)
        .maybeSingle();

      if (duplicateTopic) {
        topicCache.set(key, duplicateTopic.id);
        return duplicateTopic.id;
      }
    }

    throw new Error(
      `Could not create topic "${cleanName}": ${
        error?.message ?? 'Unknown error'
      }`
    );
  }

  /*
   * ---------------------------------------------------------
   * CREATE / REUSE PASSAGE
   * ---------------------------------------------------------
   */
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
          error?.message ?? 'Unknown error'
        }`
      );
    }

    passageCache.set(cleanText, created.id);

    return created.id;
  }

  /*
   * ---------------------------------------------------------
   * PREPARE QUESTIONS
   * ---------------------------------------------------------
   */
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
        ? await resolvePassageId(
            subjectId,
            q.passage_text
          )
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

        modes:
          q.modes ?? [
            'practice',
            'mock',
            'cbt',
          ],

        dedupe_hash: dedupeHash(
          q.question_text
        ),

        created_by: caller.id,
      });
    } catch (e) {
      errors.push({
        question: q,
        reason:
          e instanceof Error
            ? e.message
            : 'Unknown error',
      });
    }
  }

  /*
   * ---------------------------------------------------------
   * INSERT QUESTIONS
   * ---------------------------------------------------------
   */
  let insertedCount = 0;

  let databaseError:
    | {
        message?: string;
        details?: string;
        hint?: string;
        code?: string;
      }
    | null = null;

  if (rowsToInsert.length > 0) {
    const {
      error: insertError,
      count,
    } = await admin
      .from('questions')
      .insert(rowsToInsert, {
        count: 'exact',
      });

    if (insertError) {
      databaseError = {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      };
    } else {
      insertedCount =
        count ?? rowsToInsert.length;
    }
  }

  /*
   * ---------------------------------------------------------
   * UPDATE IMPORT BATCH
   * ---------------------------------------------------------
   */
  await admin
    .from('import_batches')
    .update({
      status: databaseError
        ? 'failed'
        : 'committed',
      committed_count: insertedCount,
    })
    .eq('id', batch_id);

  /*
   * ---------------------------------------------------------
   * RESPONSE
   * ---------------------------------------------------------
   */
  if (databaseError) {
    return NextResponse.json(
      {
        success: false,
        imported: insertedCount,
        failed:
          questions.length - insertedCount,
        errors,
        database_error: databaseError,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    imported: insertedCount,
    failed: errors.length,
    errors,
  });
}
