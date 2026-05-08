-- ============================================================
-- supabase/apply-all.sql (auto-generated)
-- Concatenates every prototype migration in dependency order.
-- All statements are idempotent (if not exists / drop ... if exists).
-- Apply via: Supabase Dashboard -> SQL Editor -> paste -> Run.
-- Or:        npm run db:migrate  (uses scripts/apply-supabase-migrations.mjs)
-- ============================================================

-- ------------------------------------------------------------
-- >>> account-users-and-seller-profiles.sql
-- ------------------------------------------------------------
create extension if not exists pgcrypto;

create table if not exists public.account_users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email_address text not null unique,
  contact_number text unique,
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists account_users_email_address_idx
  on public.account_users (email_address);

create index if not exists account_users_contact_number_idx
  on public.account_users (contact_number);

alter table public.account_users enable row level security;

drop policy if exists "Public read account users" on public.account_users;
create policy "Public read account users"
on public.account_users
for select
using (true);

drop policy if exists "Public insert account users" on public.account_users;
create policy "Public insert account users"
on public.account_users
for insert
with check (true);

drop policy if exists "Public update account users" on public.account_users;
create policy "Public update account users"
on public.account_users
for update
using (true)
with check (true);

drop policy if exists "Public delete account users" on public.account_users;
create policy "Public delete account users"
on public.account_users
for delete
using (true);

create table if not exists public.seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_email text not null unique,
  business_name text,
  legal_full_name text,
  id_number text,
  business_type text,
  registration_number text,
  tax_number text,
  phone_number text,
  business_address_line1 text,
  city text,
  province text,
  postal_code text,
  country text,
  payout_account_holder text,
  payout_bank_name text,
  payout_account_number text,
  payout_branch_code text,
  return_contact_name text,
  return_contact_phone text,
  onboarding_completed boolean not null default false,
  compliance_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_profiles_compliance_status_check check (compliance_status in ('pending', 'submitted', 'approved', 'rejected'))
);

create index if not exists seller_profiles_user_email_idx
  on public.seller_profiles (user_email);

alter table public.seller_profiles enable row level security;

drop policy if exists "Public read seller profiles" on public.seller_profiles;
create policy "Public read seller profiles"
on public.seller_profiles
for select
using (true);

drop policy if exists "Public insert seller profiles" on public.seller_profiles;
create policy "Public insert seller profiles"
on public.seller_profiles
for insert
with check (true);

drop policy if exists "Public update seller profiles" on public.seller_profiles;
create policy "Public update seller profiles"
on public.seller_profiles
for update
using (true)
with check (true);

drop policy if exists "Public delete seller profiles" on public.seller_profiles;
create policy "Public delete seller profiles"
on public.seller_profiles
for delete
using (true);

-- ------------------------------------------------------------
-- >>> seller-marketplace.sql
-- ------------------------------------------------------------
create extension if not exists pgcrypto;

create table if not exists public.marketplace_items (
  id uuid primary key default gen_random_uuid(),
  seller_email text not null,
  seller_name text,
  title text not null,
  description text,
  details_json jsonb not null default '{}'::jsonb,
  quantity integer not null default 0 check (quantity >= 0),
  price text not null,
  market_key text not null,
  image_url text not null,
  image_urls jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  beverage_category text,
  beverage_type text,
  brand text,
  volume text,
  origin text,
  short_description text
);

alter table public.marketplace_items
add column if not exists image_urls jsonb not null default '[]'::jsonb;

alter table public.marketplace_items
add column if not exists details_json jsonb not null default '{}'::jsonb;

alter table public.marketplace_items
add column if not exists quantity integer not null default 0;

alter table public.marketplace_items
drop constraint if exists marketplace_items_quantity_check;

alter table public.marketplace_items
add constraint marketplace_items_quantity_check check (quantity >= 0);

update public.marketplace_items
set image_urls = jsonb_build_array(image_url)
where coalesce(jsonb_array_length(image_urls), 0) = 0
  and image_url is not null
  and image_url <> '';

alter table public.marketplace_items
drop constraint if exists marketplace_items_market_key_check;

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
  seller_name text,
  seller_email text,
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
  seller_name text,
  seller_email text,
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

