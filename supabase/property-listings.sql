-- ============================================================
-- supabase/property-listings.sql
-- Server-backed seller property listings (Property Marketplace).
-- Idempotent: safe to run repeatedly.
-- Apply via: Supabase Dashboard -> SQL Editor -> paste -> Run.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.property_listings (
  -- Client-generated id (e.g. "seller-xxx-yyy"); we let the client own the id
  -- so the buyer UI's existing useSellerListingsVersion / merge helpers don't
  -- need a remap step. We keep it as text rather than uuid for that reason.
  id text primary key,

  -- Core display
  title text not null,
  property_type text not null default 'Apartment',
  category text not null default 'apartments',
  status text not null default 'For Sale',
  is_rental boolean not null default false,

  -- Pricing
  price_numeric numeric(14, 2) not null default 0,
  price_currency text not null default 'INR',
  price_label text,

  -- Specs
  bedrooms integer not null default 0,
  bhk text,
  size_label text,
  size_numeric numeric(10, 2) not null default 0,

  -- Location
  location text,
  city text,
  country text,
  full_address text,

  -- Media
  image text,
  gallery jsonb not null default '[]'::jsonb,

  -- Amenities & narrative
  amenities jsonb not null default '[]'::jsonb,
  about text,
  highlights jsonb not null default '[]'::jsonb,
  facilities jsonb not null default '[]'::jsonb,
  trust_safety jsonb not null default '[]'::jsonb,

  -- Marketing meta
  availability text default 'Available Now',
  facing text default 'N/A',
  floor text default '-',
  age text default 'New',
  furnishing text default 'Unfurnished',
  rating numeric(3, 2) not null default 0,
  reviews integer not null default 0,

  -- Seller / agent
  seller_type text default 'Owner',
  seller_email text,
  agent_name text,
  agent_phone text,
  agent_email text,
  agent_badge text default 'Verified Seller',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_listings_seller_email_idx
  on public.property_listings (seller_email);

create index if not exists property_listings_category_idx
  on public.property_listings (category);

create index if not exists property_listings_created_at_idx
  on public.property_listings (created_at desc);

-- updated_at maintenance trigger
create or replace function public.set_property_listings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists property_listings_set_updated_at on public.property_listings;
create trigger property_listings_set_updated_at
  before update on public.property_listings
  for each row execute function public.set_property_listings_updated_at();

alter table public.property_listings enable row level security;

-- Public can browse (the buyer UI is anonymous).
drop policy if exists "Public read property listings" on public.property_listings;
create policy "Public read property listings"
on public.property_listings
for select
using (true);

-- Public insert/update/delete (matches the existing marketplace_items
-- prototype permission model — tighten once a real seller auth flow lands).
drop policy if exists "Public insert property listings" on public.property_listings;
create policy "Public insert property listings"
on public.property_listings
for insert
with check (true);

drop policy if exists "Public update property listings" on public.property_listings;
create policy "Public update property listings"
on public.property_listings
for update
using (true)
with check (true);

drop policy if exists "Public delete property listings" on public.property_listings;
create policy "Public delete property listings"
on public.property_listings
for delete
using (true);
