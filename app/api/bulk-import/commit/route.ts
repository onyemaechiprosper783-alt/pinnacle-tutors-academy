import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dedupeHash } from '@/lib/importer/parser';
import type { ParsedQuestion } from '@/types/database';

const commitSchema = z.object({
  batch_id: z.string().uuid(),
  questions: z.array(z.object({
    question_text: z.string().min(1), option_a: z.string().min(1), option_b: z.string().min(1), option_c: z.string().min(1), option_d: z.string().min(1),
    correct_answer: z.enum(['A', 'B', 'C', 'D']), explanation: z.string().optional(), subject: z.string().min(1), topic: z.string().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(), exam_type: z.enum(['jamb', 'waec', 'utme', 'general']).optional(), year: z.number().optional(),
    passage_text: z.string().optional(), modes: z.array(z.string()).optional(), millionaire_tier: z.number().int().min(1).max(15).optional(),
  })).min(1),
});
function slugify(s: string) { return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

export async function POST(request: Request) {
  const caller = await getCurrentProfile();
  if (!caller || (caller.role !== 'admin' && caller.role !== 'super_admin')) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  const body = await request.json().catch(() => null); const parsed = commitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.', details: parsed.error.issues }, { status: 400 });
  const admin = createAdminClient(); const { batch_id, questions } = parsed.data;
  const subjectCache = new Map<string, string>(); const topicCache = new Map<string, string>(); const passageCache = new Map<string, string>();

  async function resolveSubjectId(name: string) {
    const clean = name.trim(); const slug = slugify(clean); if (subjectCache.has(slug)) return subjectCache.get(slug)!;
    const { data: bySlug, error: slugError } = await admin.from('subjects').select('id').eq('slug', slug).maybeSingle(); if (slugError) throw new Error(slugError.message); if (bySlug) { subjectCache.set(slug, bySlug.id); return bySlug.id; }
    const { data: byName, error: nameError } = await admin.from('subjects').select('id').ilike('name', clean).maybeSingle(); if (nameError) throw new Error(nameError.message); if (byName) { subjectCache.set(slug, byName.id); return byName.id; }
    const { data: created, error: createError } = await admin.from('subjects').insert({ name: clean, slug }).select('id').single();
    if (created) { subjectCache.set(slug, created.id); return created.id; }
    if (createError?.code === '23505') { const { data: duplicate } = await admin.from('subjects').select('id').eq('slug', slug).maybeSingle(); if (duplicate) { subjectCache.set(slug, duplicate.id); return duplicate.id; } }
    throw new Error(`Could not create subject "${clean}": ${createError?.message ?? 'Unknown error'}`);
  }
  async function resolveTopicId(subjectId: string, name: string) {
    const clean = name.trim(); const key = `${subjectId}:${slugify(clean)}`; if (topicCache.has(key)) return topicCache.get(key)!;
    const { data: existing } = await admin.from('topics').select('id').eq('subject_id', subjectId).ilike('name', clean).maybeSingle(); if (existing) { topicCache.set(key, existing.id); return existing.id; }
    const { data: created, error } = await admin.from('topics').insert({ subject_id: subjectId, name: clean, slug: slugify(clean) }).select('id').single();
    if (created) { topicCache.set(key, created.id); return created.id; }
    if (error?.code === '23505') { const { data: duplicate } = await admin.from('topics').select('id').eq('subject_id', subjectId).eq('slug', slugify(clean)).maybeSingle(); if (duplicate) { topicCache.set(key, duplicate.id); return duplicate.id; } }
    throw new Error(`Could not create topic "${clean}": ${error?.message ?? 'Unknown error'}`);
  }
  async function resolvePassageId(subjectId: string, text: string) {
    const clean = text.trim(); if (passageCache.has(clean)) return passageCache.get(clean)!;
    const { data, error } = await admin.from('passages').insert({ subject_id: subjectId, body: clean, passage_type: 'comprehension' }).select('id').single();
    if (error || !data) throw new Error(`Could not create passage: ${error?.message ?? 'Unknown error'}`); passageCache.set(clean, data.id); return data.id;
  }

  const rowsToInsert: Record<string, unknown>[] = []; const errors: { question: ParsedQuestion; reason: string }[] = [];
  for (const q of questions) {
    try {
      const subjectId = await resolveSubjectId(q.subject); const topicId = q.topic ? await resolveTopicId(subjectId, q.topic) : null; const passageId = q.passage_text ? await resolvePassageId(subjectId, q.passage_text) : null;
      rowsToInsert.push({ subject_id: subjectId, topic_id: topicId, passage_id: passageId, question_text: q.question_text, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_answer: q.correct_answer, explanation: q.explanation ?? null, difficulty: q.difficulty ?? 'medium', exam_type: q.exam_type ?? 'general', year: q.year ?? null, modes: q.modes ?? ['practice', 'mock', 'cbt'], millionaire_tier: q.millionaire_tier ?? null, dedupe_hash: dedupeHash(q.question_text), created_by: caller.id });
    } catch (e) { errors.push({ question: q, reason: e instanceof Error ? e.message : 'Unknown error' }); }
  }

  let insertedCount = 0; let databaseError: { message?: string; details?: string; hint?: string; code?: string } | null = null;
  if (rowsToInsert.length) {
    const { error: insertError, count } = await admin.from('questions').insert(rowsToInsert, { count: 'exact' });
    if (insertError) databaseError = { message: insertError.message, details: insertError.details, hint: insertError.hint, code: insertError.code }; else insertedCount = count ?? rowsToInsert.length;
  }
  await admin.from('import_batches').update({ status: databaseError ? 'discarded' : 'committed', committed_count: insertedCount }).eq('id', batch_id);
  if (databaseError) return NextResponse.json({ success: false, imported: insertedCount, failed: questions.length - insertedCount, errors, database_error: databaseError }, { status: 500 });
  return NextResponse.json({ success: true, imported: insertedCount, failed: errors.length, errors });
}
