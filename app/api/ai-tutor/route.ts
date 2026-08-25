import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getCurrentProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are Nia, the AI Tutor for Pinnacle Tutors Academy. You are a patient, intelligent teacher. Explain answers clearly and at an appropriate student level. Prefer step-by-step teaching, examples, and simple language. Help with school subjects, exam preparation, concepts, calculations, writing, study skills, and general educational questions. If a student asks for an answer, explain the reasoning so they learn it. Never claim certainty when you are unsure; say what you know and suggest how to verify uncertain facts. Do not help a student cheat on an active exam or challenge.`;

function looksLikeActiveAttempt(value: unknown) {
  if (!value || typeof value !== 'object') return false;
  const attempt = value as Record<string, unknown>;
  const status = String(attempt.status ?? '').toLowerCase();
  return ['in_progress', 'started', 'active', 'ongoing'].includes(status);
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message) return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    if (message.length > 4000) return NextResponse.json({ error: 'Message is too long.' }, { status: 400 });

    if (looksLikeActiveAttempt(body?.activeAttempt)) {
      return NextResponse.json({ error: 'Nia is unavailable while you are writing an exam or challenge.' }, { status: 403 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('AI Tutor configuration error: GEMINI_API_KEY is missing from this deployment.');
      return NextResponse.json({ error: 'AI Tutor is not configured yet. Please check the Vercel GEMINI_API_KEY setting and redeploy.' }, { status: 503 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: message,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 1200,
      },
    });

    return NextResponse.json({
      answer: response.text?.trim() || 'I could not generate an answer right now.',
    });
  } catch (error) {
    console.error('AI Tutor Gemini error:', error);
    return NextResponse.json({
      error: 'The AI Tutor could not answer right now. Please try again.',
    }, { status: 500 });
  }
}
