create extension if not exists pgcrypto;

create table if not exists public.support_chat_threads (
  id uuid primary key default gen_random_uuid(),
  thread_key text not null unique,
  participants jsonb not null default '[]'::jsonb,
  participant_names jsonb not null default '{}'::jsonb,
  issue_type text not null default 'General Support',
  order_id text,
  order_reference text,
  item_details jsonb,
  last_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_chat_threads_updated_idx
  on public.support_chat_threads (updated_at desc);

create index if not exists support_chat_threads_participants_gin_idx
  on public.support_chat_threads using gin (participants);

create table if not exists public.support_chat_messages (
  id uuid primary key default gen_random_uuid(),
  message_key text not null unique,
  thread_key text not null references public.support_chat_threads(thread_key) on delete cascade,
  sender_email text not null,
  sender_name text,
  sender_role text not null default 'client',
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Per-message metadata for WhatsApp-style features (reactions, pins, read
-- receipts, disappearing timers, forwarded flag). Added via alter so existing
-- deployments pick it up without recreating the table.
alter table public.support_chat_messages
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists support_chat_messages_thread_created_idx
  on public.support_chat_messages (thread_key, created_at asc);

create index if not exists support_chat_messages_sender_idx
  on public.support_chat_messages (sender_email, created_at desc);

alter table public.support_chat_threads enable row level security;
alter table public.support_chat_messages enable row level security;

drop policy if exists "Public read support chat threads" on public.support_chat_threads;
create policy "Public read support chat threads"
on public.support_chat_threads
for select
using (true);

drop policy if exists "Public insert support chat threads" on public.support_chat_threads;
create policy "Public insert support chat threads"
on public.support_chat_threads
for insert
with check (true);

drop policy if exists "Public update support chat threads" on public.support_chat_threads;
create policy "Public update support chat threads"
on public.support_chat_threads
for update
using (true)
with check (true);

drop policy if exists "Public delete support chat threads" on public.support_chat_threads;
create policy "Public delete support chat threads"
on public.support_chat_threads
for delete
using (true);

drop policy if exists "Public read support chat messages" on public.support_chat_messages;
create policy "Public read support chat messages"
on public.support_chat_messages
for select
using (true);

drop policy if exists "Public insert support chat messages" on public.support_chat_messages;
create policy "Public insert support chat messages"
on public.support_chat_messages
for insert
with check (true);

drop policy if exists "Public update support chat messages" on public.support_chat_messages;
create policy "Public update support chat messages"
on public.support_chat_messages
for update
using (true)
with check (true);

drop policy if exists "Public delete support chat messages" on public.support_chat_messages;
create policy "Public delete support chat messages"
on public.support_chat_messages
for delete
using (true);
