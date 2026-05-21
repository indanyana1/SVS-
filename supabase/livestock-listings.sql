-- Livestock marketplace listings.
--   • Source-of-truth for the Livestock Hub page on the frontend.
--   • Public read; insert/update/delete are open for the prototype phase and
--     should be tightened with auth.uid()-based policies once seller accounts
--     are wired up (mirroring property_listings).

create table if not exists public.livestock_listings (
  id           text primary key,
  title        text not null,
  category_id  text not null,
  category     text,
  breed        text,
  age          text,
  weight       text,
  location     text,
  summary      text,
  description  text,
  price        numeric not null default 0,
  currency     text not null default 'ZAR',
  quantity     integer,
  rating       numeric default 0,
  review_count integer default 0,
  image        text,
  seller_email text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Backfill column for existing installations created before quantity was added.
alter table public.livestock_listings
  add column if not exists quantity integer;

create index if not exists livestock_listings_category_id_idx
  on public.livestock_listings (category_id);
create index if not exists livestock_listings_seller_email_idx
  on public.livestock_listings (seller_email);
create index if not exists livestock_listings_created_at_idx
  on public.livestock_listings (created_at desc);
-- Trigram indexes for fast ilike substring search.
create extension if not exists pg_trgm;
create index if not exists livestock_listings_title_trgm_idx
  on public.livestock_listings using gin (title gin_trgm_ops);
create index if not exists livestock_listings_location_trgm_idx
  on public.livestock_listings using gin (location gin_trgm_ops);
create index if not exists livestock_listings_breed_trgm_idx
  on public.livestock_listings using gin (breed gin_trgm_ops);
create index if not exists livestock_listings_description_trgm_idx
  on public.livestock_listings using gin (description gin_trgm_ops);

create or replace function public.set_livestock_listings_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_livestock_listings_updated_at on public.livestock_listings;
create trigger trg_livestock_listings_updated_at
  before update on public.livestock_listings
  for each row execute function public.set_livestock_listings_updated_at();

alter table public.livestock_listings enable row level security;

drop policy if exists "livestock_listings_select_all" on public.livestock_listings;
create policy "livestock_listings_select_all" on public.livestock_listings
  for select using (true);

drop policy if exists "livestock_listings_insert_all" on public.livestock_listings;
create policy "livestock_listings_insert_all" on public.livestock_listings
  for insert with check (true);

drop policy if exists "livestock_listings_update_all" on public.livestock_listings;
create policy "livestock_listings_update_all" on public.livestock_listings
  for update using (true) with check (true);

drop policy if exists "livestock_listings_delete_all" on public.livestock_listings;
create policy "livestock_listings_delete_all" on public.livestock_listings
  for delete using (true);
