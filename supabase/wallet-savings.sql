-- ============================================================
-- wallet-savings.sql
--
-- Adds a "Smart Save" sub-account to the SVS eWallet (see wallet.sql and
-- wallet-security-and-beneficiaries.sql).
--
-- Smart Save is intentionally NON-TRANSACTIONAL: there is no top-up,
-- transfer-to-others, spend, or withdraw-to-bank entry point for it. The
-- only two operations that exist (wallet_savings_deposit /
-- wallet_savings_withdraw below) move money exclusively between a user's
-- own main wallet (wallet_accounts) and their own Smart Save account
-- (wallet_savings_accounts) — never to or from anyone else. Only the main
-- wallet remains fully transactional (wallet_topup/transfer/spend/withdraw
-- in the other two files), and only the main wallet's operations require an
-- OTP — moving money between your own two accounts doesn't, since neither
-- side ever leaves your own wallet.
--
-- Smart Save always shares its owner's main-wallet currency (inherited at
-- creation, exactly like wallet_transfer's recipient-account bootstrap), so
-- moving money in either direction never needs cross-currency conversion
-- inside the database — the same convertAmount()-based conversion the main
-- wallet already offers for deposits/withdrawals in a different display
-- currency is reused client-side for Smart Save moves too.
--
-- Idempotent: safe to re-run.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.wallet_savings_accounts (
  user_email text primary key,
  balance numeric(14, 2) not null default 0 check (balance >= 0),
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Append-only ledger of Smart Save's own balance movements (separate from
-- wallet_transactions, which records the matching entry from the main
-- wallet's side — see the functions below).
create table if not exists public.wallet_savings_transactions (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  kind text not null check (kind in ('deposit', 'withdrawal')),
  direction text not null check (direction in ('credit', 'debit')),
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'USD',
  status text not null default 'completed' check (status in ('completed')),
  description text,
  created_at timestamptz not null default now()
);

create index if not exists wallet_savings_transactions_user_idx
  on public.wallet_savings_transactions (user_email, created_at desc);

alter table public.wallet_savings_accounts enable row level security;
alter table public.wallet_savings_transactions enable row level security;

-- Reads are public (matches the rest of the app). Writes only happen via
-- the SECURITY DEFINER functions below, so no insert/update/delete policies.
drop policy if exists "Public read wallet savings accounts" on public.wallet_savings_accounts;
create policy "Public read wallet savings accounts"
on public.wallet_savings_accounts
for select
using (true);

drop policy if exists "Public read wallet savings transactions" on public.wallet_savings_transactions;
create policy "Public read wallet savings transactions"
on public.wallet_savings_transactions
for select
using (true);

-- ---------------------------------------------------------------
-- Extend the existing wallet_transactions.kind allow-list with the two new
-- values these functions insert, instead of guessing the auto-generated
-- constraint name (which would silently no-op and leave the old, narrower
-- constraint in effect if the guess were wrong).
-- ---------------------------------------------------------------
do $$
declare
  v_constraint_name text;
begin
  select con.conname into v_constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'wallet_transactions'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%kind%';

  if v_constraint_name is not null then
    execute format('alter table public.wallet_transactions drop constraint %I', v_constraint_name);
  end if;

  alter table public.wallet_transactions
    add constraint wallet_transactions_kind_check
    check (kind in ('topup', 'transfer_in', 'transfer_out', 'withdrawal', 'purchase', 'refund', 'savings_out', 'savings_in'));
end $$;

-- Drop any earlier 3-arg (..., p_otp_id uuid) version of these functions
-- from before OTP was removed from Smart Save, so re-running this file
-- doesn't leave two overloaded versions behind.
drop function if exists public.wallet_savings_deposit(text, numeric, uuid);
drop function if exists public.wallet_savings_withdraw(text, numeric, uuid);

-- ---------------------------------------------------------------
-- Move money from the main wallet into Smart Save. No OTP — both sides of
-- this move stay inside the caller's own wallet.
-- ---------------------------------------------------------------
create or replace function public.wallet_savings_deposit(
  p_email text,
  p_amount numeric
)
returns public.wallet_savings_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_amount numeric := round(coalesce(p_amount, 0), 2);
  main_acct public.wallet_accounts;
  savings_acct public.wallet_savings_accounts;
begin
  if v_email is null or v_email = '' then
    raise exception 'A user email is required.';
  end if;
  if v_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  select * into main_acct
  from public.wallet_accounts
  where user_email = v_email
  for update;

  if not found then
    raise exception 'You do not have a wallet yet.';
  end if;
  if main_acct.balance < v_amount then
    raise exception 'Insufficient wallet balance.';
  end if;

  insert into public.wallet_savings_accounts (user_email, currency)
  values (v_email, main_acct.currency)
  on conflict (user_email) do nothing;

  update public.wallet_accounts
  set balance = balance - v_amount, updated_at = now()
  where user_email = v_email;

  update public.wallet_savings_accounts
  set balance = balance + v_amount, updated_at = now()
  where user_email = v_email
  returning * into savings_acct;

  insert into public.wallet_transactions
    (user_email, kind, direction, amount, currency, status, counterparty, description)
  values
    (v_email, 'savings_out', 'debit', v_amount, main_acct.currency, 'completed', 'Smart Save',
     'Moved to Smart Save');

  insert into public.wallet_savings_transactions
    (user_email, kind, direction, amount, currency, description)
  values
    (v_email, 'deposit', 'credit', v_amount, savings_acct.currency, 'Moved from main wallet');

  return savings_acct;
end;
$$;

-- ---------------------------------------------------------------
-- Move money from Smart Save back into the main wallet. No OTP, for the
-- same reason as above. This is the ONLY other place Smart Save funds can
-- go — there is deliberately no function that lets Smart Save pay a
-- purchase, transfer to another user, or withdraw to a bank account
-- directly.
-- ---------------------------------------------------------------
create or replace function public.wallet_savings_withdraw(
  p_email text,
  p_amount numeric
)
returns public.wallet_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_amount numeric := round(coalesce(p_amount, 0), 2);
  savings_acct public.wallet_savings_accounts;
  main_acct public.wallet_accounts;
begin
  if v_email is null or v_email = '' then
    raise exception 'A user email is required.';
  end if;
  if v_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  select * into savings_acct
  from public.wallet_savings_accounts
  where user_email = v_email
  for update;

  if not found or savings_acct.balance < v_amount then
    raise exception 'Insufficient Smart Save balance.';
  end if;

  select * into main_acct
  from public.wallet_accounts
  where user_email = v_email
  for update;

  if not found then
    raise exception 'You do not have a wallet yet.';
  end if;

  update public.wallet_savings_accounts
  set balance = balance - v_amount, updated_at = now()
  where user_email = v_email;

  update public.wallet_accounts
  set balance = balance + v_amount, updated_at = now()
  where user_email = v_email
  returning * into main_acct;

  insert into public.wallet_transactions
    (user_email, kind, direction, amount, currency, status, counterparty, description)
  values
    (v_email, 'savings_in', 'credit', v_amount, main_acct.currency, 'completed', 'Smart Save',
     'Moved from Smart Save');

  insert into public.wallet_savings_transactions
    (user_email, kind, direction, amount, currency, description)
  values
    (v_email, 'withdrawal', 'debit', v_amount, savings_acct.currency, 'Moved to main wallet');

  return main_acct;
end;
$$;

grant execute on function public.wallet_savings_deposit(text, numeric) to anon, authenticated;
grant execute on function public.wallet_savings_withdraw(text, numeric) to anon, authenticated;
