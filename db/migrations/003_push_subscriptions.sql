-- Browser push subscriptions are tied to the authenticated student.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "Students manage their own push subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id or is_admin())
  with check (auth.uid() = user_id or is_admin());

create index if not exists push_subscriptions_user_id_idx on push_subscriptions(user_id);
