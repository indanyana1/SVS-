alter table if exists public.cart_items
  add column if not exists seller_name text,
  add column if not exists seller_email text;

alter table if exists public.wishlist_items
  add column if not exists seller_name text,
  add column if not exists seller_email text;
