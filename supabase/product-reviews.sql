create extension if not exists pgcrypto;

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  item_key text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(trim(comment)) >= 3),
  reviewer_name text not null,
  reviewer_email text,
  moderation_status text not null default 'approved' check (moderation_status in ('approved', 'rejected', 'pending')),
  created_at timestamptz not null default now()
);

create index if not exists product_reviews_item_key_idx
  on public.product_reviews (item_key, created_at desc);

alter table public.product_reviews enable row level security;

drop policy if exists "Public read approved product reviews" on public.product_reviews;
create policy "Public read approved product reviews"
on public.product_reviews
for select
using (moderation_status = 'approved');

drop policy if exists "Public insert approved product reviews" on public.product_reviews;
create policy "Public insert approved product reviews"
on public.product_reviews
for insert
with check (moderation_status = 'approved');