-- ============================================================
-- supabase/general-labour-bookings.sql
-- Buyer-submitted booking requests against General Labour Market workers.
-- No payment is taken — this just records the request so it's trackable on
-- both sides; the buyer and worker then negotiate details in chat.
-- Idempotent: safe to run repeatedly.
-- Apply via: Supabase Dashboard -> SQL Editor -> paste -> Run.
-- ============================================================

create extension if not exists pgcrypto;

-- Adds the requested time-of-day for deployments that already ran this file
-- before booking_time existed. Lets buyers request a specific time (not just
-- a date), and lets the booking modal flag exact date+time conflicts so
-- other buyers get steered to a free slot.
alter table if exists public.general_labour_bookings add column if not exists booking_time text;

-- How long the job is expected to take, in minutes. Lets the booking modal
-- check real interval overlap against other bookings on the same date
-- instead of only catching an exact duplicate start time.
alter table if exists public.general_labour_bookings add column if not exists duration_minutes integer not null default 60;

create table if not exists public.general_labour_bookings (
  -- Client-generated id (e.g. "glb-xxx-yyy") so optimistic UI updates don't
  -- have to wait for a server round-trip to know the id.
  id text primary key,

  -- Which worker is being booked (matches either a static catalogue id like
  -- "gl-construction-1" or a seller-listing id — no FK, the worker catalogue
  -- isn't a single DB table).
  worker_id text not null,

  -- Denormalized worker snapshot so the seller dashboard and buyer's "My
  -- Bookings" page still render something meaningful even if the listing
  -- changes title / image later.
  worker_name text,
  worker_image text,
  worker_category text,

  -- Seller scoping (denormalized for fast filtering by the seller dashboard).
  seller_email text,

  -- Buyer details.
  buyer_email text,
  buyer_name text,
  buyer_phone text,

  -- Requested date/time + free-form job notes.
  booking_date text,
  booking_time text,
  duration_minutes integer not null default 60,
  notes text,

  status text not null default 'requested',
  -- statuses: 'requested' | 'confirmed' | 'completed' | 'declined' | 'cancelled' | 'expired'

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists general_labour_bookings_seller_email_idx
  on public.general_labour_bookings (seller_email);

create index if not exists general_labour_bookings_worker_id_idx
  on public.general_labour_bookings (worker_id);

-- Speeds up "what's already booked for this worker on this date" lookups
-- used by the booking modal's exact-time conflict check.
create index if not exists general_labour_bookings_worker_date_idx
  on public.general_labour_bookings (worker_id, booking_date);

create index if not exists general_labour_bookings_buyer_email_idx
  on public.general_labour_bookings (buyer_email);

create index if not exists general_labour_bookings_created_at_idx
  on public.general_labour_bookings (created_at desc);

-- updated_at maintenance trigger
create or replace function public.set_general_labour_bookings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists general_labour_bookings_set_updated_at on public.general_labour_bookings;
create trigger general_labour_bookings_set_updated_at
  before update on public.general_labour_bookings
  for each row execute function public.set_general_labour_bookings_updated_at();

alter table public.general_labour_bookings enable row level security;

-- Prototype permission model (matches property_bookings / marketplace_items):
-- public read/insert/update/delete. Tighten once seller auth lands.
drop policy if exists "Public read general labour bookings" on public.general_labour_bookings;
create policy "Public read general labour bookings"
on public.general_labour_bookings
for select
using (true);

drop policy if exists "Public insert general labour bookings" on public.general_labour_bookings;
create policy "Public insert general labour bookings"
on public.general_labour_bookings
for insert
with check (true);

drop policy if exists "Public update general labour bookings" on public.general_labour_bookings;
create policy "Public update general labour bookings"
on public.general_labour_bookings
for update
using (true)
with check (true);

drop policy if exists "Public delete general labour bookings" on public.general_labour_bookings;
create policy "Public delete general labour bookings"
on public.general_labour_bookings
for delete
using (true);
