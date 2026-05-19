-- ============================================================
-- supabase/property-bookings.sql
-- Buyer-submitted visit/enquiry bookings against property listings.
-- Idempotent: safe to run repeatedly.
-- Apply via: Supabase Dashboard -> SQL Editor -> paste -> Run.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.property_bookings (
  -- Client-generated id (e.g. "booking-xxx-yyy") so optimistic UI updates
  -- don't have to wait for a server round-trip to know the id.
  id text primary key,

  -- Which property is being booked (text PK on property_listings).
  listing_id text not null references public.property_listings (id) on delete cascade,

  -- Denormalized listing snapshot so the seller dashboard can still render
  -- something meaningful even if the listing changes title / image later.
  listing_title text,
  listing_image text,
  listing_location text,

  -- Seller scoping (denormalized for fast filtering by seller dashboard).
  seller_email text,

  -- Buyer details (the form fields).
  buyer_email text,
  buyer_name text,
  buyer_phone text,
  buyer_type text,
  reason text,

  -- Visit slot
  visit_date text,
  visit_time text,

  -- Free-form note + status lifecycle
  message text,
  status text not null default 'requested',
  -- statuses: 'requested' | 'agent-confirmed' | 'completed' | 'declined' | 'cancelled'

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_bookings_seller_email_idx
  on public.property_bookings (seller_email);

create index if not exists property_bookings_listing_id_idx
  on public.property_bookings (listing_id);

create index if not exists property_bookings_buyer_email_idx
  on public.property_bookings (buyer_email);

create index if not exists property_bookings_created_at_idx
  on public.property_bookings (created_at desc);

-- updated_at maintenance trigger
create or replace function public.set_property_bookings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists property_bookings_set_updated_at on public.property_bookings;
create trigger property_bookings_set_updated_at
  before update on public.property_bookings
  for each row execute function public.set_property_bookings_updated_at();

alter table public.property_bookings enable row level security;

-- Prototype permission model (matches property_listings / marketplace_items):
-- public read/insert/update/delete. Tighten once seller auth lands.
drop policy if exists "Public read property bookings" on public.property_bookings;
create policy "Public read property bookings"
on public.property_bookings
for select
using (true);

drop policy if exists "Public insert property bookings" on public.property_bookings;
create policy "Public insert property bookings"
on public.property_bookings
for insert
with check (true);

drop policy if exists "Public update property bookings" on public.property_bookings;
create policy "Public update property bookings"
on public.property_bookings
for update
using (true)
with check (true);

drop policy if exists "Public delete property bookings" on public.property_bookings;
create policy "Public delete property bookings"
on public.property_bookings
for delete
using (true);
