# Pinnacle Tutors Academy — Project Scaffold

Real Next.js + Supabase app: student/admin auth, persistent Postgres database,
question bank with bulk import, practice/mock/CBT engines, UTME Challenge,
Millionaire mode, leaderboard, and an admin dashboard. No localStorage-as-database,
no fake auth — the schema and RLS policies below are what actually enforce
"students can't reach admin data," at the database layer, not just the UI.

## Folder structure

```
app/
  (public)/          marketing site: home, about, subjects, jamb, waec, contact
  (auth)/             login, register, forgot-password, reset-password
  (student)/          dashboard, practice, mock, cbt, challenge, millionaire,
                       results, profile, settings, community, leaderboard
  (admin)/admin/       dashboard, students, questions (incl. bulk-import),
                       subjects, topics, exams, challenge, millionaire,
                       results, leaderboard, community, announcements, settings
  api/                 route handlers — auth, questions, bulk-import,
                       exams/{practice,mock,cbt}, challenge, millionaire,
                       results, leaderboard, community, admin
components/
  ui/ cbt/ practice/ mock/ challenge/ millionaire/ admin/ calculator/ charts/ layout/
lib/
  supabase/           client + server Supabase instances
  importer/            bulk-import parser (English passages, MCQ blocks, dedupe)
  scoring/              server-side answer checking (never trust the client)
  validators/           zod schemas for every API input
  hooks/                 client hooks (timer, autosave, etc.)
db/
  migrations/          001_init_schema.sql, 002_rls_policies.sql
  seed/                 sample subjects/topics/questions for local testing
types/
  database.ts           TypeScript types matching the schema
```

## Database (`db/migrations/`)

Run `001_init_schema.sql` then `002_rls_policies.sql` in the Supabase SQL
editor, in that order, on a fresh project.

**Core tables:** `profiles` (role-based: student/admin/super_admin, auto-created
on signup via trigger) · `subjects` · `topics` · `passages` (so one English
comprehension passage can back many questions) · `questions` (subject, topic,
optional passage link, difficulty, exam_type, `modes[]` so one question can
serve practice/mock/cbt/challenge/millionaire without duplication,
`millionaire_tier` for prize-ladder placement) · `import_batches` (every bulk
paste is logged with a preview/commit/discard status — nothing is silently
imported or silently rejected) · `exam_attempts` + `attempt_questions`
(covers practice, mock, CBT, challenge, and millionaire as one system) ·
`challenge_rounds` · `leaderboard_entries` · `community_settings` (singleton
row the admin edits — WhatsApp/Telegram links are never hardcoded) ·
`announcements`.

**Security model:** every table has Row Level Security enabled.
`is_admin()` is a `security definer` function checked in every admin policy.
Students can only read/write their own `exam_attempts` and `attempt_questions`.
The raw `questions` table (with `correct_answer`) is never sent to the
client — the `questions_public` view strips it, and scoring happens
server-side in the `/api/exams/*/submit` routes using the service-role key,
which is the only thing allowed to write `leaderboard_entries` directly.

## Setup

1. Create a Supabase project → copy the URL, anon key, and service role key
   into `.env.local` (see `.env.example`).
2. Run the two migration files in the Supabase SQL editor.
3. `npm install`
4. `npm run dev`
5. Deploy: push to GitHub, import into Vercel, add the same env vars there.
   `NEXT_PUBLIC_*` vars are safe client-side; `SUPABASE_SERVICE_ROLE_KEY` and
   `ADMIN_BOOTSTRAP_SECRET` must be server-only env vars, never committed.
6. First admin account: register normally as a student, then call the
   bootstrap endpoint once with `ADMIN_BOOTSTRAP_SECRET` to promote that one
   account to `super_admin` (built in the auth phase below). After that,
   only existing admins can promote other admins — no one can self-serve
   admin access by signing up.

## Build roadmap

- [x] **Phase 0** — folder structure + schema + RLS
- [x] **Phase 1** — Auth (register/login/reset/session) + admin bootstrap +
      protected route middleware
