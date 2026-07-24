-- Nursery listings table for the Nursery market (/nursery-hub).
-- Run this once in the Supabase SQL Editor.

create table if not exists public.nursery_listings (
  id                  text primary key,
  title               text not null,
  category_id         text not null,   -- e.g. 'seeds', 'herbs', 'saplings'
  category            text,            -- e.g. 'Seeds', 'Herbs', 'Saplings'
  species             text,            -- scientific or common name
  care_level          text,            -- 'Easy' | 'Moderate' | 'Expert'
  light_requirement   text,            -- 'Full Sun' | 'Partial Shade' | 'Full Shade' | 'Indoors'
  watering_frequency  text,            -- 'Daily' | 'Every 2-3 days' | 'Weekly' | 'Bi-weekly' | 'Monthly'
  pot_plant_size      text,            -- e.g. '10cm pot', '1.5m sapling', 'Tray of 6'
  suitable_for        text,            -- 'Indoors' | 'Outdoors' | 'Both'
  pet_safe            text,            -- 'Yes' | 'No' | 'Unknown'
  location            text,            -- nursery/grower location (city or province)
  summary             text,
  description         text,
  price               numeric not null default 0,
  currency            text not null default 'ZAR',
  quantity            integer,
  rating              numeric default 0,
  review_count        integer default 0,
  image               text,
  seller_email        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Enable row-level security (open read, authenticated write — matches other tables).
alter table public.nursery_listings enable row level security;

create policy if not exists "Public read nursery_listings"
  on public.nursery_listings for select using (true);

create policy if not exists "Authenticated insert nursery_listings"
  on public.nursery_listings for insert with check (true);

create policy if not exists "Authenticated update nursery_listings"
  on public.nursery_listings for update using (true);

-- Trigram indexes for fast ilike search across text fields.
create extension if not exists pg_trgm;

create index if not exists nursery_listings_title_trgm
  on public.nursery_listings using gin (title gin_trgm_ops);

create index if not exists nursery_listings_category_trgm
  on public.nursery_listings using gin (category gin_trgm_ops);

create index if not exists nursery_listings_species_trgm
  on public.nursery_listings using gin (species gin_trgm_ops);

create index if not exists nursery_listings_location_trgm
  on public.nursery_listings using gin (location gin_trgm_ops);

create index if not exists nursery_listings_description_trgm
  on public.nursery_listings using gin (description gin_trgm_ops);

create index if not exists nursery_listings_care_level_idx
  on public.nursery_listings (care_level);

create index if not exists nursery_listings_light_req_idx
  on public.nursery_listings (light_requirement);

create index if not exists nursery_listings_suitable_for_idx
  on public.nursery_listings (suitable_for);
