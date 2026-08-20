# Pinnacle Tutors Academy — Tutor Recruitment

A standalone recruitment website built separately from the existing Academy application.

## Stack
- Next.js + React + TypeScript
- Supabase PostgreSQL, Auth and private Storage
- Vercel deployment

## Routes
- `/` premium recruitment landing page
- `/apply` five-step application with local draft persistence
- `/admin` protected recruitment dashboard
- `/admin/setup` one-time first-admin bootstrap

## Supabase
The recruitment schema is deployed to project `letakjckpnpdiqwiuohc` and includes applications, event history, admin authorization and a private `tutor-documents` bucket.

## Environment
Copy `.env.example` to `.env.local` and configure the Supabase publishable key, server-only service role key, and a long bootstrap secret. Never expose the service role key to the browser.

## Vercel
Deploy this directory as the Vercel Root Directory (`tutor-recruitment`) from the `tutor-recruitment` branch. Configure the same environment variables in Production and Preview. After creating the first admin at `/admin/setup`, rotate/remove `ADMIN_BOOTSTRAP_SECRET`.
