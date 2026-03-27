create extension if not exists pgcrypto;

create table if not exists public.account_users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email_address text not null unique,
  contact_number text unique,
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists account_users_email_address_idx
  on public.account_users (email_address);

create index if not exists account_users_contact_number_idx
  on public.account_users (contact_number);

alter table public.account_users enable row level security;

drop policy if exists "Public read account users" on public.account_users;
create policy "Public read account users"
on public.account_users
for select
using (true);

drop policy if exists "Public insert account users" on public.account_users;
create policy "Public insert account users"
on public.account_users
for insert
with check (true);

drop policy if exists "Public update account users" on public.account_users;
create policy "Public update account users"
on public.account_users
for update
using (true)
with check (true);

drop policy if exists "Public delete account users" on public.account_users;
create policy "Public delete account users"
on public.account_users
for delete
using (true);

create table if not exists public.seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_email text not null unique,
  business_name text,
  legal_full_name text,
  id_number text,
  business_type text,
  registration_number text,
  tax_number text,
  phone_number text,
  business_address_line1 text,
  city text,
  province text,
  postal_code text,
  country text,
  payout_account_holder text,
  payout_bank_name text,
  payout_account_number text,
  payout_branch_code text,
  return_contact_name text,
  return_contact_phone text,
  onboarding_completed boolean not null default false,
  compliance_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_profiles_compliance_status_check check (compliance_status in ('pending', 'submitted', 'approved', 'rejected'))
);

create index if not exists seller_profiles_user_email_idx
  on public.seller_profiles (user_email);

alter table public.seller_profiles enable row level security;

drop policy if exists "Public read seller profiles" on public.seller_profiles;
create policy "Public read seller profiles"
on public.seller_profiles
for select
using (true);

drop policy if exists "Public insert seller profiles" on public.seller_profiles;
create policy "Public insert seller profiles"
on public.seller_profiles
for insert
with check (true);

drop policy if exists "Public update seller profiles" on public.seller_profiles;
create policy "Public update seller profiles"
on public.seller_profiles
for update
using (true)
with check (true);

drop policy if exists "Public delete seller profiles" on public.seller_profiles;
create policy "Public delete seller profiles"
on public.seller_profiles
for delete
using (true);