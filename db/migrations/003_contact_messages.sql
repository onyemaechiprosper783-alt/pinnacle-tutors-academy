-- ============================================================================
-- CONTACT MESSAGES — run after 001_init_schema.sql and 002_rls_policies.sql
-- ============================================================================

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table contact_messages enable row level security;

-- Anyone (including anonymous visitors) can submit a message, but only
-- admins can read them back — this is a write-only mailbox from the
-- public's perspective.
create policy "Anyone can submit a contact message" on contact_messages
  for insert with check (true);

create policy "Admins can read contact messages" on contact_messages
  for select using (is_admin());

create policy "Admins can update contact messages" on contact_messages
  for update using (is_admin()) with check (is_admin());
