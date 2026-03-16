create extension if not exists pgcrypto;

create table if not exists public.marketplace_items (
  id uuid primary key default gen_random_uuid(),
  seller_email text not null,
  seller_name text,
  title text not null,
  description text,
  price text not null,
  market_key text not null check (market_key in (
    'ecommerce',
    'groceries',
    'fastFood',
    'beverages',
    'wellness',
    'hardwareSoftware'
  )),
  image_url text not null,
  created_at timestamptz not null default now()
);

alter table public.marketplace_items enable row level security;

drop policy if exists "Public read marketplace items" on public.marketplace_items;
create policy "Public read marketplace items"
on public.marketplace_items
for select
using (true);

drop policy if exists "Public insert marketplace items" on public.marketplace_items;
create policy "Public insert marketplace items"
on public.marketplace_items
for insert
with check (true);

drop policy if exists "Public update marketplace items" on public.marketplace_items;
create policy "Public update marketplace items"
on public.marketplace_items
for update
using (true)
with check (true);

drop policy if exists "Public delete marketplace items" on public.marketplace_items;
create policy "Public delete marketplace items"
on public.marketplace_items
for delete
using (true);

insert into storage.buckets (id, name, public)
values ('marketplace-items', 'marketplace-items', true)
on conflict (id) do nothing;

drop policy if exists "Public read marketplace item images" on storage.objects;
create policy "Public read marketplace item images"
on storage.objects
for select
using (bucket_id = 'marketplace-items');

drop policy if exists "Public upload marketplace item images" on storage.objects;
create policy "Public upload marketplace item images"
on storage.objects
for insert
with check (bucket_id = 'marketplace-items');

drop policy if exists "Public delete marketplace item images" on storage.objects;
create policy "Public delete marketplace item images"
on storage.objects
for delete
using (bucket_id = 'marketplace-items');