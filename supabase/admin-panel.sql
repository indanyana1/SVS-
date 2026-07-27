-- Admin panel: a real admin login (separate from the buyer/seller auth
-- model) plus the seller-approval workflow. Unlike account_users
-- (password_hash readable by anyone with the anon key, compared client-side
-- — a pre-existing weakness in this prototype), admin passwords are bcrypt
-- via pgcrypto and verified entirely server-side: the hash never reaches
-- the browser. admin_users/admin_sessions/admin_action_log intentionally
-- have ZERO RLS policies — every read/write goes through the
-- SECURITY DEFINER functions below.
--
-- Seed the first admin manually after applying this migration:
--   insert into admin_users (email, password_hash, full_name)
--   values ('owner@biznisdil.com', crypt('REPLACE_ME', gen_salt('bf')), 'Site Owner');

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  failed_login_count int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create table if not exists public.admin_sessions (
  token text primary key,
  admin_email text not null references public.admin_users(email) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now()
);

create index if not exists admin_sessions_admin_email_idx
  on public.admin_sessions (admin_email);

alter table public.admin_sessions enable row level security;

create table if not exists public.admin_action_log (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_action_log_created_idx
  on public.admin_action_log (created_at desc);

alter table public.admin_action_log enable row level security;

create or replace function public.admin_login(
  p_email text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text := lower(trim(p_email));
  v_admin public.admin_users;
  v_token text;
  v_expires_at timestamptz := now() + interval '12 hours';
begin
  -- Returns null (never raises) for every "expected" failure case below.
  -- Raising here would roll back the failed_login_count update in the same
  -- statement, which would silently defeat the lockout counter. The client
  -- treats a null/missing token as "invalid credentials".
  if v_email = '' or coalesce(p_password, '') = '' then
    return null;
  end if;

  select * into v_admin
  from public.admin_users
  where email = v_email
  for update;

  if not found then
    return null;
  end if;

  if v_admin.locked_until is not null and v_admin.locked_until > now() then
    return null;
  end if;

  if v_admin.password_hash <> crypt(p_password, v_admin.password_hash) then
    update public.admin_users
    set failed_login_count = failed_login_count + 1,
        locked_until = case when failed_login_count + 1 >= 5 then now() + interval '15 minutes' else locked_until end
    where email = v_email;

    return null;
  end if;

  update public.admin_users
  set failed_login_count = 0, locked_until = null
  where email = v_email;

  v_token := encode(gen_random_bytes(32), 'hex');

  insert into public.admin_sessions (token, admin_email, expires_at)
  values (v_token, v_email, v_expires_at);

  return jsonb_build_object('token', v_token, 'full_name', v_admin.full_name, 'expires_at', v_expires_at);
end;
$$;

create or replace function public.admin_verify_session(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.admin_sessions;
  v_admin public.admin_users;
begin
  if coalesce(p_token, '') = '' then
    raise exception 'Not signed in.';
  end if;

  select * into v_session
  from public.admin_sessions
  where token = p_token;

  if not found or v_session.expires_at < now() then
    raise exception 'Session expired. Sign in again.';
  end if;

  select * into v_admin
  from public.admin_users
  where email = v_session.admin_email;

  if not found then
    raise exception 'Session expired. Sign in again.';
  end if;

  update public.admin_sessions
  set last_seen_at = now()
  where token = p_token;

  return jsonb_build_object('admin_email', v_admin.email, 'full_name', v_admin.full_name);
end;
$$;

create or replace function public.admin_logout(
  p_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.admin_sessions where token = p_token;
end;
$$;

-- Shared by every other admin RPC below: raises if the token is missing,
-- unknown, or expired; otherwise returns the admin's email.
create or replace function public.admin_require_session(
  p_token text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.admin_sessions;
begin
  if coalesce(p_token, '') = '' then
    raise exception 'Not signed in.';
  end if;

  select * into v_session
  from public.admin_sessions
  where token = p_token;

  if not found or v_session.expires_at < now() then
    raise exception 'Session expired. Sign in again.';
  end if;

  update public.admin_sessions set last_seen_at = now() where token = p_token;

  return v_session.admin_email;
end;
$$;

create or replace function public.admin_review_seller(
  p_token text,
  p_user_email text,
  p_decision text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_email text := public.admin_require_session(p_token);
  v_previous_status text;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected.';
  end if;

  select compliance_status into v_previous_status
  from public.seller_profiles
  where user_email = lower(trim(p_user_email));

  if v_previous_status is null then
    raise exception 'Seller profile not found.';
  end if;

  update public.seller_profiles
  set compliance_status = p_decision, updated_at = now()
  where user_email = lower(trim(p_user_email));

  insert into public.admin_action_log (admin_email, action, target_type, target_id, details)
  values (
    v_admin_email,
    concat('seller_', p_decision),
    'seller_profile',
    lower(trim(p_user_email)),
    jsonb_build_object('previous_status', v_previous_status, 'notes', p_notes)
  );
end;
$$;

create or replace function public.admin_get_profile_audit_log(
  p_token text,
  p_user_email text default null,
  p_limit int default 200
)
returns setof public.seller_profile_audit_log
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_require_session(p_token);

  return query
  select *
  from public.seller_profile_audit_log
  where p_user_email is null or user_email = lower(trim(p_user_email))
  order by changed_at desc
  limit greatest(p_limit, 1);
end;
$$;

create or replace function public.admin_get_action_log(
  p_token text,
  p_limit int default 200
)
returns setof public.admin_action_log
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_require_session(p_token);

  return query
  select *
  from public.admin_action_log
  order by created_at desc
  limit greatest(p_limit, 1);
end;
$$;

create or replace function public.admin_log_action(
  p_token text,
  p_action text,
  p_target_type text,
  p_target_id text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_email text := public.admin_require_session(p_token);
begin
  insert into public.admin_action_log (admin_email, action, target_type, target_id, details)
  values (v_admin_email, p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb));
end;
$$;

grant execute on function public.admin_login(text, text) to anon, authenticated;
grant execute on function public.admin_verify_session(text) to anon, authenticated;
grant execute on function public.admin_logout(text) to anon, authenticated;
grant execute on function public.admin_review_seller(text, text, text, text) to anon, authenticated;
grant execute on function public.admin_get_profile_audit_log(text, text, int) to anon, authenticated;
grant execute on function public.admin_get_action_log(text, int) to anon, authenticated;
grant execute on function public.admin_log_action(text, text, text, text, jsonb) to anon, authenticated;
