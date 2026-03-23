create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  order_key text not null,
  reference text not null,
  order_created_at timestamptz not null,
  customer jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  payment_method text,
  payment_provider text,
  payment_status text,
  payment_reference text,
  currency text,
  subtotal numeric(12, 2) not null default 0,
  service_fee numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  status text not null default 'Confirmed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_email, order_key)
);

create index if not exists orders_user_email_idx on public.orders (user_email);
create index if not exists orders_user_email_created_idx on public.orders (user_email, order_created_at desc);
create index if not exists orders_items_gin_idx on public.orders using gin (items);

alter table public.orders enable row level security;

drop policy if exists "Public read orders" on public.orders;
create policy "Public read orders"
on public.orders
for select
using (true);

drop policy if exists "Public insert orders" on public.orders;
create policy "Public insert orders"
on public.orders
for insert
with check (true);

drop policy if exists "Public update orders" on public.orders;
create policy "Public update orders"
on public.orders
for update
using (true)
with check (true);

drop policy if exists "Public delete orders" on public.orders;
create policy "Public delete orders"
on public.orders
for delete
using (true);
