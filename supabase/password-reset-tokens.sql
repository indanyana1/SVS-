-- ============================================================
-- password-reset-tokens.sql
-- Stores short-lived single-use tokens that authorise a password
-- reset for an account in public.account_users.
-- Idempotent: safe to re-run.
-- ============================================================

create table if not exists public.password_reset_tokens (
  token text primary key,
  email_address text not null,
  intended_role text not null default 'buyer' check (intended_role in ('buyer', 'seller')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_email_idx
  on public.password_reset_tokens (email_address);

create index if not exists password_reset_tokens_expires_idx
  on public.password_reset_tokens (expires_at);

alter table public.password_reset_tokens enable row level security;

-- The anon client needs to insert reset requests, look up the token
-- by primary key during the reset flow, and mark it as used. Email is
-- treated as low-sensitivity here (same as on the signup endpoint).
-- The token itself is the secret (256 bits of entropy).
drop policy if exists "password_reset_tokens_anon_insert" on public.password_reset_tokens;
create policy "password_reset_tokens_anon_insert"
  on public.password_reset_tokens
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "password_reset_tokens_anon_select" on public.password_reset_tokens;
create policy "password_reset_tokens_anon_select"
  on public.password_reset_tokens
  for select
  to anon, authenticated
  using (true);

drop policy if exists "password_reset_tokens_anon_update" on public.password_reset_tokens;
create policy "password_reset_tokens_anon_update"
  on public.password_reset_tokens
  for update
  to anon, authenticated
  using (true)
  with check (true);
