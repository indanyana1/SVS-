-- Atomically decrements one size variant's stock inside details_json.sizeStock
-- without touching any other field in details_json.
-- Called from the client after apply_inventory_deduction for variant purchases.
-- Idempotent: safe to re-run. Apply via: Supabase Dashboard -> SQL Editor -> Run.

create or replace function public.patch_listing_size_stock(
  p_listing_id uuid,
  p_size       text,
  p_quantity   integer   -- the NEW quantity (already decremented on the client)
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.marketplace_items
  set details_json = jsonb_set(
    coalesce(details_json, '{}'::jsonb),
    array['sizeStock', p_size],
    to_jsonb(greatest(p_quantity, 0))
  )
  where id = p_listing_id;
$$;
