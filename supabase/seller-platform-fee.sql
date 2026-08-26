-- ============================================================
-- supabase/seller-platform-fee.sql
-- Real, backend-owned seller platform fee system:
--   1. platform_settings   — singleton row Super Admin edits (fee %, ON/OFF,
--                            first-100-sellers free-month promo config).
--   2. seller_fee_promotions — one row per seller, created the first time
--                            they ever complete a sale. Records whether they
--                            qualified for the free-month promo and, if so,
--                            the start/expiry of that free period. A seller
--                            is evaluated exactly once, ever, so the
--                            promotion can never be granted twice.
--   3. seller_fee_calculations — idempotency ledger (mirrors
--                            inventory_deduction_events in
--                            inventory-atomic-deduction.sql): one row per
--                            order_key, storing the fee breakdown that was
--                            actually charged on that order. This is the
--                            permanent, non-retroactive record — once
--                            written it is never recomputed, so a later
--                            change to platform_settings never touches
--                            orders that already went through.
--   4. compute_and_lock_seller_fees() — the only way fee/promo data is ever
--                            written. Called once by the checkout flow right
--                            after an order is placed. Sellers/buyers cannot
--                            call this to recompute or override an existing
--                            order (idempotency check returns the original
--                            result), and cannot influence the fee rate or
--                            promo eligibility from the client — both are
--                            decided entirely inside this function from
--                            platform_settings / seller_fee_promotions.
--   5. admin_update_seller_fee_settings() — the only way platform_settings
--                            can change, gated by admin_require_session()
--                            (see admin-panel.sql) and logged to
--                            admin_action_log.
--
-- platform_settings / seller_fee_promotions / seller_fee_calculations are
-- all RLS-enabled with a SELECT-only public policy (so the storefront and
-- admin dashboard can read current settings / a seller's own promo status /
-- an order's locked-in fee) and deliberately NO insert/update/delete policy
-- — every write goes through the SECURITY DEFINER functions below, which
-- (like every other SECURITY DEFINER function in this project) run as the
-- table-owning role and so bypass RLS regardless.
--
-- Idempotent: safe to run repeatedly.
-- Apply via: Supabase Dashboard -> SQL Editor -> paste -> Run.
-- ============================================================

-- ------------------------------------------------------------
-- 1. platform_settings
-- ------------------------------------------------------------
create table if not exists public.platform_settings (
  id int primary key default 1,
  buyer_fee_percent numeric(5, 2) not null default 3.00,
  seller_fee_enabled boolean not null default true,
  seller_fee_percent numeric(5, 2) not null default 7.00,
  seller_promo_enabled boolean not null default true,
  seller_promo_qualifying_count int not null default 100,
  seller_promo_free_days int not null default 30,
  updated_at timestamptz not null default now(),
  updated_by text,
  constraint platform_settings_singleton_id check (id = 1)
);

insert into public.platform_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

drop policy if exists "Public read platform settings" on public.platform_settings;
create policy "Public read platform settings"
on public.platform_settings
for select
using (true);

-- ------------------------------------------------------------
-- 2. seller_fee_promotions
-- ------------------------------------------------------------
create table if not exists public.seller_fee_promotions (
  id uuid primary key default gen_random_uuid(),
  seller_email text not null unique,
  qualified boolean not null default false,
  promo_rank int,
  first_sale_order_key text,
  free_period_starts_at timestamptz,
  free_period_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists seller_fee_promotions_seller_email_idx
  on public.seller_fee_promotions (seller_email);

alter table public.seller_fee_promotions enable row level security;

drop policy if exists "Public read seller fee promotions" on public.seller_fee_promotions;
create policy "Public read seller fee promotions"
on public.seller_fee_promotions
for select
using (true);

-- ------------------------------------------------------------
-- 3. seller_fee_calculations (idempotency ledger + permanent record)
-- ------------------------------------------------------------
create table if not exists public.seller_fee_calculations (
  id uuid primary key default gen_random_uuid(),
  order_key text not null unique,
  user_email text,
  breakdown jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists seller_fee_calculations_order_key_idx
  on public.seller_fee_calculations (order_key);

alter table public.seller_fee_calculations enable row level security;

drop policy if exists "Public read seller fee calculations" on public.seller_fee_calculations;
create policy "Public read seller fee calculations"
on public.seller_fee_calculations
for select
using (true);

-- ------------------------------------------------------------
-- 4. compute_and_lock_seller_fees()
--
-- p_items: jsonb array of { "seller_email": text, "amount": numeric,
-- "currency": text } — one entry per line item; multiple entries for the
-- same seller are summed. `amount` is that line's already-resolved total
-- (unit price × quantity) exactly as charged on the order.
--
-- Returns { "breakdown": [...], "idempotent": boolean }. Each breakdown
-- entry: sellerEmail, grossAmount, currency, feeRatePercent, feeAmount,
-- payoutAmount, promoApplied, standardRatePercent (what the rate would have
-- been without an active promo — lets reporting compute "amount waived"),
-- promoFreePeriodStartsAt/ExpiresAt.
-- ------------------------------------------------------------
create or replace function public.compute_and_lock_seller_fees(
  p_order_key  text,
  p_user_email text,
  p_items      jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.seller_fee_calculations;
  v_settings public.platform_settings;
  v_line record;
  v_promo public.seller_fee_promotions;
  v_qualified_count int;
  v_rate numeric;
  v_fee numeric;
  v_payout numeric;
  v_promo_applied boolean;
  v_breakdown jsonb := '[]'::jsonb;
  v_clean_email text := lower(trim(coalesce(p_user_email, '')));
begin
  if coalesce(trim(p_order_key), '') = '' then
    raise exception 'order_key is required';
  end if;

  -- Idempotency: an order's fee is computed exactly once, ever. Retried or
  -- duplicate calls (network retry, re-render) just return what was already
  -- locked in — never recompute, so a later settings change can never leak
  -- into an order that already went through.
  select * into v_existing
  from public.seller_fee_calculations
  where order_key = p_order_key;

  if found then
    return jsonb_build_object('breakdown', v_existing.breakdown, 'idempotent', true);
  end if;

  select * into v_settings from public.platform_settings where id = 1;
  if not found then
    insert into public.platform_settings (id) values (1)
    returning * into v_settings;
  end if;

  if p_items is not null and jsonb_typeof(p_items) = 'array' then
    for v_line in
      select
        lower(trim(item->>'seller_email')) as seller_email,
        sum((item->>'amount')::numeric) as gross_amount,
        max(item->>'currency') as currency
      from jsonb_array_elements(p_items) as item
      where coalesce(item->>'seller_email', '') <> ''
      group by 1
    loop
      -- Serializes "am I one of the first N sellers?" across concurrent
      -- checkouts from different sellers' first-ever sale, so two sellers
      -- racing for the last promo slot can't both be granted it.
      perform pg_advisory_xact_lock(hashtext('seller_fee_promo_rank'));

      select * into v_promo
      from public.seller_fee_promotions
      where seller_email = v_line.seller_email;

      if not found then
        select count(*) into v_qualified_count
        from public.seller_fee_promotions
        where qualified = true;

        if v_settings.seller_promo_enabled and v_qualified_count < v_settings.seller_promo_qualifying_count then
          insert into public.seller_fee_promotions (
            seller_email, qualified, promo_rank, first_sale_order_key,
            free_period_starts_at, free_period_expires_at
          ) values (
            v_line.seller_email, true, v_qualified_count + 1, p_order_key,
            now(), now() + make_interval(days => v_settings.seller_promo_free_days)
          )
          returning * into v_promo;
        else
          insert into public.seller_fee_promotions (seller_email, qualified, first_sale_order_key)
          values (v_line.seller_email, false, p_order_key)
          returning * into v_promo;
        end if;
      end if;

      v_promo_applied := coalesce(v_promo.qualified, false)
        and v_promo.free_period_starts_at is not null
        and v_promo.free_period_expires_at is not null
        and now() >= v_promo.free_period_starts_at
        and now() < v_promo.free_period_expires_at;

      if not v_settings.seller_fee_enabled then
        v_rate := 0;
      elsif v_promo_applied then
        v_rate := 0;
      else
        v_rate := v_settings.seller_fee_percent;
      end if;

      v_fee := round(v_line.gross_amount * v_rate / 100.0, 2);
      v_payout := round(v_line.gross_amount - v_fee, 2);

      v_breakdown := v_breakdown || jsonb_build_object(
        'sellerEmail', v_line.seller_email,
        'grossAmount', v_line.gross_amount,
        'currency', coalesce(v_line.currency, 'USD'),
        'feeRatePercent', v_rate,
        'feeAmount', v_fee,
        'payoutAmount', v_payout,
        'promoApplied', v_promo_applied,
        'standardRatePercent', v_settings.seller_fee_percent,
        'promoFreePeriodStartsAt', v_promo.free_period_starts_at,
        'promoFreePeriodExpiresAt', v_promo.free_period_expires_at
      );
    end loop;
  end if;

  insert into public.seller_fee_calculations (order_key, user_email, breakdown)
  values (p_order_key, v_clean_email, v_breakdown)
  on conflict (order_key) do nothing;

  return jsonb_build_object('breakdown', v_breakdown, 'idempotent', false);
end;
$$;

grant execute on function public.compute_and_lock_seller_fees(text, text, jsonb) to anon, authenticated;

-- ------------------------------------------------------------
-- 5. admin_update_seller_fee_settings()
-- Every argument is optional (defaults to null = "leave unchanged") so the
-- Super Admin UI can save a single field without resending the whole row.
-- ------------------------------------------------------------
create or replace function public.admin_update_seller_fee_settings(
  p_token text,
  p_seller_fee_enabled boolean default null,
  p_seller_fee_percent numeric default null,
  p_seller_promo_enabled boolean default null,
  p_seller_promo_qualifying_count int default null,
  p_seller_promo_free_days int default null
)
returns public.platform_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_email text := public.admin_require_session(p_token);
  v_before public.platform_settings;
  v_after public.platform_settings;
begin
  if p_seller_fee_percent is not null and (p_seller_fee_percent < 0 or p_seller_fee_percent > 100) then
    raise exception 'Seller fee percent must be between 0 and 100.';
  end if;
  if p_seller_promo_qualifying_count is not null and p_seller_promo_qualifying_count < 0 then
    raise exception 'Qualifying seller count cannot be negative.';
  end if;
  if p_seller_promo_free_days is not null and p_seller_promo_free_days < 0 then
    raise exception 'Free period days cannot be negative.';
  end if;

  select * into v_before from public.platform_settings where id = 1;
  if not found then
    insert into public.platform_settings (id) values (1) returning * into v_before;
  end if;

  update public.platform_settings
  set
    seller_fee_enabled = coalesce(p_seller_fee_enabled, seller_fee_enabled),
    seller_fee_percent = coalesce(p_seller_fee_percent, seller_fee_percent),
    seller_promo_enabled = coalesce(p_seller_promo_enabled, seller_promo_enabled),
    seller_promo_qualifying_count = coalesce(p_seller_promo_qualifying_count, seller_promo_qualifying_count),
    seller_promo_free_days = coalesce(p_seller_promo_free_days, seller_promo_free_days),
    updated_at = now(),
    updated_by = v_admin_email
  where id = 1
  returning * into v_after;

  insert into public.admin_action_log (admin_email, action, target_type, target_id, details)
  values (
    v_admin_email,
    'seller_fee_settings_updated',
    'platform_settings',
    '1',
    jsonb_build_object('before', to_jsonb(v_before), 'after', to_jsonb(v_after))
  );

  return v_after;
end;
$$;

grant execute on function public.admin_update_seller_fee_settings(text, boolean, numeric, boolean, int, int) to anon, authenticated;