- [x] **Phase 2** — Question bank CRUD + bulk importer (parser, preview,
      duplicate detection, English passage handling)
- [x] **Phase 3** — Practice mode + CBT engine (timer, nav grid, auto-submit)
      + Mock exam + server-side scoring
- [x] **Phase 4** — Results/analytics, leaderboard, UTME Challenge
- [x] **Phase 5** — Millionaire mode (lifelines, prize ladder)
- [x] **Phase 6** — Admin dashboard (stats, community settings, announcements)
- [x] **Phase 7** — Calculator widget, landing page, contact form, mobile QA

Every phase above shipped working code, not placeholders — see "What's real
vs. what's next" below for the honest boundary between the two.

## Full route map

**Public:** `/` `/about` `/subjects` `/jamb` `/waec` `/contact`
**Auth:** `/login` `/register` `/forgot-password` `/reset-password`
**Student:** `/dashboard` `/practice` `/practice/[subjectId]` `/mock/setup`
`/mock/[attemptId]` `/cbt/setup` `/cbt/[attemptId]` `/challenge/lobby`
`/challenge/[matchId]` `/millionaire` `/results/[attemptId]` `/profile`
`/settings` `/community` `/leaderboard`
**Admin:** `/admin/dashboard` `/admin/students` `/admin/questions`
`/admin/questions/new` `/admin/questions/bulk-import`
`/admin/questions/[questionId]` `/admin/subjects` `/admin/topics`
`/admin/exams` `/admin/challenge` `/admin/millionaire` `/admin/results`
`/admin/leaderboard` (reuses the leaderboard API) `/admin/community`
`/admin/announcements` `/admin/contact` `/admin/settings`

## What's real vs. what's next

**Real and functional today:** auth with DB-backed sessions (no localStorage
auth), role separation enforced by RLS + middleware, the bulk importer with
preview/commit, server-side exam scoring for practice/mock/CBT/UTME
Challenge/Millionaire, the leaderboard, community links and announcements
editable from the admin dashboard with no redeploy, a working calculator,
and a public contact form backed by its own table.

**Reasonable next steps, not yet built:** email confirmation templates
(Supabase sends a default one — customize it in the Supabase dashboard),
an `/admin/leaderboard` page dedicated to moderation (the leaderboard API
already supports it), avatar upload, and the "Future expansion" items from
the original spec (payments, tutor accounts, video lessons, certificates) —
the schema was deliberately kept normalized so these slot in without
restructuring existing tables.

## Testing checklist before you deploy

1. Run both migrations + optionally `db/seed/sample_data.sql` for test data.
2. Register a student account, confirm the email, log in → lands on
   `/dashboard`, `/admin` redirects to `/login?next=/admin/...` then back
   with `?error=unauthorized` since this account isn't an admin.
3. Call `POST /api/admin/bootstrap` once with your `ADMIN_BOOTSTRAP_SECRET`
   and that account's email → log out, log back in → lands on
   `/admin/dashboard`.
4. Bulk-import a small batch (see the placeholder text on
   `/admin/questions/bulk-import`) including one passage-based English block
   → confirm the preview counts match, then commit.
5. As the student account: practice a subject (instant feedback), start a
   CBT exam (timer + auto-submit by waiting or setting a short duration),
   run a mock exam across two subjects, check `/results/[attemptId]` shows
   the right subject breakdown.
6. Create a UTME Challenge round in `/admin/challenge`, join it as the
   student, submit, confirm it appears on `/leaderboard`.
7. Assign a few questions to Millionaire tiers in `/admin/millionaire`, play
   a round as the student, test both lifelines.
8. Set community links in `/admin/community`, confirm they render as real
   `<a>` tags on `/community` (open the page from a WhatsApp-shared link on
   a phone to confirm the in-app browser handles it correctly).
9. Submit the contact form as a signed-out visitor, confirm it shows up in
   `/admin/contact`.
10. Resize the browser to 320/375/390/412/768/1024/1440px (or just test on
    an actual Android phone) — bottom nav should replace the sidebar under
    `md`, no horizontal scroll anywhere, tap targets stay ≥44px.

