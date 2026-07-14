-- Admin biometric login via WebAuthn (Face ID / fingerprint / Windows Hello)
-- Run this in the Supabase SQL Editor after admin-panel.sql

-- Stored credentials (one row per registered device per admin)
create table if not exists public.admin_webauthn_credentials (
  id             uuid primary key default gen_random_uuid(),
  admin_email    text not null references public.admin_users(email) on delete cascade,
  credential_id  text not null unique,
  public_key     text not null,   -- base64-encoded COSE public key
  counter        bigint not null default 0,
  device_name    text not null default 'Unknown device',
  created_at     timestamptz not null default now()
);

create index if not exists admin_webauthn_creds_email_idx
  on public.admin_webauthn_credentials (admin_email);

-- Short-lived challenges (5-minute TTL, deleted after use)
create table if not exists public.admin_webauthn_challenges (
  id           uuid primary key default gen_random_uuid(),
  admin_email  text not null,
  challenge    text not null,
  type         text not null check (type in ('registration', 'authentication')),
  expires_at   timestamptz not null default (now() + interval '5 minutes'),
  created_at   timestamptz not null default now()
);

-- No public access — only accessible via service-role key (Edge Functions)
alter table public.admin_webauthn_credentials enable row level security;
alter table public.admin_webauthn_challenges enable row level security;

create policy "webauthn_creds_no_public_access"
  on public.admin_webauthn_credentials for all using (false);

create policy "webauthn_challenges_no_public_access"
  on public.admin_webauthn_challenges for all using (false);

-- Issues an admin session token after a successful WebAuthn authentication.
-- Called only from the Edge Function (service-role key) — never directly
-- from the browser.
create or replace function public.admin_webauthn_issue_token(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email      text := lower(trim(p_email));
  v_admin      public.admin_users;
  v_token      text;
  v_expires_at timestamptz := now() + interval '12 hours';
begin
  select * into v_admin
  from public.admin_users
  where email = v_email;

  if not found then
    raise exception 'Admin not found.';
  end if;

  if v_admin.locked_until is not null and v_admin.locked_until > now() then
    raise exception 'Account locked.';
  end if;

  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  insert into public.admin_sessions (token, admin_email, expires_at)
  values (v_token, v_email, v_expires_at);

  return jsonb_build_object(
    'token',      v_token,
    'full_name',  v_admin.full_name,
    'expires_at', v_expires_at
  );
end;
$$;
