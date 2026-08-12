-- ============================================================================
-- PINNACLE TUTORS ACADEMY — CORE DATABASE SCHEMA (Supabase / Postgres)
-- Run this in the Supabase SQL editor, top to bottom, on a fresh project.
-- Auth users live in Supabase's built-in `auth.users` table; everything here
-- extends that with a `profiles` table + role-based access via RLS.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ROLES & PROFILES
-- ----------------------------------------------------------------------------
create type user_role as enum ('student', 'admin', 'super_admin');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  display_name text, -- shown on leaderboard instead of full_name
  phone text,
  role user_role not null default 'student',
  school text,
  exam_target text, -- 'jamb' | 'waec' | 'both'
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Student'), 'student');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. SUBJECTS & TOPICS
-- ----------------------------------------------------------------------------
create table subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,          -- 'Mathematics', 'English Language'...
  slug text not null unique,
  exam_types text[] not null default '{}', -- ['jamb','waec']
  icon text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  name text not null,                 -- 'Algebra', 'Comprehension'...
  slug text not null,
  created_at timestamptz not null default now(),
  unique (subject_id, slug)
);

-- ----------------------------------------------------------------------------
-- 3. PASSAGES (for English comprehension / cloze — one passage, many questions)
-- ----------------------------------------------------------------------------
create table passages (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  title text,
  body text not null,
  passage_type text not null default 'comprehension', -- comprehension | cloze
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. QUESTIONS
-- ----------------------------------------------------------------------------
create type difficulty_level as enum ('easy', 'medium', 'hard');
create type exam_type as enum ('jamb', 'waec', 'utme', 'general');

create table questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete restrict,
  topic_id uuid references topics(id) on delete set null,
  passage_id uuid references passages(id) on delete cascade, -- null unless passage-based
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer char(1) not null check (correct_answer in ('A','B','C','D')),
  explanation text,
  difficulty difficulty_level not null default 'medium',
  exam_type exam_type not null default 'general',
  year int,
  -- which game modes this question is eligible for; a question can serve many
  modes text[] not null default '{practice,mock,cbt}', -- also: 'utme_challenge','millionaire'
  -- millionaire-specific: prize tier / rung this question sits at (1-15), null otherwise
  millionaire_tier smallint,
  is_active boolean not null default true,
  -- hash of normalized question text, used server-side to flag likely duplicates on import
  dedupe_hash text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_questions_subject on questions(subject_id);
create index idx_questions_topic on questions(topic_id);
create index idx_questions_modes on questions using gin(modes);
create index idx_questions_dedupe on questions(dedupe_hash);

-- ----------------------------------------------------------------------------
-- 5. BULK IMPORT BATCHES (audit trail + preview/commit workflow)
-- ----------------------------------------------------------------------------
create type import_status as enum ('previewing', 'committed', 'discarded');

create table import_batches (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles(id),
  raw_text text not null,             -- original pasted block, kept for audit
  parsed_json jsonb not null,         -- parser output: array of parsed question objects + errors
  total_detected int not null default 0,
  valid_count int not null default 0,
  invalid_count int not null default 0,
  duplicate_count int not null default 0,
  status import_status not null default 'previewing',
  committed_count int,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 6. EXAM ATTEMPTS (covers practice, mock, cbt, utme_challenge, millionaire)
-- ----------------------------------------------------------------------------
create type attempt_mode as enum ('practice', 'mock', 'cbt', 'utme_challenge', 'millionaire');
create type attempt_status as enum ('in_progress', 'submitted', 'auto_submitted', 'abandoned');

create table exam_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  mode attempt_mode not null,
  subject_ids uuid[] not null default '{}', -- one or many subjects (mock can be multi-subject)
  config jsonb not null default '{}',       -- {question_count, duration_seconds, difficulty, ...}
  status attempt_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  duration_seconds int,               -- planned duration, for CBT/mock timers
  time_used_seconds int,
  -- denormalized scoring, filled on submit
  total_questions int,
  correct_count int,
  incorrect_count int,
  unanswered_count int,
  score numeric(6,2),                 -- percentage
  -- millionaire-specific state
  millionaire_prize_tier smallint,
  millionaire_lifelines_used text[] default '{}',
  created_at timestamptz not null default now()
);

create index idx_attempts_student on exam_attempts(student_id);
create index idx_attempts_mode on exam_attempts(mode);

-- Each question presented within an attempt, and the student's answer to it
create table attempt_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references exam_attempts(id) on delete cascade,
  question_id uuid not null references questions(id) on delete restrict,
  position int not null,              -- order shown to student
  selected_answer char(1) check (selected_answer in ('A','B','C','D')),
  is_correct boolean,
  answered_at timestamptz,
  time_spent_seconds int,
  unique (attempt_id, question_id)
);

create index idx_attempt_questions_attempt on attempt_questions(attempt_id);

-- ----------------------------------------------------------------------------
-- 7. UTME CHALLENGE (competitive leaderboard-driven mode)
-- ----------------------------------------------------------------------------
create table challenge_rounds (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject_id uuid references subjects(id),
  question_count int not null default 20,
  duration_seconds int not null default 900,
  opens_at timestamptz,
  closes_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 8. LEADERBOARD (materialized from exam_attempts, refreshed on submit)
-- ----------------------------------------------------------------------------
create table leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references exam_attempts(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  category text not null,             -- 'utme_challenge' | 'millionaire' | round id, etc.
  score numeric(6,2) not null,
  time_used_seconds int,
  created_at timestamptz not null default now()
);

create index idx_leaderboard_category on leaderboard_entries(category, score desc);

-- ----------------------------------------------------------------------------
-- 9. COMMUNITY SETTINGS & ANNOUNCEMENTS (admin-editable, no code redeploys)
-- ----------------------------------------------------------------------------
create table community_settings (
  id int primary key default 1 check (id = 1), -- singleton row
  whatsapp_group_url text,
  whatsapp_channel_url text,
  telegram_url text,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);
insert into community_settings (id) values (1);

create table announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 10. UPDATED_AT TRIGGER HELPER
-- ----------------------------------------------------------------------------
create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute procedure set_updated_at();
create trigger trg_questions_updated_at before update on questions
  for each row execute procedure set_updated_at();
