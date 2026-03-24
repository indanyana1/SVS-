alter table if exists public.marketplace_items
add column if not exists quantity integer not null default 0;

alter table if exists public.marketplace_items
drop constraint if exists marketplace_items_quantity_check;

alter table if exists public.marketplace_items
add constraint marketplace_items_quantity_check check (quantity >= 0);
