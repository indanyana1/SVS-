-- Makes a banned seller's real-world identity stick, even if they delete
-- their account and sign up again with a new email: a small blocklist of
-- identifiers (ID number, payout bank account, phone, email) keyed off
-- `seller_profiles.compliance_status` going to 'rejected', plus an
-- append-only log of who changed their payout bank details and when.

create table if not exists public.banned_identifiers (
  id uuid primary key default gen_random_uuid(),
  identifier_type text not null check (identifier_type in ('id_number', 'payout_account_number', 'phone_number', 'email')),
  identifier_value text not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (identifier_type, identifier_value)
);

create index if not exists banned_identifiers_lookup_idx
  on public.banned_identifiers (identifier_type, identifier_value);

alter table public.banned_identifiers enable row level security;

-- The onboarding form needs to read this table to block a new signup that
-- reuses a banned identifier. No insert/update/delete policy is added for
-- anon/authenticated: rows are only ever written by the SECURITY DEFINER
-- trigger below, so a seller can never add, edit, or clear their own ban.
drop policy if exists "Public read banned identifiers" on public.banned_identifiers;
create policy "Public read banned identifiers"
on public.banned_identifiers
for select
using (true);

create or replace function public.ban_seller_identifiers_on_rejection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := concat('Seller profile rejected: ', coalesce(nullif(trim(new.business_name), ''), new.user_email));
begin
  if new.compliance_status = 'rejected' and coalesce(old.compliance_status, '') is distinct from 'rejected' then
    insert into public.banned_identifiers (identifier_type, identifier_value, reason)
    select identifier_type, identifier_value, v_reason
    from (values
      ('id_number', nullif(trim(new.id_number), '')),
      ('payout_account_number', nullif(trim(new.payout_account_number), '')),
      ('phone_number', nullif(trim(new.phone_number), '')),
      ('email', nullif(trim(new.user_email), ''))
    ) as identifiers(identifier_type, identifier_value)
    where identifier_value is not null
    on conflict (identifier_type, identifier_value) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists seller_profiles_ban_on_rejection on public.seller_profiles;
create trigger seller_profiles_ban_on_rejection
after update on public.seller_profiles
for each row
execute function public.ban_seller_identifiers_on_rejection();

create table if not exists public.seller_profile_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  field_name text not null,
  old_value text,
  new_value text,
  changed_at timestamptz not null default now()
);

create index if not exists seller_profile_audit_log_user_email_idx
  on public.seller_profile_audit_log (user_email, changed_at desc);

alter table public.seller_profile_audit_log enable row level security;
-- Intentionally zero policies, including select: this is forensic/admin-only
-- data, meant to be viewed via the Supabase SQL editor or a service-role
-- key. A seller must never be able to read or erase their own change
-- history, otherwise it isn't a trail.

create or replace function public.log_seller_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
  v_field text;
  v_tracked text[] := array['business_name', 'legal_full_name', 'phone_number', 'payout_account_holder', 'payout_bank_name', 'payout_account_number', 'payout_branch_code'];
begin
  foreach v_field in array v_tracked loop
    if coalesce(v_old ->> v_field, '') is distinct from coalesce(v_new ->> v_field, '') then
      insert into public.seller_profile_audit_log (user_email, field_name, old_value, new_value)
      values (new.user_email, v_field, v_old ->> v_field, v_new ->> v_field);
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists seller_profiles_audit_changes on public.seller_profiles;
create trigger seller_profiles_audit_changes
after update on public.seller_profiles
for each row
execute function public.log_seller_profile_changes();
