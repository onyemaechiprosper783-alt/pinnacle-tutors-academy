-- ============================================================================
-- ROW LEVEL SECURITY — this is what actually stops a student from reaching
-- admin data or another student's results, even if a frontend route is
-- somehow reached directly via the API. Run after 001_init_schema.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: is the current user an admin/super_admin?
-- ----------------------------------------------------------------------------
create function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'super_admin')
  );
$$ language sql security definer stable;

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id or is_admin());

create policy "Users can update their own profile (not their role)"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from profiles where id = auth.uid()));

create policy "Only admins can change roles"
  on profiles for update
  using (is_admin());

-- ----------------------------------------------------------------------------
-- SUBJECTS / TOPICS / PASSAGES — publicly readable, admin-only write
-- ----------------------------------------------------------------------------
alter table subjects enable row level security;
alter table topics enable row level security;
alter table passages enable row level security;

create policy "Anyone can read subjects" on subjects for select using (true);
create policy "Admins manage subjects" on subjects for all using (is_admin()) with check (is_admin());

create policy "Anyone can read topics" on topics for select using (true);
create policy "Admins manage topics" on topics for all using (is_admin()) with check (is_admin());

create policy "Anyone can read passages" on passages for select using (true);
create policy "Admins manage passages" on passages for all using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------------------------
-- QUESTIONS — students can read active questions but never see correct_answer
-- via a public view; admins have full access to the base table.
-- ----------------------------------------------------------------------------
alter table questions enable row level security;

create policy "Admins manage questions" on questions for all using (is_admin()) with check (is_admin());

create policy "Authenticated users can read active questions" on questions
  for select using (auth.uid() is not null and is_active = true);

-- Public-safe view: hides correct_answer + explanation so the client never
-- receives the answer key before the student submits. The exam engine scores
-- server-side (see /api/exams/*) and only reveals answers after submission.
create view questions_public as
  select id, subject_id, topic_id, passage_id, question_text,
         option_a, option_b, option_c, option_d,
         difficulty, exam_type, year, modes, millionaire_tier
  from questions
  where is_active = true;

-- ----------------------------------------------------------------------------
-- IMPORT BATCHES — admin only
-- ----------------------------------------------------------------------------
alter table import_batches enable row level security;
create policy "Admins manage import batches" on import_batches for all
  using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------------------------
-- EXAM ATTEMPTS — a student only ever sees their own; admins see all
-- ----------------------------------------------------------------------------
alter table exam_attempts enable row level security;

create policy "Students manage their own attempts" on exam_attempts
  for all
  using (auth.uid() = student_id or is_admin())
  with check (auth.uid() = student_id or is_admin());

alter table attempt_questions enable row level security;

create policy "Students manage their own attempt questions" on attempt_questions
  for all
  using (
    is_admin() or
    exists (select 1 from exam_attempts a where a.id = attempt_id and a.student_id = auth.uid())
  )
  with check (
    is_admin() or
    exists (select 1 from exam_attempts a where a.id = attempt_id and a.student_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- CHALLENGE ROUNDS — public read, admin write
-- ----------------------------------------------------------------------------
alter table challenge_rounds enable row level security;
create policy "Anyone can read active challenge rounds" on challenge_rounds
  for select using (is_active = true or is_admin());
create policy "Admins manage challenge rounds" on challenge_rounds
  for all using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------------------------
-- LEADERBOARD — publicly readable (display_name only, enforced at query layer
-- in the API — see lib/leaderboard), writes happen via the scoring API using
-- the service role, never directly from the client.
-- ----------------------------------------------------------------------------
alter table leaderboard_entries enable row level security;
create policy "Anyone can read leaderboard entries" on leaderboard_entries
  for select using (true);
create policy "Only admins write leaderboard directly" on leaderboard_entries
  for insert with check (is_admin());
-- Normal leaderboard inserts happen server-side via the service-role key in
-- /api/exams/*/submit, which bypasses RLS by design (server-only secret).

-- ----------------------------------------------------------------------------
-- COMMUNITY SETTINGS & ANNOUNCEMENTS — public read, admin write
-- ----------------------------------------------------------------------------
alter table community_settings enable row level security;
create policy "Anyone can read community settings" on community_settings
  for select using (true);
create policy "Admins update community settings" on community_settings
  for update using (is_admin()) with check (is_admin());

alter table announcements enable row level security;
create policy "Anyone can read active announcements" on announcements
  for select using (is_active = true or is_admin());
create policy "Admins manage announcements" on announcements
  for all using (is_admin()) with check (is_admin());
