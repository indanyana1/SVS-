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

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  item_key text not null,
  sku text not null,
  title text not null,
  image_url text,
  route text not null,
  market_name text not null,
  details text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null default 0,
  unit_price_label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_email, item_key)
);

create index if not exists cart_items_user_email_idx on public.cart_items (user_email);

alter table public.cart_items enable row level security;

drop policy if exists "Public read cart items" on public.cart_items;
create policy "Public read cart items"
on public.cart_items
for select
using (true);

drop policy if exists "Public insert cart items" on public.cart_items;
create policy "Public insert cart items"
on public.cart_items
for insert
with check (true);

drop policy if exists "Public update cart items" on public.cart_items;
create policy "Public update cart items"
on public.cart_items
for update
using (true)
with check (true);

drop policy if exists "Public delete cart items" on public.cart_items;
create policy "Public delete cart items"
on public.cart_items
for delete
using (true);

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  item_key text not null,
  sku text not null,
  title text not null,
  image_url text,
  route text not null,
  market_name text not null,
  details text,
  unit_price numeric(12, 2) not null default 0,
  unit_price_label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_email, item_key)
);

create index if not exists wishlist_items_user_email_idx on public.wishlist_items (user_email);

alter table public.wishlist_items enable row level security;

drop policy if exists "Public read wishlist items" on public.wishlist_items;
create policy "Public read wishlist items"
on public.wishlist_items
for select
using (true);

drop policy if exists "Public insert wishlist items" on public.wishlist_items;
create policy "Public insert wishlist items"
on public.wishlist_items
for insert
with check (true);

drop policy if exists "Public update wishlist items" on public.wishlist_items;
create policy "Public update wishlist items"
on public.wishlist_items
for update
using (true)
with check (true);

drop policy if exists "Public delete wishlist items" on public.wishlist_items;
create policy "Public delete wishlist items"
on public.wishlist_items
for delete
using (true);