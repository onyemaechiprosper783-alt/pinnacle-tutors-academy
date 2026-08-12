import { createHash } from 'crypto';
import type { ParsedQuestion, ParseError, Difficulty, ExamType } from '@/types/database';

// ----------------------------------------------------------------------------
// Expected format (admin pastes a block of one or many of these):
//
//   Question: What is 2 + 2?
//   A. 3
//   B. 4
//   C. 5
//   D. 6
//   Answer: B
//   Explanation: 2 + 2 = 4
//   Subject: Mathematics
//   Topic: Algebra
//   Difficulty: Easy
//   Year: 2023
//   ExamType: JAMB
//
// Passage-based (English comprehension/cloze) — one passage, many questions:
//
//   PASSAGE:
//   <one or more paragraphs of passage text>
//
//   Question 1: According to the passage, ...
//   A. ...
//   B. ...
//   C. ...
//   D. ...
//   Answer: A
//   Subject: English Language
//   Topic: Comprehension
//
//   Question 2: ...
//   ...
//
// Everything after "PASSAGE:" up to the first "Question" line is treated as
// passage text and attached to every question that follows, until either a
// new "PASSAGE:" block starts or the input ends.
// ----------------------------------------------------------------------------

const FIELD_PATTERNS = {
  question: /^question\s*\d*\s*:\s*/i,
  optionA: /^A[.).]\s*/i,
  optionB: /^B[.).]\s*/i,
  optionC: /^C[.).]\s*/i,
  optionD: /^D[.).]\s*/i,
  answer: /^answer\s*:\s*/i,
  explanation: /^explanation\s*:\s*/i,
  subject: /^subject\s*:\s*/i,
  topic: /^topic\s*:\s*/i,
  difficulty: /^difficulty\s*:\s*/i,
  year: /^year\s*:\s*/i,
  examType: /^exam\s*type\s*:\s*/i,
  passageStart: /^passage\s*:\s*/i,
};

function normalizeDifficulty(raw?: string): Difficulty | undefined {
  const v = raw?.trim().toLowerCase();
  if (v === 'easy' || v === 'medium' || v === 'hard') return v;
  return undefined;
}

function normalizeExamType(raw?: string): ExamType | undefined {
  const v = raw?.trim().toLowerCase();
  if (v === 'jamb' || v === 'waec' || v === 'utme' || v === 'general') return v as ExamType;
  return undefined;
}

// A stable hash of the normalized question text, used to flag likely
// duplicates against the existing question bank without doing a fuzzy
// text search on every import.
export function dedupeHash(questionText: string): string {
  const normalized = questionText.trim().toLowerCase().replace(/\s+/g, ' ');
  return createHash('sha256').update(normalized).digest('hex');
}

interface RawBlock {
  index: number;
  lines: string[];
  passageText?: string;
}

// Splits the raw paste into question blocks. A new block starts at each
// line matching "Question:" / "Question 1:" etc. PASSAGE: sections are
// captured separately and carried forward onto every following block until
// the next PASSAGE: marker.
function splitIntoBlocks(raw: string): RawBlock[] {
  const lines = raw.split(/\r?\n/);
  const blocks: RawBlock[] = [];
  let currentPassage: string | undefined;
  let collectingPassage = false;
  let passageBuffer: string[] = [];
  let currentBlock: string[] | null = null;

  const flushBlock = () => {
    if (currentBlock && currentBlock.some((l) => l.trim().length > 0)) {
      blocks.push({ index: blocks.length, lines: currentBlock, passageText: currentPassage });
    }
    currentBlock = null;
  };

  for (const line of lines) {
    if (FIELD_PATTERNS.passageStart.test(line.trim())) {
      flushBlock();
      collectingPassage = true;
      passageBuffer = [line.trim().replace(FIELD_PATTERNS.passageStart, '')];
      continue;
    }

    if (collectingPassage) {
      if (FIELD_PATTERNS.question.test(line.trim())) {
        currentPassage = passageBuffer.join('\n').trim();
        collectingPassage = false;
        // fall through to normal question-line handling below
      } else {
        passageBuffer.push(line);
        continue;
      }
    }

    if (FIELD_PATTERNS.question.test(line.trim())) {
      flushBlock();
      currentBlock = [line];
    } else if (currentBlock) {
      currentBlock.push(line);
    }
    // Lines before any "Question:" marker and outside a PASSAGE: block are
    // ignored (e.g. stray blank lines, admin notes).
  }
  flushBlock();

  return blocks;
}

