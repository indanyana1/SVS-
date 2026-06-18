-- SVS eWallet
-- Customers can store money on the platform, spend it on items, send it to
-- other registered users, and request withdrawals back to their bank account.
--
-- All balance changes go through SECURITY DEFINER functions that lock the
-- account row (for update) and validate the balance, so concurrent operations
-- can never drive a wallet negative. The client only ever reads balances and
-- transactions directly.

create extension if not exists pgcrypto;

-- Wallet balance per user (single currency per wallet).
create table if not exists public.wallet_accounts (
  user_email text primary key,
  balance numeric(14, 2) not null default 0 check (balance >= 0),
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Append-only ledger of every wallet movement.
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  kind text not null check (kind in ('topup', 'transfer_in', 'transfer_out', 'withdrawal', 'purchase', 'refund')),
  direction text not null check (direction in ('credit', 'debit')),
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'USD',
  status text not null default 'completed' check (status in ('completed', 'pending', 'rejected')),
  counterparty text,
  reference text,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_user_idx
  on public.wallet_transactions (user_email, created_at desc);
create index if not exists wallet_transactions_status_idx
  on public.wallet_transactions (status, created_at desc);

alter table public.wallet_accounts enable row level security;
alter table public.wallet_transactions enable row level security;

-- Reads are public (matches the rest of the app). Writes are only allowed via
-- the SECURITY DEFINER functions below, so no direct insert/update policies.
drop policy if exists "Public read wallet accounts" on public.wallet_accounts;
create policy "Public read wallet accounts"
on public.wallet_accounts
for select
using (true);

drop policy if exists "Public read wallet transactions" on public.wallet_transactions;
create policy "Public read wallet transactions"
on public.wallet_transactions
for select
using (true);

-- Make sure an account row exists for a user.
create or replace function public.wallet_ensure_account(
  p_email text,
  p_currency text default 'USD'
)
returns public.wallet_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  acct public.wallet_accounts;
  v_email text := lower(trim(p_email));
begin
  if v_email is null or v_email = '' then
    raise exception 'A user email is required.';
  end if;

  insert into public.wallet_accounts (user_email, currency)
  values (v_email, coalesce(nullif(trim(p_currency), ''), 'USD'))
  on conflict (user_email) do update set updated_at = now()
  returning * into acct;

  return acct;
end;
$$;

-- Add funds (card top-up or demo top-up).
create or replace function public.wallet_topup(
  p_email text,
  p_amount numeric,
  p_currency text default 'USD',
  p_method text default 'card',
  p_reference text default null
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

-- Send money to another registered user.
create or replace function public.wallet_transfer(
  p_from text,
  p_to text,
  p_amount numeric,
  p_note text default null
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

-- Spend wallet balance on a purchase.
create or replace function public.wallet_spend(
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
    raise exception 'Amount must be greater than zero.';
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
    (user_email, kind, direction, amount, currency, status, reference, description)
  values
    (v_email, 'purchase', 'debit', v_amount, acct.currency, 'completed', p_reference,
     coalesce(nullif(trim(p_description), ''), 'Wallet purchase'));

  return acct;
end;
$$;

-- Request a withdrawal back to a bank account. Funds are reserved immediately
-- (deducted from balance) and the request is left pending for an admin to pay
-- out, mirroring the seller payout flow.
create or replace function public.wallet_withdraw(
  p_email text,
  p_amount numeric,
  p_destination text default null
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
    raise exception 'Withdrawal amount must be greater than zero.';
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
    (v_email, 'withdrawal', 'debit', v_amount, acct.currency, 'pending', p_destination,
     'Withdrawal request');

  return acct;
end;
$$;

grant execute on function public.wallet_ensure_account(text, text) to anon, authenticated;
grant execute on function public.wallet_topup(text, numeric, text, text, text) to anon, authenticated;
grant execute on function public.wallet_transfer(text, text, numeric, text) to anon, authenticated;
grant execute on function public.wallet_spend(text, numeric, text, text) to anon, authenticated;
grant execute on function public.wallet_withdraw(text, numeric, text) to anon, authenticated;
