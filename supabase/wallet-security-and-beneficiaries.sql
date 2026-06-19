-- ============================================================
-- wallet-security-and-beneficiaries.sql
--
-- Adds to the SVS eWallet (see wallet.sql):
--   1. Email one-time-code (OTP) confirmation, required before every
--      wallet money movement (top-up, transfer, withdrawal, spend).
--      Codes are generated + hashed server-side and never exposed via
--      a public SELECT — unlike the rest of this schema, this table
--      intentionally has NO client-facing RLS policies. All access
--      goes through the SECURITY DEFINER functions below.
--   2. A saved beneficiary address book for transfers (only
--      registered SVS users can be added).
--   3. Saved bank accounts + a manual-review withdrawal request
--      queue, mirroring the existing seller-payouts flow — no live
--      bank disbursement happens automatically.
--
-- Idempotent: safe to re-run.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- OTP codes
-- ---------------------------------------------------------------
create table if not exists public.wallet_otp_codes (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  purpose text not null check (purpose in ('topup', 'transfer', 'withdraw', 'spend')),
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists wallet_otp_codes_lookup_idx
  on public.wallet_otp_codes (user_email, purpose, created_at desc);

alter table public.wallet_otp_codes enable row level security;
-- Intentionally no policies for anon/authenticated: the code hash must
-- never be readable by a client query. Every read/write happens inside
-- the SECURITY DEFINER functions below, which bypass RLS.

-- Generates a 6-digit code, stores only its SHA-256 hash, and returns
-- the PLAINTEXT code exactly once to the caller. The caller (see
-- src/lib/walletOtp.js) must email it immediately via EmailJS and must
-- never log, store, or display it elsewhere.
create or replace function public.wallet_request_otp(
  p_email text,
  p_purpose text
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text := lower(trim(p_email));
  v_code text;
  v_recent timestamptz;
begin
  if v_email is null or v_email = '' then
    raise exception 'A user email is required.';
  end if;
  if p_purpose not in ('topup', 'transfer', 'withdraw', 'spend') then
    raise exception 'Unknown OTP purpose.';
  end if;

  select created_at into v_recent
  from public.wallet_otp_codes
  where user_email = v_email and purpose = p_purpose
  order by created_at desc
  limit 1;

  if v_recent is not null and v_recent > now() - interval '30 seconds' then
    raise exception 'Please wait before requesting another code.';
  end if;

  -- Invalidate any still-pending code for this email + purpose.
  update public.wallet_otp_codes
  set expires_at = now()
  where user_email = v_email and purpose = p_purpose and redeemed_at is null;

  v_code := lpad(floor(random() * 1000000)::text, 6, '0');

  insert into public.wallet_otp_codes (user_email, purpose, code_hash, expires_at)
  values (v_email, p_purpose, encode(digest(v_code, 'sha256'), 'hex'), now() + interval '10 minutes');

  return v_code;
end;
$$;

-- Verifies a code against its stored hash. Returns the OTP row id (to
-- pass on to the wallet_* function that performs the actual money
-- movement) on success; raises on mismatch/expiry/lockout.
create or replace function public.wallet_verify_otp(
  p_email text,
  p_purpose text,
  p_code text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text := lower(trim(p_email));
  v_row public.wallet_otp_codes;
begin
  select * into v_row
  from public.wallet_otp_codes
  where user_email = v_email and purpose = p_purpose and redeemed_at is null
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'No pending code for this action. Request a new one.';
  end if;
  if v_row.expires_at < now() then
    raise exception 'That code has expired. Request a new one.';
  end if;
  if v_row.attempts >= 5 then
    raise exception 'Too many incorrect attempts. Request a new code.';
  end if;

  if v_row.code_hash <> encode(digest(coalesce(trim(p_code), ''), 'sha256'), 'hex') then
    update public.wallet_otp_codes set attempts = attempts + 1 where id = v_row.id;
    raise exception 'Incorrect code.';
  end if;

  update public.wallet_otp_codes set verified_at = now() where id = v_row.id;

  return v_row.id;
end;
$$;

-- Consumes a verified OTP exactly once. Called at the top of every
-- wallet_* mutation below so the gate is enforced in the database, not
-- just the UI — calling those RPCs directly without a fresh, matching
-- verification is rejected.
create or replace function public.wallet_redeem_otp(
  p_otp_id uuid,
  p_email text,
  p_purpose text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_id uuid;
begin
  if p_otp_id is null then
    raise exception 'A verification code is required for this action.';
  end if;

  update public.wallet_otp_codes
  set redeemed_at = now()
  where id = p_otp_id
    and user_email = v_email
    and purpose = p_purpose
    and verified_at is not null
    and verified_at > now() - interval '5 minutes'
    and redeemed_at is null
  returning id into v_id;

  if v_id is null then
    raise exception 'Verification expired or already used. Please verify again.';
  end if;
end;
$$;

grant execute on function public.wallet_request_otp(text, text) to anon, authenticated;
grant execute on function public.wallet_verify_otp(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------
-- Beneficiaries — only registered SVS users can be saved, so
-- transfers always resolve to a real account. Public RLS, same trust
-- model as the rest of this app (cart_items, wishlist_items, etc.) —
-- this is an address book, not a secret.
-- ---------------------------------------------------------------
create table if not exists public.wallet_beneficiaries (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null,
  beneficiary_email text not null,
  beneficiary_phone text,
  beneficiary_name text,
  nickname text,
  created_at timestamptz not null default now(),
  unique (owner_email, beneficiary_email)
);

create index if not exists wallet_beneficiaries_owner_idx
  on public.wallet_beneficiaries (owner_email, created_at desc);

alter table public.wallet_beneficiaries enable row level security;

drop policy if exists "Public read wallet beneficiaries" on public.wallet_beneficiaries;
create policy "Public read wallet beneficiaries"
on public.wallet_beneficiaries for select using (true);

drop policy if exists "Public insert wallet beneficiaries" on public.wallet_beneficiaries;
create policy "Public insert wallet beneficiaries"
on public.wallet_beneficiaries for insert with check (true);

drop policy if exists "Public update wallet beneficiaries" on public.wallet_beneficiaries;
create policy "Public update wallet beneficiaries"
on public.wallet_beneficiaries for update using (true) with check (true);

drop policy if exists "Public delete wallet beneficiaries" on public.wallet_beneficiaries;
create policy "Public delete wallet beneficiaries"
on public.wallet_beneficiaries for delete using (true);

-- ---------------------------------------------------------------
-- Saved bank accounts for withdrawals.
-- ---------------------------------------------------------------
create table if not exists public.wallet_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  account_holder text not null,
  bank_name text not null,
  account_number text not null,
  branch_code text,
  account_type text,
  nickname text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists wallet_bank_accounts_user_idx
  on public.wallet_bank_accounts (user_email, created_at desc);

alter table public.wallet_bank_accounts enable row level security;

drop policy if exists "Public read wallet bank accounts" on public.wallet_bank_accounts;
create policy "Public read wallet bank accounts"
on public.wallet_bank_accounts for select using (true);

drop policy if exists "Public insert wallet bank accounts" on public.wallet_bank_accounts;
create policy "Public insert wallet bank accounts"
on public.wallet_bank_accounts for insert with check (true);

drop policy if exists "Public update wallet bank accounts" on public.wallet_bank_accounts;
create policy "Public update wallet bank accounts"
on public.wallet_bank_accounts for update using (true) with check (true);

drop policy if exists "Public delete wallet bank accounts" on public.wallet_bank_accounts;
create policy "Public delete wallet bank accounts"
on public.wallet_bank_accounts for delete using (true);

-- ---------------------------------------------------------------
-- Withdrawal requests — the admin-facing manual-review queue. Rows
-- are only ever created by wallet_withdraw() (SECURITY DEFINER), so
-- there is deliberately no public insert policy.
-- ---------------------------------------------------------------
create table if not exists public.wallet_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'USD',
  bank_account_id uuid references public.wallet_bank_accounts(id) on delete set null,
  destination_label text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'paid', 'rejected')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists wallet_withdrawal_requests_user_idx
  on public.wallet_withdrawal_requests (user_email, requested_at desc);

alter table public.wallet_withdrawal_requests enable row level security;

drop policy if exists "Public read wallet withdrawal requests" on public.wallet_withdrawal_requests;
create policy "Public read wallet withdrawal requests"
on public.wallet_withdrawal_requests for select using (true);

drop policy if exists "Public update wallet withdrawal requests" on public.wallet_withdrawal_requests;
create policy "Public update wallet withdrawal requests"
on public.wallet_withdrawal_requests for update using (true) with check (true);

-- ---------------------------------------------------------------
-- Re-published wallet_* functions: each now requires a fresh OTP
-- verification id, redeemed via wallet_redeem_otp() above. Adding a
-- trailing default parameter via CREATE OR REPLACE keeps these the
-- same function objects (Postgres explicitly allows this), so the
-- grants in wallet.sql keep working — they're re-stated below anyway
-- for clarity.
-- ---------------------------------------------------------------

create or replace function public.wallet_topup(
  p_email text,
  p_amount numeric,
  p_currency text default 'USD',
  p_method text default 'card',
  p_reference text default null,
  p_otp_id uuid default null
)
returns public.wallet_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  acct public.wallet_accounts;
  v_email text := lower(trim(p_email));
  v_amount numeric := round(coalesce(p_amount, 0), 2);
begin
  if v_email is null or v_email = '' then
    raise exception 'A user email is required.';
  end if;
  if v_amount <= 0 then
    raise exception 'Top-up amount must be greater than zero.';
  end if;

  perform public.wallet_redeem_otp(p_otp_id, v_email, 'topup');

  insert into public.wallet_accounts (user_email, currency)
  values (v_email, coalesce(nullif(trim(p_currency), ''), 'USD'))
  on conflict (user_email) do nothing;

  update public.wallet_accounts
  set balance = balance + v_amount, updated_at = now()
  where user_email = v_email
  returning * into acct;

  insert into public.wallet_transactions
    (user_email, kind, direction, amount, currency, status, reference, description)
  values
    (v_email, 'topup', 'credit', v_amount, acct.currency, 'completed', p_reference,
     concat('Added funds via ', coalesce(nullif(trim(p_method), ''), 'card')));

  return acct;
end;
$$;

create or replace function public.wallet_transfer(
  p_from text,
  p_to text,
  p_amount numeric,
  p_note text default null,
  p_otp_id uuid default null
)
returns public.wallet_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  from_acct public.wallet_accounts;
  v_from text := lower(trim(p_from));
  v_to text := lower(trim(p_to));
  v_amount numeric := round(coalesce(p_amount, 0), 2);
begin
  if v_from is null or v_from = '' or v_to is null or v_to = '' then
    raise exception 'Both sender and recipient are required.';
  end if;
  if v_from = v_to then
    raise exception 'You cannot send money to yourself.';
  end if;
  if v_amount <= 0 then
    raise exception 'Transfer amount must be greater than zero.';
  end if;

  perform public.wallet_redeem_otp(p_otp_id, v_from, 'transfer');

  select * into from_acct
  from public.wallet_accounts
  where user_email = v_from
  for update;

  if not found then
    raise exception 'You do not have a wallet yet.';
  end if;
  if from_acct.balance < v_amount then
    raise exception 'Insufficient wallet balance.';
  end if;

  insert into public.wallet_accounts (user_email, currency)
  values (v_to, from_acct.currency)
  on conflict (user_email) do nothing;

  update public.wallet_accounts
  set balance = balance - v_amount, updated_at = now()
  where user_email = v_from
  returning * into from_acct;

  update public.wallet_accounts
  set balance = balance + v_amount, updated_at = now()
  where user_email = v_to;

  insert into public.wallet_transactions
    (user_email, kind, direction, amount, currency, status, counterparty, description)
  values
    (v_from, 'transfer_out', 'debit', v_amount, from_acct.currency, 'completed', v_to,
     coalesce(nullif(trim(p_note), ''), concat('Sent to ', v_to)));

  insert into public.wallet_transactions
    (user_email, kind, direction, amount, currency, status, counterparty, description)
  values
    (v_to, 'transfer_in', 'credit', v_amount, from_acct.currency, 'completed', v_from,
     coalesce(nullif(trim(p_note), ''), concat('Received from ', v_from)));

  return from_acct;
end;
$$;

create or replace function public.wallet_spend(
  p_email text,
  p_amount numeric,
  p_reference text default null,
  p_description text default null,
  p_otp_id uuid default null
)
returns public.wallet_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  acct public.wallet_accounts;
  v_email text := lower(trim(p_email));
  v_amount numeric := round(coalesce(p_amount, 0), 2);
begin
  if v_email is null or v_email = '' then
    raise exception 'A user email is required.';
  end if;
  if v_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  perform public.wallet_redeem_otp(p_otp_id, v_email, 'spend');

  select * into acct
  from public.wallet_accounts
  where user_email = v_email
  for update;

  if not found then
    raise exception 'You do not have a wallet yet.';
  end if;
  if acct.balance < v_amount then
    raise exception 'Insufficient wallet balance.';
  end if;

  update public.wallet_accounts
  set balance = balance - v_amount, updated_at = now()
  where user_email = v_email
  returning * into acct;

  insert into public.wallet_transactions
    (user_email, kind, direction, amount, currency, status, reference, description)
  values
    (v_email, 'purchase', 'debit', v_amount, acct.currency, 'completed', p_reference,
     coalesce(nullif(trim(p_description), ''), 'Wallet purchase'));

  return acct;
end;
$$;

create or replace function public.wallet_withdraw(
  p_email text,
  p_amount numeric,
  p_destination text default null,
  p_bank_account_id uuid default null,
  p_otp_id uuid default null
)
returns public.wallet_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  acct public.wallet_accounts;
  bank public.wallet_bank_accounts;
  v_email text := lower(trim(p_email));
  v_amount numeric := round(coalesce(p_amount, 0), 2);
  v_destination_label text := p_destination;
begin
  if v_email is null or v_email = '' then
    raise exception 'A user email is required.';
  end if;
  if v_amount <= 0 then
    raise exception 'Withdrawal amount must be greater than zero.';
  end if;

  perform public.wallet_redeem_otp(p_otp_id, v_email, 'withdraw');

  if p_bank_account_id is not null then
    select * into bank
    from public.wallet_bank_accounts
    where id = p_bank_account_id and user_email = v_email;

    if not found then
      raise exception 'Bank account not found.';
    end if;
    v_destination_label := concat(bank.bank_name, ' •••• ', right(bank.account_number, 4));
  end if;

  select * into acct
  from public.wallet_accounts
  where user_email = v_email
  for update;

  if not found then
    raise exception 'You do not have a wallet yet.';
  end if;
  if acct.balance < v_amount then
    raise exception 'Insufficient wallet balance.';
  end if;

  update public.wallet_accounts
  set balance = balance - v_amount, updated_at = now()
  where user_email = v_email
  returning * into acct;

  insert into public.wallet_transactions
    (user_email, kind, direction, amount, currency, status, counterparty, description)
  values
    (v_email, 'withdrawal', 'debit', v_amount, acct.currency, 'pending', v_destination_label,
     'Withdrawal request');

  insert into public.wallet_withdrawal_requests
    (user_email, amount, currency, bank_account_id, destination_label, status)
  values
    (v_email, v_amount, acct.currency, p_bank_account_id, v_destination_label, 'pending');

  return acct;
end;
$$;

-- System-issued refund (e.g. reversing a wallet payment when an order
-- could not be placed after the charge already went through).
-- Deliberately has NO OTP requirement: it only ever runs as an
-- automatic compensation for a spend that was already OTP-approved
-- moments earlier — it is not a new user-initiated deposit.
create or replace function public.wallet_refund(
  p_email text,
  p_amount numeric,
  p_reference text default null,
  p_description text default null
)
returns public.wallet_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  acct public.wallet_accounts;
  v_email text := lower(trim(p_email));
  v_amount numeric := round(coalesce(p_amount, 0), 2);
begin
  if v_email is null or v_email = '' then
    raise exception 'A user email is required.';
  end if;
  if v_amount <= 0 then
    raise exception 'Refund amount must be greater than zero.';
  end if;

  insert into public.wallet_accounts (user_email)
  values (v_email)
  on conflict (user_email) do nothing;

  update public.wallet_accounts
  set balance = balance + v_amount, updated_at = now()
  where user_email = v_email
  returning * into acct;

  insert into public.wallet_transactions
    (user_email, kind, direction, amount, currency, status, reference, description)
  values
    (v_email, 'refund', 'credit', v_amount, acct.currency, 'completed', p_reference,
     coalesce(nullif(trim(p_description), ''), 'Refund'));

  return acct;
end;
$$;

grant execute on function public.wallet_topup(text, numeric, text, text, text, uuid) to anon, authenticated;
grant execute on function public.wallet_transfer(text, text, numeric, text, uuid) to anon, authenticated;
grant execute on function public.wallet_spend(text, numeric, text, text, uuid) to anon, authenticated;
grant execute on function public.wallet_withdraw(text, numeric, text, uuid, uuid) to anon, authenticated;
grant execute on function public.wallet_refund(text, numeric, text, text) to anon, authenticated;
