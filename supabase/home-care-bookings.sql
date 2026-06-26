-- ============================================================
-- supabase/home-care-bookings.sql
-- Buyer-submitted booking requests against Book @ Home-Care Services
-- providers. No payment is taken — this just records the request so it's
-- trackable on both sides; the buyer and provider then negotiate details in
-- chat. Mirrors general-labour-bookings.sql exactly.
-- Idempotent: safe to run repeatedly.
-- Apply via: Supabase Dashboard -> SQL Editor -> paste -> Run.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.home_care_bookings (
  -- Client-generated id (e.g. "hcb-xxx-yyy") so optimistic UI updates don't
  -- have to wait for a server round-trip to know the id.
  id text primary key,

  -- Which provider is being booked (matches either a static catalogue id
  -- like "hc1" or a seller-listing id — no FK, the provider catalogue isn't
  -- a single DB table).
  provider_id text not null,

  -- Denormalized provider snapshot so the seller dashboard and buyer's "My
  -- Bookings" page still render something meaningful even if the listing
  -- changes title / image later.
  provider_name text,
  provider_image text,
  provider_category text,

  -- Seller scoping (denormalized for fast filtering by the seller dashboard).
  seller_email text,

  -- Buyer details.
  buyer_email text,
  buyer_name text,
  buyer_phone text,

  -- Requested date + which service/pricing option + free-form notes.
  booking_date text,
  service_label text,
  notes text,

  status text not null default 'requested',
  -- statuses: 'requested' | 'confirmed' | 'completed' | 'declined' | 'cancelled'

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists home_care_bookings_seller_email_idx
  on public.home_care_bookings (seller_email);

create index if not exists home_care_bookings_provider_id_idx
  on public.home_care_bookings (provider_id);

create index if not exists home_care_bookings_buyer_email_idx
  on public.home_care_bookings (buyer_email);

create index if not exists home_care_bookings_created_at_idx
  on public.home_care_bookings (created_at desc);

-- updated_at maintenance trigger
create or replace function public.set_home_care_bookings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists home_care_bookings_set_updated_at on public.home_care_bookings;
create trigger home_care_bookings_set_updated_at
  before update on public.home_care_bookings
  for each row execute function public.set_home_care_bookings_updated_at();

alter table public.home_care_bookings enable row level security;

-- Prototype permission model (matches general_labour_bookings /
-- property_bookings / marketplace_items): public read/insert/update/delete.
-- Tighten once seller auth lands.
drop policy if exists "Public read home care bookings" on public.home_care_bookings;
create policy "Public read home care bookings"
on public.home_care_bookings
for select
using (true);

drop policy if exists "Public insert home care bookings" on public.home_care_bookings;
create policy "Public insert home care bookings"
on public.home_care_bookings
for insert
with check (true);

drop policy if exists "Public update home care bookings" on public.home_care_bookings;
create policy "Public update home care bookings"
on public.home_care_bookings
for update
using (true)
with check (true);

drop policy if exists "Public delete home care bookings" on public.home_care_bookings;
create policy "Public delete home care bookings"
on public.home_care_bookings
for delete
using (true);
