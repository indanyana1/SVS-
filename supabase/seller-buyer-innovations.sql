-- ============================================================
-- supabase/seller-buyer-innovations.sql
-- Schema for a round of seller + buyer dashboard innovations:
--   1. Pausing a listing (hide from buyers without deleting it).
--   2. Per-buyer notification email preferences.
--   3. A real saved-address book for buyers (completes the
--      "Save this address for future orders" checkout checkbox,
--      which previously captured a flag that was never used).
-- Idempotent: safe to run repeatedly. Apply via: Supabase Dashboard ->
-- SQL Editor -> paste -> Run.
-- ============================================================

-- 1. Pause/unpause a listing without deleting it. Buyer-facing browse
-- pages filter this out via the shared getSellerItemsForMarket helper;
-- the seller's own dashboard still shows their paused listings.
alter table public.marketplace_items
add column if not exists is_paused boolean not null default false;

-- 2. Per-buyer notification email preferences, read by
-- pushNotificationToUser before it sends an email copy of a
-- notification (the in-app notification itself always still fires).
alter table public.account_users
add column if not exists notification_prefs jsonb not null default '{}'::jsonb;

-- 3. Saved delivery addresses. Field set mirrors CheckoutPage's existing
-- formState shape so an address can be loaded straight into the
-- checkout form, or the checkout form saved straight into a row here.
create table if not exists public.buyer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  label text,
  full_name text,
  phone text,
  country text,
  address1 text,
  address2 text,
  city text,
  province text,
  postal_code text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buyer_addresses_user_email_idx
  on public.buyer_addresses (user_email);

alter table public.buyer_addresses enable row level security;

drop policy if exists "Public read buyer addresses" on public.buyer_addresses;
create policy "Public read buyer addresses"
on public.buyer_addresses
for select
using (true);

drop policy if exists "Public insert buyer addresses" on public.buyer_addresses;
create policy "Public insert buyer addresses"
on public.buyer_addresses
for insert
with check (true);

drop policy if exists "Public update buyer addresses" on public.buyer_addresses;
create policy "Public update buyer addresses"
on public.buyer_addresses
for update
using (true)
with check (true);

drop policy if exists "Public delete buyer addresses" on public.buyer_addresses;
create policy "Public delete buyer addresses"
on public.buyer_addresses
for delete
using (true);
