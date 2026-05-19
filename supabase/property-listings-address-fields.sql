-- ============================================================
-- supabase/property-listings-address-fields.sql
-- Adds granular address fields + a few previously missing
-- property-detail fields so sellers can describe location
-- precisely and the detail panel doesn't show blank fallbacks.
-- Idempotent: safe to run repeatedly.
-- Apply via: Supabase Dashboard -> SQL Editor -> paste -> Run.
-- ============================================================

alter table public.property_listings
  add column if not exists street_address text,
  add column if not exists suburb text,
  add column if not exists postal_code text,
  add column if not exists province text,
  add column if not exists landmark text,
  add column if not exists total_floors text;

-- Helpful index for filtering by suburb / postal code on the buyer side.
create index if not exists property_listings_suburb_idx
  on public.property_listings (suburb);

create index if not exists property_listings_postal_code_idx
  on public.property_listings (postal_code);
