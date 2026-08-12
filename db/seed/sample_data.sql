-- ============================================================================
-- SAMPLE SEED DATA — optional, for local testing only. Run after the
-- migrations in db/migrations/. Safe to skip in production; the bulk
-- importer and manual question form are the real content pipeline.
-- ============================================================================

insert into subjects (name, slug, exam_types) values
  ('Mathematics', 'mathematics', '{jamb,waec}'),
  ('English Language', 'english-language', '{jamb,waec}'),
  ('Government', 'government', '{jamb,waec}')
on conflict (name) do nothing;

insert into topics (subject_id, name, slug)
select id, 'Algebra', 'algebra' from subjects where slug = 'mathematics'
on conflict do nothing;

insert into topics (subject_id, name, slug)
select id, 'Comprehension', 'comprehension' from subjects where slug = 'english-language'
on conflict do nothing;

-- A handful of practice/mock/cbt questions
insert into questions (subject_id, topic_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty, exam_type, modes, dedupe_hash)
select
  s.id, t.id,
  'If 2x + 3 = 11, what is x?', '3', '4', '5', '6', 'B',
  '2x + 3 = 11 → 2x = 8 → x = 4.', 'easy', 'jamb', '{practice,mock,cbt}', md5('if 2x + 3 = 11, what is x?')
from subjects s join topics t on t.subject_id = s.id and t.slug = 'algebra'
where s.slug = 'mathematics';

insert into questions (subject_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty, exam_type, modes, dedupe_hash)
select
  id, 'Who was Nigeria''s first executive president?', 'Nnamdi Azikiwe', 'Shehu Shagari', 'Yakubu Gowon', 'Olusegun Obasanjo', 'B',
  'Shehu Shagari became Nigeria''s first executive president in 1979.', 'medium', 'jamb', '{practice,mock,cbt,utme_challenge}', md5('who was nigeria''s first executive president?')
from subjects where slug = 'government';

-- Millionaire-tier sample (tier 1)
insert into questions (subject_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty, exam_type, modes, millionaire_tier, dedupe_hash)
select
  id, 'What is the capital of Nigeria?', 'Lagos', 'Abuja', 'Kano', 'Ibadan', 'B',
  'Abuja has been the capital since 1991.', 'easy', 'general', '{millionaire}', 1, md5('what is the capital of nigeria?')
from subjects where slug = 'government';