create table if not exists public.inventory_deduction_events (
  id uuid primary key default gen_random_uuid(),
  order_key text not null unique,
  user_email text,
  requested_items jsonb not null default '[]'::jsonb,
  applied_items jsonb not null default '[]'::jsonb,
  status text not null check (status in ('applied', 'failed')),
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_deduction_events_order_key_idx
  on public.inventory_deduction_events (order_key);

create table if not exists public.inventory_audit_log (
  id bigserial primary key,
  order_key text not null,
  listing_id uuid,
  event_type text not null,
  quantity_delta integer,
  previous_quantity integer,
  new_quantity integer,
  actor_email text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists inventory_audit_log_order_key_idx
  on public.inventory_audit_log (order_key);

create index if not exists inventory_audit_log_listing_id_idx
  on public.inventory_audit_log (listing_id);

alter table public.inventory_deduction_events enable row level security;
alter table public.inventory_audit_log enable row level security;

drop policy if exists "Public read inventory deduction events" on public.inventory_deduction_events;
create policy "Public read inventory deduction events"
on public.inventory_deduction_events
for select
using (true);

drop policy if exists "Public insert inventory deduction events" on public.inventory_deduction_events;
create policy "Public insert inventory deduction events"
on public.inventory_deduction_events
for insert
with check (true);

drop policy if exists "Public update inventory deduction events" on public.inventory_deduction_events;
create policy "Public update inventory deduction events"
on public.inventory_deduction_events
for update
using (true)
with check (true);

drop policy if exists "Public read inventory audit log" on public.inventory_audit_log;
create policy "Public read inventory audit log"
on public.inventory_audit_log
for select
using (true);

drop policy if exists "Public insert inventory audit log" on public.inventory_audit_log;
create policy "Public insert inventory audit log"
on public.inventory_audit_log
for insert
with check (true);

create or replace function public.apply_inventory_deduction(
  p_order_key text,
  p_user_email text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_event record;
  v_applied_items jsonb;
  v_missing_item_id text;
  v_insufficient_item_id text;
  v_insufficient_available integer;
  v_failure_reason text;
begin
  if coalesce(trim(p_order_key), '') = '' then
    raise exception 'order_key is required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items array is required';
  end if;

  select * into v_existing_event
  from public.inventory_deduction_events
  where order_key = p_order_key
  limit 1;

  if found then
    return jsonb_build_object(
      'status', case when v_existing_event.status = 'applied' then 'already_applied' else 'failed' end,
      'idempotent', true,
      'failure_reason', v_existing_event.failure_reason,
      'applied_items', v_existing_event.applied_items,
      'requested_items', v_existing_event.requested_items
    );
  end if;

  with parsed_items as (
    select
      nullif(item->>'listing_id', '')::uuid as listing_id,
      greatest(coalesce((item->>'quantity')::integer, 0), 0) as quantity
    from jsonb_array_elements(p_items) as item
  )
  select listing_id::text into v_missing_item_id
  from parsed_items
  where listing_id is null or quantity <= 0
  limit 1;

  if v_missing_item_id is not null then
    v_failure_reason := 'One or more inventory line items are invalid.';

    insert into public.inventory_deduction_events (
      order_key,
      user_email,
      requested_items,
      status,
      failure_reason
    ) values (
      p_order_key,
      lower(trim(coalesce(p_user_email, ''))),
      p_items,
      'failed',
      v_failure_reason
    );

    insert into public.inventory_audit_log (
      order_key,
      event_type,
      actor_email,
      details
    ) values (
      p_order_key,
      'deduction_failed',
      lower(trim(coalesce(p_user_email, ''))),
      jsonb_build_object('reason', v_failure_reason)
    );

    return jsonb_build_object('status', 'failed', 'idempotent', false, 'failure_reason', v_failure_reason, 'applied_items', '[]'::jsonb);
  end if;

  create temporary table if not exists temp_inventory_request (
    listing_id uuid not null,
    quantity integer not null
  ) on commit drop;

  truncate table temp_inventory_request;

  insert into temp_inventory_request (listing_id, quantity)
  select
    nullif(item->>'listing_id', '')::uuid,
    greatest(coalesce((item->>'quantity')::integer, 0), 0)
  from jsonb_array_elements(p_items) as item;

  with deduped_request as (
    select listing_id, sum(quantity)::integer as quantity
    from temp_inventory_request
    group by listing_id
  )
  select req.listing_id::text into v_missing_item_id
  from deduped_request req
  left join public.marketplace_items mi on mi.id = req.listing_id
  where mi.id is null
  limit 1;

  if v_missing_item_id is not null then
    v_failure_reason := format('Listing %s was not found.', v_missing_item_id);

    insert into public.inventory_deduction_events (
      order_key,
      user_email,
      requested_items,
      status,
      failure_reason
    ) values (
      p_order_key,
      lower(trim(coalesce(p_user_email, ''))),
      p_items,
      'failed',
      v_failure_reason
    );

    insert into public.inventory_audit_log (
      order_key,
      listing_id,
      event_type,
      actor_email,
      details
    ) values (
      p_order_key,
      v_missing_item_id::uuid,
      'deduction_failed',
      lower(trim(coalesce(p_user_email, ''))),
      jsonb_build_object('reason', v_failure_reason)
    );

    return jsonb_build_object('status', 'failed', 'idempotent', false, 'failure_reason', v_failure_reason, 'applied_items', '[]'::jsonb);
  end if;

  with deduped_request as (
    select listing_id, sum(quantity)::integer as quantity
    from temp_inventory_request
    group by listing_id
  ),
  locked_rows as (
    select
      mi.id,
      mi.quantity as current_quantity,
      req.quantity as requested_quantity
    from public.marketplace_items mi
    join deduped_request req on req.listing_id = mi.id
    order by mi.id
    for update
  )
  select id::text, current_quantity
  into v_insufficient_item_id, v_insufficient_available
  from locked_rows
  where current_quantity < requested_quantity
  limit 1;

  if v_insufficient_item_id is not null then
    v_failure_reason := format('Listing %s has only %s item(s) left.', v_insufficient_item_id, v_insufficient_available);

    insert into public.inventory_deduction_events (
      order_key,
      user_email,
      requested_items,
      status,
      failure_reason
    ) values (
      p_order_key,
      lower(trim(coalesce(p_user_email, ''))),
      p_items,
      'failed',
      v_failure_reason
    );

    insert into public.inventory_audit_log (
      order_key,
      listing_id,
      event_type,
      actor_email,
      details
    ) values (
      p_order_key,
      v_insufficient_item_id::uuid,
      'deduction_failed',
      lower(trim(coalesce(p_user_email, ''))),
      jsonb_build_object('reason', v_failure_reason, 'available', v_insufficient_available)
    );

    return jsonb_build_object('status', 'failed', 'idempotent', false, 'failure_reason', v_failure_reason, 'applied_items', '[]'::jsonb);
  end if;

  with deduped_request as (
    select listing_id, sum(quantity)::integer as quantity
    from temp_inventory_request
    group by listing_id
  ),
  locked_rows as (
    select
      mi.id,
      mi.quantity as previous_quantity,
      req.quantity as requested_quantity
    from public.marketplace_items mi
    join deduped_request req on req.listing_id = mi.id
    order by mi.id
    for update
  ),
  updated_rows as (
    update public.marketplace_items mi
    set quantity = mi.quantity - lr.requested_quantity
    from locked_rows lr
    where mi.id = lr.id
    returning mi.id, lr.requested_quantity, lr.previous_quantity, mi.quantity as new_quantity
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'listing_id', id,
        'deducted_quantity', requested_quantity,
        'previous_quantity', previous_quantity,
        'new_quantity', new_quantity
      )
      order by id
    ),
    '[]'::jsonb
  )
  into v_applied_items
  from updated_rows;

  insert into public.inventory_deduction_events (
    order_key,
    user_email,
    requested_items,
    applied_items,
    status,
    failure_reason
  ) values (
    p_order_key,
    lower(trim(coalesce(p_user_email, ''))),
    p_items,
    v_applied_items,
    'applied',
    null
  );

  insert into public.inventory_audit_log (
    order_key,
    listing_id,
    event_type,
    quantity_delta,
    previous_quantity,
    new_quantity,
    actor_email,
    details
  )
  select
    p_order_key,
    (entry->>'listing_id')::uuid,
    'deduction_applied',
    -1 * coalesce((entry->>'deducted_quantity')::integer, 0),
    coalesce((entry->>'previous_quantity')::integer, 0),
    coalesce((entry->>'new_quantity')::integer, 0),
    lower(trim(coalesce(p_user_email, ''))),
    entry
  from jsonb_array_elements(v_applied_items) as entry;

  return jsonb_build_object(
    'status', 'applied',
    'idempotent', false,
    'failure_reason', null,
    'applied_items', v_applied_items,
    'requested_items', p_items
  );
end;
$$;

-- ------------------------------------------------------------
-- >>> add-marketplace-item-quantity.sql
-- ------------------------------------------------------------
alter table if exists public.marketplace_items
add column if not exists quantity integer not null default 0;

alter table if exists public.marketplace_items
drop constraint if exists marketplace_items_quantity_check;

alter table if exists public.marketplace_items
add constraint marketplace_items_quantity_check check (quantity >= 0);


-- ------------------------------------------------------------
-- >>> add-seller-attribution-to-cart-wishlist.sql
-- ------------------------------------------------------------
alter table if exists public.cart_items
  add column if not exists seller_name text,
  add column if not exists seller_email text;

alter table if exists public.wishlist_items
  add column if not exists seller_name text,
  add column if not exists seller_email text;


-- ------------------------------------------------------------
-- >>> update-marketplace-market-key-constraint.sql
-- ------------------------------------------------------------
alter table public.marketplace_items
drop constraint if exists marketplace_items_market_key_check;

-- ------------------------------------------------------------
-- >>> inventory-atomic-deduction.sql
-- ------------------------------------------------------------
create table if not exists public.inventory_deduction_events (
  id uuid primary key default gen_random_uuid(),
  order_key text not null unique,
  user_email text,
  requested_items jsonb not null default '[]'::jsonb,
  applied_items jsonb not null default '[]'::jsonb,
  status text not null check (status in ('applied', 'failed')),
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_deduction_events_order_key_idx
  on public.inventory_deduction_events (order_key);

create table if not exists public.inventory_audit_log (
  id bigserial primary key,
  order_key text not null,
  listing_id uuid,
  event_type text not null,
  quantity_delta integer,
  previous_quantity integer,
  new_quantity integer,
  actor_email text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists inventory_audit_log_order_key_idx
  on public.inventory_audit_log (order_key);

create index if not exists inventory_audit_log_listing_id_idx
  on public.inventory_audit_log (listing_id);

alter table public.inventory_deduction_events enable row level security;
alter table public.inventory_audit_log enable row level security;

drop policy if exists "Public read inventory deduction events" on public.inventory_deduction_events;
create policy "Public read inventory deduction events"
on public.inventory_deduction_events
for select
using (true);

drop policy if exists "Public insert inventory deduction events" on public.inventory_deduction_events;
create policy "Public insert inventory deduction events"
on public.inventory_deduction_events
for insert
with check (true);

drop policy if exists "Public update inventory deduction events" on public.inventory_deduction_events;
create policy "Public update inventory deduction events"
on public.inventory_deduction_events
for update
using (true)
with check (true);

drop policy if exists "Public read inventory audit log" on public.inventory_audit_log;
create policy "Public read inventory audit log"
on public.inventory_audit_log
for select
using (true);

drop policy if exists "Public insert inventory audit log" on public.inventory_audit_log;
create policy "Public insert inventory audit log"
on public.inventory_audit_log
for insert
with check (true);

create or replace function public.apply_inventory_deduction(
  p_order_key text,
  p_user_email text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_event record;
  v_applied_items jsonb;
  v_missing_item_id text;
  v_insufficient_item_id text;
  v_insufficient_available integer;
  v_failure_reason text;
begin
  if coalesce(trim(p_order_key), '') = '' then
    raise exception 'order_key is required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items array is required';
  end if;

  select * into v_existing_event
  from public.inventory_deduction_events
  where order_key = p_order_key
  limit 1;

  if found then
    return jsonb_build_object(
      'status', case when v_existing_event.status = 'applied' then 'already_applied' else 'failed' end,
      'idempotent', true,
      'failure_reason', v_existing_event.failure_reason,
      'applied_items', v_existing_event.applied_items,
      'requested_items', v_existing_event.requested_items
    );
  end if;

  with parsed_items as (
    select
      nullif(item->>'listing_id', '')::uuid as listing_id,
      greatest(coalesce((item->>'quantity')::integer, 0), 0) as quantity
    from jsonb_array_elements(p_items) as item
  )
  select listing_id::text into v_missing_item_id
  from parsed_items
  where listing_id is null or quantity <= 0
  limit 1;

  if v_missing_item_id is not null then
    v_failure_reason := 'One or more inventory line items are invalid.';

    insert into public.inventory_deduction_events (
      order_key,
      user_email,
      requested_items,
      status,
      failure_reason
    ) values (
      p_order_key,
      lower(trim(coalesce(p_user_email, ''))),
      p_items,
      'failed',
      v_failure_reason
    );

    insert into public.inventory_audit_log (
      order_key,
      event_type,
      actor_email,
      details
    ) values (
      p_order_key,
      'deduction_failed',
      lower(trim(coalesce(p_user_email, ''))),
      jsonb_build_object('reason', v_failure_reason)
    );

    return jsonb_build_object('status', 'failed', 'idempotent', false, 'failure_reason', v_failure_reason, 'applied_items', '[]'::jsonb);
  end if;

  create temporary table if not exists temp_inventory_request (
    listing_id uuid not null,
    quantity integer not null
  ) on commit drop;

  truncate table temp_inventory_request;

  insert into temp_inventory_request (listing_id, quantity)
  select
    nullif(item->>'listing_id', '')::uuid,
    greatest(coalesce((item->>'quantity')::integer, 0), 0)
  from jsonb_array_elements(p_items) as item;

  with deduped_request as (
    select listing_id, sum(quantity)::integer as quantity
    from temp_inventory_request
    group by listing_id
  )
  select req.listing_id::text into v_missing_item_id
  from deduped_request req
  left join public.marketplace_items mi on mi.id = req.listing_id
  where mi.id is null
  limit 1;

  if v_missing_item_id is not null then
    v_failure_reason := format('Listing %s was not found.', v_missing_item_id);

    insert into public.inventory_deduction_events (
      order_key,
      user_email,
      requested_items,
      status,
      failure_reason
    ) values (
      p_order_key,
      lower(trim(coalesce(p_user_email, ''))),
      p_items,
      'failed',
      v_failure_reason
    );

    insert into public.inventory_audit_log (
      order_key,
      listing_id,
      event_type,
      actor_email,
      details
    ) values (
      p_order_key,
      v_missing_item_id::uuid,
      'deduction_failed',
      lower(trim(coalesce(p_user_email, ''))),
      jsonb_build_object('reason', v_failure_reason)
    );

    return jsonb_build_object('status', 'failed', 'idempotent', false, 'failure_reason', v_failure_reason, 'applied_items', '[]'::jsonb);
  end if;

  with deduped_request as (
    select listing_id, sum(quantity)::integer as quantity
    from temp_inventory_request
    group by listing_id
  ),
  locked_rows as (
    select
      mi.id,
      mi.quantity as current_quantity,
      req.quantity as requested_quantity
    from public.marketplace_items mi
    join deduped_request req on req.listing_id = mi.id
    order by mi.id
    for update
  )
  select id::text, current_quantity
  into v_insufficient_item_id, v_insufficient_available
  from locked_rows
  where current_quantity < requested_quantity
  limit 1;

  if v_insufficient_item_id is not null then
    v_failure_reason := format('Listing %s has only %s item(s) left.', v_insufficient_item_id, v_insufficient_available);

    insert into public.inventory_deduction_events (
      order_key,
      user_email,
      requested_items,
      status,
      failure_reason
    ) values (
      p_order_key,
      lower(trim(coalesce(p_user_email, ''))),
      p_items,
      'failed',
      v_failure_reason
    );

    insert into public.inventory_audit_log (
      order_key,
      listing_id,
      event_type,
      actor_email,
      details
    ) values (
      p_order_key,
      v_insufficient_item_id::uuid,
      'deduction_failed',
      lower(trim(coalesce(p_user_email, ''))),
      jsonb_build_object('reason', v_failure_reason, 'available', v_insufficient_available)
    );

    return jsonb_build_object('status', 'failed', 'idempotent', false, 'failure_reason', v_failure_reason, 'applied_items', '[]'::jsonb);
  end if;

  with deduped_request as (
    select listing_id, sum(quantity)::integer as quantity
    from temp_inventory_request
    group by listing_id
  ),
  locked_rows as (
    select
      mi.id,
      mi.quantity as previous_quantity,
      req.quantity as requested_quantity
    from public.marketplace_items mi
    join deduped_request req on req.listing_id = mi.id
    order by mi.id
    for update
  ),
  updated_rows as (
    update public.marketplace_items mi
    set quantity = mi.quantity - lr.requested_quantity
    from locked_rows lr
    where mi.id = lr.id
    returning mi.id, lr.requested_quantity, lr.previous_quantity, mi.quantity as new_quantity
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'listing_id', id,
        'deducted_quantity', requested_quantity,
        'previous_quantity', previous_quantity,
        'new_quantity', new_quantity
      )
      order by id
    ),
    '[]'::jsonb
  )
  into v_applied_items
  from updated_rows;

  insert into public.inventory_deduction_events (
    order_key,
    user_email,
    requested_items,
    applied_items,
    status,
    failure_reason
  ) values (
    p_order_key,
    lower(trim(coalesce(p_user_email, ''))),
    p_items,
    v_applied_items,
    'applied',
    null
  );

  insert into public.inventory_audit_log (
    order_key,
    listing_id,
    event_type,
    quantity_delta,
    previous_quantity,
    new_quantity,
    actor_email,
    details
  )
  select
    p_order_key,
    (entry->>'listing_id')::uuid,
    'deduction_applied',
    -1 * coalesce((entry->>'deducted_quantity')::integer, 0),
    coalesce((entry->>'previous_quantity')::integer, 0),
    coalesce((entry->>'new_quantity')::integer, 0),
    lower(trim(coalesce(p_user_email, ''))),
    entry
  from jsonb_array_elements(v_applied_items) as entry;

  return jsonb_build_object(
    'status', 'applied',
    'idempotent', false,
    'failure_reason', null,
    'applied_items', v_applied_items,
    'requested_items', p_items
  );
end;
$$;


-- ------------------------------------------------------------
-- >>> orders.sql
-- ------------------------------------------------------------
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


-- ------------------------------------------------------------
-- >>> order-status-history.sql
-- ------------------------------------------------------------
-- Adds an append-only timeline of status transitions for each order.
-- Each entry is an object: { "status": "In Transit", "at": "2026-05-08T01:28:00Z", "location": "..." }

alter table public.orders
  add column if not exists status_history jsonb not null default '[]'::jsonb;

create index if not exists orders_status_history_gin_idx
  on public.orders using gin (status_history);


-- ------------------------------------------------------------
-- >>> notifications.sql
-- ------------------------------------------------------------
create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  notification_key text not null,
  type text not null default 'info',
  title text not null,
  message text,
  href text,
  order_id text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_email, notification_key)
);

create index if not exists notifications_user_email_created_idx
  on public.notifications (user_email, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Public read notifications" on public.notifications;
create policy "Public read notifications"
on public.notifications
for select
using (true);

drop policy if exists "Public insert notifications" on public.notifications;
create policy "Public insert notifications"
on public.notifications
for insert
with check (true);

drop policy if exists "Public update notifications" on public.notifications;
create policy "Public update notifications"
on public.notifications
for update
using (true)
with check (true);

drop policy if exists "Public delete notifications" on public.notifications;
create policy "Public delete notifications"
on public.notifications
for delete
using (true);


-- ------------------------------------------------------------
-- >>> product-reviews.sql
-- ------------------------------------------------------------
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

