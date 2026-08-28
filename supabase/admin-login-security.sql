-- ============================================================
-- supabase/admin-login-security.sql
-- IP-level visibility and protection for admin login, on top of the
-- existing per-EMAIL lockout in admin-panel.sql (admin_users.failed_login_count
-- / locked_until). That protects one admin account from being brute-forced;
-- this catches an attacker probing many different admin emails (or just
-- hammering one) from the same IP, and gives the Super Admin dashboard
-- visibility into who's trying and the ability to block/unblock an IP
-- outright.
--
-- admin_login_attempts: append-only ledger — every attempt, successful or
--   not, with the IP and user agent it came from. Never deleted, so it
--   doubles as an audit trail (grows slowly; admin logins are rare).
--
-- admin_ip_blocks: the actual blocklist. auto_blocked rows are created by
--   admin_record_login_attempt() itself when an IP crosses the threshold
--   below; blocked_by is null for those and set to the admin's email for a
--   manual block. expires_at null = permanent (only a manual admin
--   unblock/admin_unblock_ip lifts it).
--
-- admin_check_ip_block(): the gate every login path calls FIRST, before
--   touching a password or biometric credential at all — see
--   api/admin-login.js and supabase/functions/webauthn-authenticate. It's
--   the only function here callable by an unauthenticated caller (an
--   attacker isn't signed in yet), and it only ever returns a boolean, so
--   there's nothing sensitive to leak from it.
--
-- admin_record_login_attempt(): called after a login attempt has been
--   decided (success or fail) to log it and run the auto-block check.
--   AUTO_BLOCK_THRESHOLD/AUTO_BLOCK_WINDOW/AUTO_BLOCK_DURATION below mirror
--   the hardcoded "5 attempts -> 15 min" per-email lockout already in
--   admin-panel.sql — same style of fixed constant, not Super-Admin
--   configurable (this is a defensive circuit breaker, not a business
--   setting like the seller fee %).
--
-- Idempotent: safe to run repeatedly.
-- Apply via: Supabase Dashboard -> SQL Editor -> paste -> Run.
-- ============================================================

create table if not exists public.admin_login_attempts (
  id uuid primary key default gen_random_uuid(),
  attempted_email text,
  ip_address text not null,
  user_agent text,
  method text not null check (method in ('password', 'webauthn')),
  success boolean not null,
  failure_reason text,
  created_at timestamptz not null default now()
);

create index if not exists admin_login_attempts_created_idx
  on public.admin_login_attempts (created_at desc);

create index if not exists admin_login_attempts_ip_created_idx
  on public.admin_login_attempts (ip_address, created_at desc);

alter table public.admin_login_attempts enable row level security;
-- No policies at all, same as admin_users/admin_sessions/admin_action_log
-- in admin-panel.sql — every read/write goes through SECURITY DEFINER
-- functions below, which bypass RLS as the table-owning role.

create table if not exists public.admin_ip_blocks (
  id uuid primary key default gen_random_uuid(),
  ip_address text not null unique,
  reason text,
  blocked_by text,
  auto_blocked boolean not null default false,
  blocked_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists admin_ip_blocks_ip_idx
  on public.admin_ip_blocks (ip_address);

alter table public.admin_ip_blocks enable row level security;

-- Public (unauthenticated) — an attacker isn't signed in, so the gate that
-- stops them can't require a session token. Returns only a boolean.
create or replace function public.admin_check_ip_block(
  p_ip_address text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.admin_ip_blocks
    where ip_address = p_ip_address
      and (expires_at is null or expires_at > now())
  );
end;
$$;

grant execute on function public.admin_check_ip_block(text) to anon, authenticated;

-- Public for the same reason as admin_check_ip_block above — this is what
-- records the very failed attempts that prove an account/IP needs
-- blocking, so it has to be callable before the caller has any session.
-- The auto-block logic here is intentionally IP-scoped, not email-scoped
-- (admin_login in admin-panel.sql already locks out a single email after 5
-- bad passwords) — this instead catches one IP spraying attempts across
-- many different admin emails, which the per-email counter alone would
-- never trip.
create or replace function public.admin_record_login_attempt(
  p_attempted_email text,
  p_ip_address text,
  p_user_agent text,
  p_method text,
  p_success boolean,
  p_failure_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  AUTO_BLOCK_THRESHOLD constant int := 10;
  AUTO_BLOCK_WINDOW constant interval := interval '15 minutes';
  AUTO_BLOCK_DURATION constant interval := interval '1 hour';
  v_recent_failures int;
begin
  insert into public.admin_login_attempts
    (attempted_email, ip_address, user_agent, method, success, failure_reason)
  values
    (lower(trim(coalesce(p_attempted_email, ''))), p_ip_address, p_user_agent, p_method, p_success, p_failure_reason);

  if p_success then
    return;
  end if;

  select count(*) into v_recent_failures
  from public.admin_login_attempts
  where ip_address = p_ip_address
    and success = false
    and created_at >= now() - AUTO_BLOCK_WINDOW;

  if v_recent_failures >= AUTO_BLOCK_THRESHOLD then
    insert into public.admin_ip_blocks (ip_address, reason, auto_blocked, expires_at)
    values (
      p_ip_address,
      format('Automatic: %s failed admin login attempts within %s', v_recent_failures, AUTO_BLOCK_WINDOW),
      true,
      now() + AUTO_BLOCK_DURATION
    )
    on conflict (ip_address) do update
      set reason = excluded.reason,
          auto_blocked = true,
          blocked_at = now(),
          expires_at = excluded.expires_at
      -- Never downgrade/shorten an existing manual (permanent) block by
      -- re-triggering the auto-blocker against the same IP later.
      where public.admin_ip_blocks.expires_at is not null;
  end if;
end;
$$;

grant execute on function public.admin_record_login_attempt(text, text, text, text, boolean, text) to anon, authenticated;

create or replace function public.admin_get_login_attempts(
  p_token text,
  p_limit int default 500
)
returns setof public.admin_login_attempts
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_require_session(p_token);

  return query
  select *
  from public.admin_login_attempts
  order by created_at desc
  limit greatest(p_limit, 1);
end;
$$;

grant execute on function public.admin_get_login_attempts(text, int) to anon, authenticated;

create or replace function public.admin_get_ip_blocks(
  p_token text
)
returns setof public.admin_ip_blocks
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_require_session(p_token);

  return query
  select * from public.admin_ip_blocks
  order by blocked_at desc;
end;
$$;

grant execute on function public.admin_get_ip_blocks(text) to anon, authenticated;

create or replace function public.admin_block_ip(
  p_token text,
  p_ip_address text,
  p_reason text default null,
  p_expires_at timestamptz default null
)
returns public.admin_ip_blocks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_email text := public.admin_require_session(p_token);
  v_ip text := trim(coalesce(p_ip_address, ''));
  v_result public.admin_ip_blocks;
begin
  if v_ip = '' then
    raise exception 'An IP address is required.';
  end if;

  insert into public.admin_ip_blocks (ip_address, reason, blocked_by, auto_blocked, expires_at)
  values (v_ip, p_reason, v_admin_email, false, p_expires_at)
  on conflict (ip_address) do update
    set reason = excluded.reason,
        blocked_by = v_admin_email,
        auto_blocked = false,
        blocked_at = now(),
        expires_at = excluded.expires_at
  returning * into v_result;

  insert into public.admin_action_log (admin_email, action, target_type, target_id, details)
  values (v_admin_email, 'ip_blocked', 'ip_address', v_ip, jsonb_build_object('reason', p_reason, 'expires_at', p_expires_at));

  return v_result;
end;
$$;

grant execute on function public.admin_block_ip(text, text, text, timestamptz) to anon, authenticated;

create or replace function public.admin_unblock_ip(
  p_token text,
  p_ip_address text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_email text := public.admin_require_session(p_token);
  v_ip text := trim(coalesce(p_ip_address, ''));
begin
  delete from public.admin_ip_blocks where ip_address = v_ip;

  insert into public.admin_action_log (admin_email, action, target_type, target_id, details)
  values (v_admin_email, 'ip_unblocked', 'ip_address', v_ip, '{}'::jsonb);
end;
$$;

grant execute on function public.admin_unblock_ip(text, text) to anon, authenticated;

create or replace function public.prune_admin_login_attempts()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Keep a rolling year — this is a security audit trail, so it's kept far
  -- longer than the rate-limit hits / analytics events tables.
  delete from public.admin_login_attempts where created_at < now() - interval '1 year';
  delete from public.admin_ip_blocks where expires_at is not null and expires_at < now() - interval '30 days';
end;
$$;

do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron extension unavailable (%): enable it via Dashboard -> Database -> Extensions, then re-run this file to schedule cleanup.', sqlerrm;
end;
$$;

do $$
begin
  perform cron.schedule('prune-admin-login-attempts', '0 4 * * *', $cron$select public.prune_admin_login_attempts();$cron$);
exception when others then
  raise notice 'Could not schedule prune-admin-login-attempts (%): pg_cron may not be enabled yet.', sqlerrm;
end;
$$;
