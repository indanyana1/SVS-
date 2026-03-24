create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  notification_key text not null,
  type text not null default 'info',
  title text not null,
  message text,
  href text,
  order_id text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_email, notification_key)
);

create index if not exists notifications_user_email_created_idx
  on public.notifications (user_email, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Public read notifications" on public.notifications;
create policy "Public read notifications"
on public.notifications
for select
using (true);

drop policy if exists "Public insert notifications" on public.notifications;
create policy "Public insert notifications"
on public.notifications
for insert
with check (true);

drop policy if exists "Public update notifications" on public.notifications;
create policy "Public update notifications"
on public.notifications
for update
using (true)
with check (true);

drop policy if exists "Public delete notifications" on public.notifications;
create policy "Public delete notifications"
on public.notifications
for delete
using (true);