function parseBlock(block: RawBlock): { question?: ParsedQuestion; error?: ParseError } {
  const fields: Record<string, string> = {};
  const options: Record<'A' | 'B' | 'C' | 'D', string | undefined> = {
    A: undefined, B: undefined, C: undefined, D: undefined,
  };
  let questionText = '';
  let currentField: string | null = null;
  const rawText = block.lines.join('\n');

  for (const rawLine of block.lines) {
    const line = rawLine.trim();
    if (!line) { currentField = null; continue; }

    if (FIELD_PATTERNS.question.test(line)) {
      questionText = line.replace(FIELD_PATTERNS.question, '').trim();
      currentField = 'question';
    } else if (FIELD_PATTERNS.optionA.test(line)) {
      options.A = line.replace(FIELD_PATTERNS.optionA, '').trim(); currentField = 'A';
    } else if (FIELD_PATTERNS.optionB.test(line)) {
      options.B = line.replace(FIELD_PATTERNS.optionB, '').trim(); currentField = 'B';
    } else if (FIELD_PATTERNS.optionC.test(line)) {
      options.C = line.replace(FIELD_PATTERNS.optionC, '').trim(); currentField = 'C';
    } else if (FIELD_PATTERNS.optionD.test(line)) {
      options.D = line.replace(FIELD_PATTERNS.optionD, '').trim(); currentField = 'D';
    } else if (FIELD_PATTERNS.answer.test(line)) {
      fields.answer = line.replace(FIELD_PATTERNS.answer, '').trim(); currentField = 'answer';
    } else if (FIELD_PATTERNS.explanation.test(line)) {
      fields.explanation = line.replace(FIELD_PATTERNS.explanation, '').trim(); currentField = 'explanation';
    } else if (FIELD_PATTERNS.subject.test(line)) {
      fields.subject = line.replace(FIELD_PATTERNS.subject, '').trim(); currentField = 'subject';
    } else if (FIELD_PATTERNS.topic.test(line)) {
      fields.topic = line.replace(FIELD_PATTERNS.topic, '').trim(); currentField = 'topic';
    } else if (FIELD_PATTERNS.difficulty.test(line)) {
      fields.difficulty = line.replace(FIELD_PATTERNS.difficulty, '').trim(); currentField = 'difficulty';
    } else if (FIELD_PATTERNS.year.test(line)) {
      fields.year = line.replace(FIELD_PATTERNS.year, '').trim(); currentField = 'year';
    } else if (FIELD_PATTERNS.examType.test(line)) {
      fields.examType = line.replace(FIELD_PATTERNS.examType, '').trim(); currentField = 'examType';
    } else if (currentField) {
      // Continuation line (e.g. a question or explanation wrapping onto
      // multiple lines) — append to whichever field we were last filling.
      if (currentField === 'question') questionText += ' ' + line;
      else if (currentField === 'explanation') fields.explanation = (fields.explanation ?? '') + ' ' + line;
      else if (['A', 'B', 'C', 'D'].includes(currentField)) {
        options[currentField as 'A' | 'B' | 'C' | 'D'] += ' ' + line;
      }
    }
  }

  const missing: string[] = [];
  if (!questionText) missing.push('question text');
  if (!options.A) missing.push('option A');
  if (!options.B) missing.push('option B');
  if (!options.C) missing.push('option C');
  if (!options.D) missing.push('option D');
  if (!fields.answer) missing.push('answer');
  if (!fields.subject) missing.push('subject');

  if (missing.length > 0) {
    return {
      error: { block_index: block.index, raw_text: rawText, reason: `Missing: ${missing.join(', ')}` },
    };
  }

  const answer = fields.answer!.trim().toUpperCase().replace(/[.)]/g, '');
  if (!['A', 'B', 'C', 'D'].includes(answer)) {
    return {
      error: {
        block_index: block.index, raw_text: rawText,
        reason: `Answer must be A, B, C, or D (got "${fields.answer}")`,
      },
    };
  }

  const question: ParsedQuestion = {
    question_text: questionText.trim(),
    option_a: options.A!.trim(),
    option_b: options.B!.trim(),
    option_c: options.C!.trim(),
    option_d: options.D!.trim(),
    correct_answer: answer as 'A' | 'B' | 'C' | 'D',
    explanation: fields.explanation?.trim(),
    subject: fields.subject!.trim(),
    topic: fields.topic?.trim(),
    difficulty: normalizeDifficulty(fields.difficulty),
    exam_type: normalizeExamType(fields.examType),
    year: fields.year ? parseInt(fields.year, 10) || undefined : undefined,
    passage_text: block.passageText,
  };

  return { question };
}

export function parseBulkImport(raw: string): {
  valid: ParsedQuestion[];
  invalid: ParseError[];
  totalDetected: number;
} {
  const blocks = splitIntoBlocks(raw);
  const valid: ParsedQuestion[] = [];
  const invalid: ParseError[] = [];

  for (const block of blocks) {
    const { question, error } = parseBlock(block);
    if (question) valid.push(question);
    if (error) invalid.push(error);
  }

  return { valid, invalid, totalDetected: blocks.length };
}
