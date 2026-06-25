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


-- ------------------------------------------------------------
-- >>> password-reset-tokens.sql
-- ------------------------------------------------------------
-- ============================================================
-- password-reset-tokens.sql
-- Stores short-lived single-use tokens that authorise a password
-- reset for an account in public.account_users.
-- Idempotent: safe to re-run.
-- ============================================================

create table if not exists public.password_reset_tokens (
  token text primary key,
  email_address text not null,
  intended_role text not null default 'buyer' check (intended_role in ('buyer', 'seller')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_email_idx
  on public.password_reset_tokens (email_address);

create index if not exists password_reset_tokens_expires_idx
  on public.password_reset_tokens (expires_at);

alter table public.password_reset_tokens enable row level security;

-- The anon client needs to insert reset requests, look up the token
-- by primary key during the reset flow, and mark it as used. Email is
-- treated as low-sensitivity here (same as on the signup endpoint).
-- The token itself is the secret (256 bits of entropy).
drop policy if exists "password_reset_tokens_anon_insert" on public.password_reset_tokens;
create policy "password_reset_tokens_anon_insert"
  on public.password_reset_tokens
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "password_reset_tokens_anon_select" on public.password_reset_tokens;
create policy "password_reset_tokens_anon_select"
  on public.password_reset_tokens
  for select
  to anon, authenticated
  using (true);

drop policy if exists "password_reset_tokens_anon_update" on public.password_reset_tokens;
create policy "password_reset_tokens_anon_update"
  on public.password_reset_tokens
  for update
  to anon, authenticated
  using (true)
  with check (true);

-- ============================================================
-- >>> support-chat.sql
-- ============================================================
create extension if not exists pgcrypto;

create table if not exists public.support_chat_threads (
  id uuid primary key default gen_random_uuid(),
  thread_key text not null unique,
  participants jsonb not null default '[]'::jsonb,
  participant_names jsonb not null default '{}'::jsonb,
  issue_type text not null default 'General Support',
  order_id text,
  order_reference text,
  item_details jsonb,
  last_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_chat_threads_updated_idx
  on public.support_chat_threads (updated_at desc);

create index if not exists support_chat_threads_participants_gin_idx
  on public.support_chat_threads using gin (participants);

create table if not exists public.support_chat_messages (
  id uuid primary key default gen_random_uuid(),
  message_key text not null unique,
  thread_key text not null references public.support_chat_threads(thread_key) on delete cascade,
  sender_email text not null,
  sender_name text,
  sender_role text not null default 'client',
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.support_chat_messages
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists support_chat_messages_thread_created_idx
  on public.support_chat_messages (thread_key, created_at asc);

create index if not exists support_chat_messages_sender_idx
  on public.support_chat_messages (sender_email, created_at desc);

alter table public.support_chat_threads enable row level security;
alter table public.support_chat_messages enable row level security;

drop policy if exists "Public read support chat threads" on public.support_chat_threads;
create policy "Public read support chat threads"
on public.support_chat_threads
for select
using (true);

drop policy if exists "Public insert support chat threads" on public.support_chat_threads;
create policy "Public insert support chat threads"
on public.support_chat_threads
for insert
with check (true);

drop policy if exists "Public update support chat threads" on public.support_chat_threads;
create policy "Public update support chat threads"
on public.support_chat_threads
for update
using (true)
with check (true);

drop policy if exists "Public delete support chat threads" on public.support_chat_threads;
create policy "Public delete support chat threads"
on public.support_chat_threads
for delete
using (true);

drop policy if exists "Public read support chat messages" on public.support_chat_messages;
create policy "Public read support chat messages"
on public.support_chat_messages
for select
using (true);

drop policy if exists "Public insert support chat messages" on public.support_chat_messages;
create policy "Public insert support chat messages"
on public.support_chat_messages
for insert
with check (true);

drop policy if exists "Public update support chat messages" on public.support_chat_messages;
create policy "Public update support chat messages"
on public.support_chat_messages
for update
using (true)
with check (true);

drop policy if exists "Public delete support chat messages" on public.support_chat_messages;
create policy "Public delete support chat messages"
on public.support_chat_messages
for delete
using (true);

-- Last-seen presence: one heartbeat row per registered user so the chat can
-- show "last seen … ago" when the other party is offline. Updated every ~30s
-- while a user is connected and once more the moment they disconnect.
create table if not exists public.user_presence (
  email text primary key,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_presence_last_seen_idx
  on public.user_presence (last_seen_at desc);

alter table public.user_presence enable row level security;

drop policy if exists "Public read user presence" on public.user_presence;
create policy "Public read user presence"
on public.user_presence
for select
using (true);

drop policy if exists "Public insert user presence" on public.user_presence;
create policy "Public insert user presence"
on public.user_presence
for insert
with check (true);

drop policy if exists "Public update user presence" on public.user_presence;
create policy "Public update user presence"
on public.user_presence
for update
using (true)
with check (true);

-- Allow the frontend Realtime channel to receive last-seen changes
-- (idempotent: skip if the table is already part of the publication).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_presence'
  ) then
    alter publication supabase_realtime add table public.user_presence;
  end if;
end $$;

-- ------------------------------------------------------------
-- >>> chat-media-storage.sql
-- ------------------------------------------------------------
-- Chat media storage bucket for the "Let's Talk Business" chat.
--
-- Large chat attachments (photos, voice notes, videos, documents) are uploaded
-- here and only their short public URL is stored in support_chat_messages.body.
-- This replaces the old behaviour of base64-encoding files into the message
-- body, which failed for anything but tiny files.
--
-- Run this once in the Supabase SQL editor (or via `apply-all.sql`).

-- 1. Create the public bucket (idempotent).
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do update set public = true;

-- 2. Allow signed-in users to upload into the bucket.
drop policy if exists "chat-media authenticated upload" on storage.objects;
create policy "chat-media authenticated upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-media');

-- 3. Allow anyone to read objects (public bucket, so chat media renders for
--    both participants without signed URLs).
drop policy if exists "chat-media public read" on storage.objects;
create policy "chat-media public read"
  on storage.objects for select to public
  using (bucket_id = 'chat-media');

-- 4. Allow uploaders to update / delete their own objects.
drop policy if exists "chat-media owner update" on storage.objects;
create policy "chat-media owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'chat-media' and owner = auth.uid());

drop policy if exists "chat-media owner delete" on storage.objects;
create policy "chat-media owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'chat-media' and owner = auth.uid());

-- ------------------------------------------------------------
-- >>> user-handles.sql
-- ------------------------------------------------------------
-- Per-user shareable handles. Adds a public, URL-friendly `user_handle`
-- to account_users so every registered person gets a profile link they
-- can share (e.g. /u/jane-doe-4f2a) that opens a 1-to-1 chat with them.

alter table public.account_users
  add column if not exists user_handle text;

create unique index if not exists account_users_user_handle_unique
  on public.account_users (lower(user_handle))
  where user_handle is not null;

create index if not exists account_users_user_handle_idx
  on public.account_users (user_handle);

-- ------------------------------------------------------------
-- >>> wallet.sql
-- ------------------------------------------------------------
-- SVS eWallet
-- Customers can store money on the platform, spend it on items, send it to
-- other registered users, and request withdrawals back to their bank account.
--
-- All balance changes go through SECURITY DEFINER functions that lock the
-- account row (for update) and validate the balance, so concurrent operations
-- can never drive a wallet negative. The client only ever reads balances and
-- transactions directly.

create extension if not exists pgcrypto;

-- Wallet balance per user (single currency per wallet).
create table if not exists public.wallet_accounts (
  user_email text primary key,
  balance numeric(14, 2) not null default 0 check (balance >= 0),
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Append-only ledger of every wallet movement.
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  kind text not null check (kind in ('topup', 'transfer_in', 'transfer_out', 'withdrawal', 'purchase', 'refund')),
  direction text not null check (direction in ('credit', 'debit')),
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'USD',
  status text not null default 'completed' check (status in ('completed', 'pending', 'rejected')),
  counterparty text,
  reference text,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_user_idx
  on public.wallet_transactions (user_email, created_at desc);
create index if not exists wallet_transactions_status_idx
  on public.wallet_transactions (status, created_at desc);

alter table public.wallet_accounts enable row level security;
alter table public.wallet_transactions enable row level security;

-- Reads are public (matches the rest of the app). Writes are only allowed via
-- the SECURITY DEFINER functions below, so no direct insert/update policies.
drop policy if exists "Public read wallet accounts" on public.wallet_accounts;
create policy "Public read wallet accounts"
on public.wallet_accounts
for select
using (true);

drop policy if exists "Public read wallet transactions" on public.wallet_transactions;
create policy "Public read wallet transactions"
on public.wallet_transactions
for select
using (true);

-- Make sure an account row exists for a user.
create or replace function public.wallet_ensure_account(
  p_email text,
  p_currency text default 'USD'
)
returns public.wallet_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  acct public.wallet_accounts;
  v_email text := lower(trim(p_email));
begin
  if v_email is null or v_email = '' then
    raise exception 'A user email is required.';
  end if;

  insert into public.wallet_accounts (user_email, currency)
  values (v_email, coalesce(nullif(trim(p_currency), ''), 'USD'))
  on conflict (user_email) do update set updated_at = now()
  returning * into acct;

  return acct;
end;
$$;

-- Add funds (card top-up or demo top-up).
create or replace function public.wallet_topup(
  p_email text,
  p_amount numeric,
  p_currency text default 'USD',
  p_method text default 'card',
  p_reference text default null
)
returns public.wallet_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  acct public.wallet_accounts;
  v_email text := lower(trim(p_email));
  v_amount numeric := round(coalesce(p_amount, 0), 2);
begin
  if v_email is null or v_email = '' then
    raise exception 'A user email is required.';
  end if;
  if v_amount <= 0 then
    raise exception 'Top-up amount must be greater than zero.';
  end if;

  insert into public.wallet_accounts (user_email, currency)
  values (v_email, coalesce(nullif(trim(p_currency), ''), 'USD'))
  on conflict (user_email) do nothing;

  update public.wallet_accounts
  set balance = balance + v_amount, updated_at = now()
  where user_email = v_email
  returning * into acct;

  insert into public.wallet_transactions
    (user_email, kind, direction, amount, currency, status, reference, description)
  values
    (v_email, 'topup', 'credit', v_amount, acct.currency, 'completed', p_reference,
     concat('Added funds via ', coalesce(nullif(trim(p_method), ''), 'card')));

  return acct;
end;
$$;

-- Send money to another registered user.
create or replace function public.wallet_transfer(
  p_from text,
  p_to text,
  p_amount numeric,
  p_note text default null
)
returns public.wallet_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  from_acct public.wallet_accounts;
  v_from text := lower(trim(p_from));
  v_to text := lower(trim(p_to));
  v_amount numeric := round(coalesce(p_amount, 0), 2);
begin
  if v_from is null or v_from = '' or v_to is null or v_to = '' then
    raise exception 'Both sender and recipient are required.';
  end if;
  if v_from = v_to then
    raise exception 'You cannot send money to yourself.';
  end if;
  if v_amount <= 0 then
    raise exception 'Transfer amount must be greater than zero.';
  end if;

  select * into from_acct
  from public.wallet_accounts
  where user_email = v_from
  for update;

  if not found then
    raise exception 'You do not have a wallet yet.';
  end if;
  if from_acct.balance < v_amount then
    raise exception 'Insufficient wallet balance.';
  end if;

  insert into public.wallet_accounts (user_email, currency)
  values (v_to, from_acct.currency)
  on conflict (user_email) do nothing;

  update public.wallet_accounts
  set balance = balance - v_amount, updated_at = now()
  where user_email = v_from
  returning * into from_acct;

  update public.wallet_accounts
  set balance = balance + v_amount, updated_at = now()
  where user_email = v_to;

  insert into public.wallet_transactions
    (user_email, kind, direction, amount, currency, status, counterparty, description)
  values
    (v_from, 'transfer_out', 'debit', v_amount, from_acct.currency, 'completed', v_to,
     coalesce(nullif(trim(p_note), ''), concat('Sent to ', v_to)));

  insert into public.wallet_transactions
    (user_email, kind, direction, amount, currency, status, counterparty, description)
  values
    (v_to, 'transfer_in', 'credit', v_amount, from_acct.currency, 'completed', v_from,
     coalesce(nullif(trim(p_note), ''), concat('Received from ', v_from)));

  return from_acct;
end;
$$;

-- Spend wallet balance on a purchase.
create or replace function public.wallet_spend(
  p_email text,
  p_amount numeric,
  p_reference text default null,
  p_description text default null
)
returns public.wallet_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  acct public.wallet_accounts;
  v_email text := lower(trim(p_email));
  v_amount numeric := round(coalesce(p_amount, 0), 2);
begin
  if v_email is null or v_email = '' then
    raise exception 'A user email is required.';
  end if;
  if v_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  select * into acct
  from public.wallet_accounts
  where user_email = v_email
  for update;

  if not found then
    raise exception 'You do not have a wallet yet.';
  end if;
  if acct.balance < v_amount then
    raise exception 'Insufficient wallet balance.';
  end if;

  update public.wallet_accounts
  set balance = balance - v_amount, updated_at = now()
  where user_email = v_email
  returning * into acct;

  insert into public.wallet_transactions
    (user_email, kind, direction, amount, currency, status, reference, description)
  values
    (v_email, 'purchase', 'debit', v_amount, acct.currency, 'completed', p_reference,
     coalesce(nullif(trim(p_description), ''), 'Wallet purchase'));

  return acct;
end;
$$;

-- Request a withdrawal back to a bank account. Funds are reserved immediately
-- (deducted from balance) and the request is left pending for an admin to pay
-- out, mirroring the seller payout flow.
create or replace function public.wallet_withdraw(
  p_email text,
  p_amount numeric,
  p_destination text default null
)
returns public.wallet_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  acct public.wallet_accounts;
  v_email text := lower(trim(p_email));
  v_amount numeric := round(coalesce(p_amount, 0), 2);
begin
  if v_email is null or v_email = '' then
    raise exception 'A user email is required.';
  end if;
  if v_amount <= 0 then
    raise exception 'Withdrawal amount must be greater than zero.';
  end if;

  select * into acct
  from public.wallet_accounts
  where user_email = v_email
  for update;

  if not found then
    raise exception 'You do not have a wallet yet.';
  end if;
  if acct.balance < v_amount then
    raise exception 'Insufficient wallet balance.';
  end if;

  update public.wallet_accounts
  set balance = balance - v_amount, updated_at = now()
  where user_email = v_email
  returning * into acct;

  insert into public.wallet_transactions
    (user_email, kind, direction, amount, currency, status, counterparty, description)
  values
    (v_email, 'withdrawal', 'debit', v_amount, acct.currency, 'pending', p_destination,
     'Withdrawal request');

  return acct;
end;
$$;

grant execute on function public.wallet_ensure_account(text, text) to anon, authenticated;
grant execute on function public.wallet_topup(text, numeric, text, text, text) to anon, authenticated;
grant execute on function public.wallet_transfer(text, text, numeric, text) to anon, authenticated;
grant execute on function public.wallet_spend(text, numeric, text, text) to anon, authenticated;
grant execute on function public.wallet_withdraw(text, numeric, text) to anon, authenticated;

-- ------------------------------------------------------------
-- >>> wallet-security-and-beneficiaries.sql
-- ------------------------------------------------------------
create extension if not exists pgcrypto;

create table if not exists public.wallet_otp_codes (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  purpose text not null check (purpose in ('topup', 'transfer', 'withdraw', 'spend')),
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists wallet_otp_codes_lookup_idx
  on public.wallet_otp_codes (user_email, purpose, created_at desc);

alter table public.wallet_otp_codes enable row level security;
-- Intentionally no policies for anon/authenticated: the code hash must
-- never be readable by a client query. Every read/write happens inside
-- the SECURITY DEFINER functions below, which bypass RLS.

create or replace function public.wallet_request_otp(
  p_email text,
  p_purpose text
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text := lower(trim(p_email));
  v_code text;
  v_recent timestamptz;
begin
  if v_email is null or v_email = '' then
    raise exception 'A user email is required.';
  end if;
  if p_purpose not in ('topup', 'transfer', 'withdraw', 'spend') then
    raise exception 'Unknown OTP purpose.';
  end if;

  select created_at into v_recent
  from public.wallet_otp_codes
  where user_email = v_email and purpose = p_purpose
  order by created_at desc
  limit 1;

  if v_recent is not null and v_recent > now() - interval '30 seconds' then
    raise exception 'Please wait before requesting another code.';
  end if;

  update public.wallet_otp_codes
  set expires_at = now()
  where user_email = v_email and purpose = p_purpose and redeemed_at is null;

  v_code := lpad(floor(random() * 1000000)::text, 6, '0');

  insert into public.wallet_otp_codes (user_email, purpose, code_hash, expires_at)
  values (v_email, p_purpose, encode(digest(v_code, 'sha256'), 'hex'), now() + interval '10 minutes');

  return v_code;
end;
$$;

create or replace function public.wallet_verify_otp(
  p_email text,
  p_purpose text,
  p_code text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text := lower(trim(p_email));
  v_row public.wallet_otp_codes;
begin
  select * into v_row
  from public.wallet_otp_codes
  where user_email = v_email and purpose = p_purpose and redeemed_at is null
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'No pending code for this action. Request a new one.';
  end if;
  if v_row.expires_at < now() then
    raise exception 'That code has expired. Request a new one.';
  end if;
  if v_row.attempts >= 5 then
    raise exception 'Too many incorrect attempts. Request a new code.';
  end if;

  if v_row.code_hash <> encode(digest(coalesce(trim(p_code), ''), 'sha256'), 'hex') then
    update public.wallet_otp_codes set attempts = attempts + 1 where id = v_row.id;
    raise exception 'Incorrect code.';
  end if;

  update public.wallet_otp_codes set verified_at = now() where id = v_row.id;

  return v_row.id;
end;
$$;

create or replace function public.wallet_redeem_otp(
  p_otp_id uuid,
  p_email text,
  p_purpose text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_id uuid;
begin
  if p_otp_id is null then
    raise exception 'A verification code is required for this action.';
  end if;

  update public.wallet_otp_codes
  set redeemed_at = now()
  where id = p_otp_id
    and user_email = v_email
    and purpose = p_purpose
    and verified_at is not null
    and verified_at > now() - interval '5 minutes'
    and redeemed_at is null
  returning id into v_id;

  if v_id is null then
    raise exception 'Verification expired or already used. Please verify again.';
  end if;
end;
$$;

grant execute on function public.wallet_request_otp(text, text) to anon, authenticated;
grant execute on function public.wallet_verify_otp(text, text, text) to anon, authenticated;

create table if not exists public.wallet_beneficiaries (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null,
  beneficiary_email text not null,
  beneficiary_phone text,
  beneficiary_name text,
  nickname text,
  created_at timestamptz not null default now(),
  unique (owner_email, beneficiary_email)
);

create index if not exists wallet_beneficiaries_owner_idx
  on public.wallet_beneficiaries (owner_email, created_at desc);

alter table public.wallet_beneficiaries enable row level security;

drop policy if exists "Public read wallet beneficiaries" on public.wallet_beneficiaries;
create policy "Public read wallet beneficiaries"
on public.wallet_beneficiaries for select using (true);

drop policy if exists "Public insert wallet beneficiaries" on public.wallet_beneficiaries;
create policy "Public insert wallet beneficiaries"
on public.wallet_beneficiaries for insert with check (true);

drop policy if exists "Public update wallet beneficiaries" on public.wallet_beneficiaries;
create policy "Public update wallet beneficiaries"
on public.wallet_beneficiaries for update using (true) with check (true);

drop policy if exists "Public delete wallet beneficiaries" on public.wallet_beneficiaries;
create policy "Public delete wallet beneficiaries"
on public.wallet_beneficiaries for delete using (true);

create table if not exists public.wallet_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  account_holder text not null,
  bank_name text not null,
  account_number text not null,
  branch_code text,
  account_type text,
  nickname text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists wallet_bank_accounts_user_idx
  on public.wallet_bank_accounts (user_email, created_at desc);

alter table public.wallet_bank_accounts enable row level security;

drop policy if exists "Public read wallet bank accounts" on public.wallet_bank_accounts;
create policy "Public read wallet bank accounts"
on public.wallet_bank_accounts for select using (true);

drop policy if exists "Public insert wallet bank accounts" on public.wallet_bank_accounts;
create policy "Public insert wallet bank accounts"
on public.wallet_bank_accounts for insert with check (true);

drop policy if exists "Public update wallet bank accounts" on public.wallet_bank_accounts;
create policy "Public update wallet bank accounts"
on public.wallet_bank_accounts for update using (true) with check (true);

drop policy if exists "Public delete wallet bank accounts" on public.wallet_bank_accounts;
create policy "Public delete wallet bank accounts"
on public.wallet_bank_accounts for delete using (true);

create table if not exists public.wallet_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'USD',
  bank_account_id uuid references public.wallet_bank_accounts(id) on delete set null,
  destination_label text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'paid', 'rejected')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists wallet_withdrawal_requests_user_idx
  on public.wallet_withdrawal_requests (user_email, requested_at desc);

alter table public.wallet_withdrawal_requests enable row level security;

drop policy if exists "Public read wallet withdrawal requests" on public.wallet_withdrawal_requests;
create policy "Public read wallet withdrawal requests"
on public.wallet_withdrawal_requests for select using (true);

drop policy if exists "Public update wallet withdrawal requests" on public.wallet_withdrawal_requests;
create policy "Public update wallet withdrawal requests"
on public.wallet_withdrawal_requests for update using (true) with check (true);

create or replace function public.wallet_topup(
  p_email text,
  p_amount numeric,
  p_currency text default 'USD',
  p_method text default 'card',
  p_reference text default null,
  p_otp_id uuid default null
)
returns public.wallet_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  acct public.wallet_accounts;
  v_email text := lower(trim(p_email));
  v_amount numeric := round(coalesce(p_amount, 0), 2);
begin
  if v_email is null or v_email = '' then
    raise exception 'A user email is required.';
  end if;
  if v_amount <= 0 then
    raise exception 'Top-up amount must be greater than zero.';
  end if;

  perform public.wallet_redeem_otp(p_otp_id, v_email, 'topup');

  insert into public.wallet_accounts (user_email, currency)
  values (v_email, coalesce(nullif(trim(p_currency), ''), 'USD'))
  on conflict (user_email) do nothing;

  update public.wallet_accounts
  set balance = balance + v_amount, updated_at = now()
  where user_email = v_email
  returning * into acct;

  insert into public.wallet_transactions
    (user_email, kind, direction, amount, currency, status, reference, description)
  values
    (v_email, 'topup', 'credit', v_amount, acct.currency, 'completed', p_reference,
     concat('Added funds via ', coalesce(nullif(trim(p_method), ''), 'card')));

  return acct;
end;
$$;

create or replace function public.wallet_transfer(
  p_from text,
  p_to text,
  p_amount numeric,
  p_note text default null,
  p_otp_id uuid default null
)
returns public.wallet_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  from_acct public.wallet_accounts;
  v_from text := lower(trim(p_from));
  v_to text := lower(trim(p_to));
  v_amount numeric := round(coalesce(p_amount, 0), 2);
begin
  if v_from is null or v_from = '' or v_to is null or v_to = '' then
    raise exception 'Both sender and recipient are required.';
  end if;
  if v_from = v_to then
    raise exception 'You cannot send money to yourself.';
  end if;
  if v_amount <= 0 then
    raise exception 'Transfer amount must be greater than zero.';
  end if;

  perform public.wallet_redeem_otp(p_otp_id, v_from, 'transfer');

  select * into from_acct
  from public.wallet_accounts
  where user_email = v_from
  for update;

  if not found then
    raise exception 'You do not have a wallet yet.';
  end if;
  if from_acct.balance < v_amount then
    raise exception 'Insufficient wallet balance.';
  end if;

  insert into public.wallet_accounts (user_email, currency)
  values (v_to, from_acct.currency)
  on conflict (user_email) do nothing;

  update public.wallet_accounts
  set balance = balance - v_amount, updated_at = now()
  where user_email = v_from
  returning * into from_acct;

  update public.wallet_accounts
  set balance = balance + v_amount, updated_at = now()
  where user_email = v_to;

  insert into public.wallet_transactions
    (user_email, kind, direction, amount, currency, status, counterparty, description)
  values
    (v_from, 'transfer_out', 'debit', v_amount, from_acct.currency, 'completed', v_to,
     coalesce(nullif(trim(p_note), ''), concat('Sent to ', v_to)));

  insert into public.wallet_transactions
    (user_email, kind, direction, amount, currency, status, counterparty, description)
  values
    (v_to, 'transfer_in', 'credit', v_amount, from_acct.currency, 'completed', v_from,
     coalesce(nullif(trim(p_note), ''), concat('Received from ', v_from)));

  return from_acct;
end;
$$;

create or replace function public.wallet_spend(
  p_email text,
  p_amount numeric,
  p_reference text default null,
  p_description text default null,
  p_otp_id uuid default null
)
returns public.wallet_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  acct public.wallet_accounts;
  v_email text := lower(trim(p_email));
  v_amount numeric := round(coalesce(p_amount, 0), 2);
begin
  if v_email is null or v_email = '' then
    raise exception 'A user email is required.';
  end if;
  if v_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  perform public.wallet_redeem_otp(p_otp_id, v_email, 'spend');

  select * into acct
  from public.wallet_accounts
  where user_email = v_email
  for update;

  if not found then
    raise exception 'You do not have a wallet yet.';
  end if;
  if acct.balance < v_amount then
    raise exception 'Insufficient wallet balance.';
  end if;

  update public.wallet_accounts
  set balance = balance - v_amount, updated_at = now()
  where user_email = v_email
  returning * into acct;

  insert into public.wallet_transactions
    (user_email, kind, direction, amount, currency, status, reference, description)
  values
    (v_email, 'purchase', 'debit', v_amount, acct.currency, 'completed', p_reference,
     coalesce(nullif(trim(p_description), ''), 'Wallet purchase'));

  return acct;
end;
$$;

create or replace function public.wallet_withdraw(
  p_email text,
  p_amount numeric,
  p_destination text default null,
  p_bank_account_id uuid default null,
  p_otp_id uuid default null
)
returns public.wallet_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  acct public.wallet_accounts;
  bank public.wallet_bank_accounts;
  v_email text := lower(trim(p_email));
  v_amount numeric := round(coalesce(p_amount, 0), 2);
  v_destination_label text := p_destination;
begin
  if v_email is null or v_email = '' then
    raise exception 'A user email is required.';
  end if;
  if v_amount <= 0 then
    raise exception 'Withdrawal amount must be greater than zero.';
  end if;

  perform public.wallet_redeem_otp(p_otp_id, v_email, 'withdraw');

  if p_bank_account_id is not null then
    select * into bank
    from public.wallet_bank_accounts
    where id = p_bank_account_id and user_email = v_email;

    if not found then
      raise exception 'Bank account not found.';
    end if;
    v_destination_label := concat(bank.bank_name, ' •••• ', right(bank.account_number, 4));
  end if;

  select * into acct
  from public.wallet_accounts
  where user_email = v_email
  for update;

  if not found then
    raise exception 'You do not have a wallet yet.';
  end if;
  if acct.balance < v_amount then
    raise exception 'Insufficient wallet balance.';
  end if;

  update public.wallet_accounts
  set balance = balance - v_amount, updated_at = now()
  where user_email = v_email
  returning * into acct;

  insert into public.wallet_transactions
    (user_email, kind, direction, amount, currency, status, counterparty, description)
  values
    (v_email, 'withdrawal', 'debit', v_amount, acct.currency, 'pending', v_destination_label,
     'Withdrawal request');

  insert into public.wallet_withdrawal_requests
    (user_email, amount, currency, bank_account_id, destination_label, status)
  values
    (v_email, v_amount, acct.currency, p_bank_account_id, v_destination_label, 'pending');

  return acct;
end;
$$;

create or replace function public.wallet_refund(
  p_email text,
  p_amount numeric,
  p_reference text default null,
  p_description text default null
)
returns public.wallet_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  acct public.wallet_accounts;
  v_email text := lower(trim(p_email));
  v_amount numeric := round(coalesce(p_amount, 0), 2);
begin
  if v_email is null or v_email = '' then
    raise exception 'A user email is required.';
  end if;
  if v_amount <= 0 then
    raise exception 'Refund amount must be greater than zero.';
  end if;

  insert into public.wallet_accounts (user_email)
  values (v_email)
  on conflict (user_email) do nothing;

  update public.wallet_accounts
  set balance = balance + v_amount, updated_at = now()
  where user_email = v_email
  returning * into acct;

  insert into public.wallet_transactions
    (user_email, kind, direction, amount, currency, status, reference, description)
  values
    (v_email, 'refund', 'credit', v_amount, acct.currency, 'completed', p_reference,
     coalesce(nullif(trim(p_description), ''), 'Refund'));

  return acct;
end;
$$;

grant execute on function public.wallet_topup(text, numeric, text, text, text, uuid) to anon, authenticated;
grant execute on function public.wallet_transfer(text, text, numeric, text, uuid) to anon, authenticated;
grant execute on function public.wallet_spend(text, numeric, text, text, uuid) to anon, authenticated;
grant execute on function public.wallet_withdraw(text, numeric, text, uuid, uuid) to anon, authenticated;
grant execute on function public.wallet_refund(text, numeric, text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- >>> seller-verification-documents.sql
-- ------------------------------------------------------------
alter table public.seller_profiles
  add column if not exists id_document_path text,
  add column if not exists id_document_type text check (id_document_type in ('national_id', 'passport')),
  add column if not exists selfie_path text,
  add column if not exists selfie_captured_at timestamptz;

insert into storage.buckets (id, name, public)
values ('seller-verification', 'seller-verification', false)
on conflict (id) do update set public = false;

drop policy if exists "Public upload seller verification documents" on storage.objects;
create policy "Public upload seller verification documents"
on storage.objects
for insert
with check (bucket_id = 'seller-verification');

drop policy if exists "Public read seller verification documents" on storage.objects;
create policy "Public read seller verification documents"
on storage.objects
for select
using (bucket_id = 'seller-verification');

drop policy if exists "Public update seller verification documents" on storage.objects;
create policy "Public update seller verification documents"
on storage.objects
for update
using (bucket_id = 'seller-verification')
with check (bucket_id = 'seller-verification');

-- ------------------------------------------------------------
-- >>> seller-fraud-traceability.sql
-- ------------------------------------------------------------
create table if not exists public.banned_identifiers (
  id uuid primary key default gen_random_uuid(),
  identifier_type text not null check (identifier_type in ('id_number', 'payout_account_number', 'phone_number', 'email')),
  identifier_value text not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (identifier_type, identifier_value)
);

create index if not exists banned_identifiers_lookup_idx
  on public.banned_identifiers (identifier_type, identifier_value);

alter table public.banned_identifiers enable row level security;

drop policy if exists "Public read banned identifiers" on public.banned_identifiers;
create policy "Public read banned identifiers"
on public.banned_identifiers
for select
using (true);

create or replace function public.ban_seller_identifiers_on_rejection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := concat('Seller profile rejected: ', coalesce(nullif(trim(new.business_name), ''), new.user_email));
begin
  if new.compliance_status = 'rejected' and coalesce(old.compliance_status, '') is distinct from 'rejected' then
    insert into public.banned_identifiers (identifier_type, identifier_value, reason)
    select identifier_type, identifier_value, v_reason
    from (values
      ('id_number', nullif(trim(new.id_number), '')),
      ('payout_account_number', nullif(trim(new.payout_account_number), '')),
      ('phone_number', nullif(trim(new.phone_number), '')),
      ('email', nullif(trim(new.user_email), ''))
    ) as identifiers(identifier_type, identifier_value)
    where identifier_value is not null
    on conflict (identifier_type, identifier_value) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists seller_profiles_ban_on_rejection on public.seller_profiles;
create trigger seller_profiles_ban_on_rejection
after update on public.seller_profiles
for each row
execute function public.ban_seller_identifiers_on_rejection();

create table if not exists public.seller_profile_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  field_name text not null,
  old_value text,
  new_value text,
  changed_at timestamptz not null default now()
);

create index if not exists seller_profile_audit_log_user_email_idx
  on public.seller_profile_audit_log (user_email, changed_at desc);

alter table public.seller_profile_audit_log enable row level security;

create or replace function public.log_seller_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
  v_field text;
  v_tracked text[] := array['business_name', 'legal_full_name', 'phone_number', 'payout_account_holder', 'payout_bank_name', 'payout_account_number', 'payout_branch_code'];
begin
  foreach v_field in array v_tracked loop
    if coalesce(v_old ->> v_field, '') is distinct from coalesce(v_new ->> v_field, '') then
      insert into public.seller_profile_audit_log (user_email, field_name, old_value, new_value)
      values (new.user_email, v_field, v_old ->> v_field, v_new ->> v_field);
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists seller_profiles_audit_changes on public.seller_profiles;
create trigger seller_profiles_audit_changes
after update on public.seller_profiles
for each row
execute function public.log_seller_profile_changes();

-- ------------------------------------------------------------
-- >>> admin-panel.sql
-- ------------------------------------------------------------
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  failed_login_count int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create table if not exists public.admin_sessions (
  token text primary key,
  admin_email text not null references public.admin_users(email) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now()
);

create index if not exists admin_sessions_admin_email_idx
  on public.admin_sessions (admin_email);

alter table public.admin_sessions enable row level security;

create table if not exists public.admin_action_log (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_action_log_created_idx
  on public.admin_action_log (created_at desc);

alter table public.admin_action_log enable row level security;

create or replace function public.admin_login(
  p_email text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text := lower(trim(p_email));
  v_admin public.admin_users;
  v_token text;
  v_expires_at timestamptz := now() + interval '12 hours';
begin
  if v_email = '' or coalesce(p_password, '') = '' then
    return null;
  end if;

  select * into v_admin
  from public.admin_users
  where email = v_email
  for update;

  if not found then
    return null;
  end if;

  if v_admin.locked_until is not null and v_admin.locked_until > now() then
    return null;
  end if;

  if v_admin.password_hash <> crypt(p_password, v_admin.password_hash) then
    update public.admin_users
    set failed_login_count = failed_login_count + 1,
        locked_until = case when failed_login_count + 1 >= 5 then now() + interval '15 minutes' else locked_until end
    where email = v_email;

    return null;
  end if;

  update public.admin_users
  set failed_login_count = 0, locked_until = null
  where email = v_email;

  v_token := encode(gen_random_bytes(32), 'hex');

  insert into public.admin_sessions (token, admin_email, expires_at)
  values (v_token, v_email, v_expires_at);

  return jsonb_build_object('token', v_token, 'full_name', v_admin.full_name, 'expires_at', v_expires_at);
end;
$$;

create or replace function public.admin_verify_session(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.admin_sessions;
  v_admin public.admin_users;
begin
  if coalesce(p_token, '') = '' then
    raise exception 'Not signed in.';
  end if;

  select * into v_session
  from public.admin_sessions
  where token = p_token;

  if not found or v_session.expires_at < now() then
    raise exception 'Session expired. Sign in again.';
  end if;

  select * into v_admin
  from public.admin_users
  where email = v_session.admin_email;

  if not found then
    raise exception 'Session expired. Sign in again.';
  end if;

  update public.admin_sessions
  set last_seen_at = now()
  where token = p_token;

  return jsonb_build_object('admin_email', v_admin.email, 'full_name', v_admin.full_name);
end;
$$;

create or replace function public.admin_logout(
  p_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.admin_sessions where token = p_token;
end;
$$;

create or replace function public.admin_require_session(
  p_token text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.admin_sessions;
begin
  if coalesce(p_token, '') = '' then
    raise exception 'Not signed in.';
  end if;

  select * into v_session
  from public.admin_sessions
  where token = p_token;

  if not found or v_session.expires_at < now() then
    raise exception 'Session expired. Sign in again.';
  end if;

  update public.admin_sessions set last_seen_at = now() where token = p_token;

  return v_session.admin_email;
end;
$$;

create or replace function public.admin_review_seller(
  p_token text,
  p_user_email text,
  p_decision text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_email text := public.admin_require_session(p_token);
  v_previous_status text;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected.';
  end if;

  select compliance_status into v_previous_status
  from public.seller_profiles
  where user_email = lower(trim(p_user_email));

  if v_previous_status is null then
    raise exception 'Seller profile not found.';
  end if;

  update public.seller_profiles
  set compliance_status = p_decision, updated_at = now()
  where user_email = lower(trim(p_user_email));

  insert into public.admin_action_log (admin_email, action, target_type, target_id, details)
  values (
    v_admin_email,
    concat('seller_', p_decision),
    'seller_profile',
    lower(trim(p_user_email)),
    jsonb_build_object('previous_status', v_previous_status, 'notes', p_notes)
  );
end;
$$;

create or replace function public.admin_get_profile_audit_log(
  p_token text,
  p_user_email text default null,
  p_limit int default 200
)
returns setof public.seller_profile_audit_log
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_require_session(p_token);

  return query
  select *
  from public.seller_profile_audit_log
  where p_user_email is null or user_email = lower(trim(p_user_email))
  order by changed_at desc
  limit greatest(p_limit, 1);
end;
$$;

create or replace function public.admin_get_action_log(
  p_token text,
  p_limit int default 200
)
returns setof public.admin_action_log
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_require_session(p_token);

  return query
  select *
  from public.admin_action_log
  order by created_at desc
  limit greatest(p_limit, 1);
end;
$$;

create or replace function public.admin_log_action(
  p_token text,
  p_action text,
  p_target_type text,
  p_target_id text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_email text := public.admin_require_session(p_token);
begin
  insert into public.admin_action_log (admin_email, action, target_type, target_id, details)
  values (v_admin_email, p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb));
end;
$$;

grant execute on function public.admin_login(text, text) to anon, authenticated;
grant execute on function public.admin_verify_session(text) to anon, authenticated;
grant execute on function public.admin_logout(text) to anon, authenticated;
grant execute on function public.admin_review_seller(text, text, text, text) to anon, authenticated;
grant execute on function public.admin_get_profile_audit_log(text, text, int) to anon, authenticated;
grant execute on function public.admin_get_action_log(text, int) to anon, authenticated;
grant execute on function public.admin_log_action(text, text, text, text, jsonb) to anon, authenticated;

-- ------------------------------------------------------------
-- >>> seller-verification-advancements.sql
-- ------------------------------------------------------------
alter table public.seller_profiles
  add column if not exists id_document_is_dark boolean not null default false,
  add column if not exists selfie_is_dark boolean not null default false,
  add column if not exists rejection_reason text;

create or replace function public.admin_review_seller(
  p_token text,
  p_user_email text,
  p_decision text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_email text := public.admin_require_session(p_token);
  v_previous_status text;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected.';
  end if;

  select compliance_status into v_previous_status
  from public.seller_profiles
  where user_email = lower(trim(p_user_email));

  if v_previous_status is null then
    raise exception 'Seller profile not found.';
  end if;

  update public.seller_profiles
  set compliance_status = p_decision,
      rejection_reason = case when p_decision = 'rejected' then nullif(trim(p_notes), '') else null end,
      updated_at = now()
  where user_email = lower(trim(p_user_email));

  insert into public.admin_action_log (admin_email, action, target_type, target_id, details)
  values (
    v_admin_email,
    concat('seller_', p_decision),
    'seller_profile',
    lower(trim(p_user_email)),
    jsonb_build_object('previous_status', v_previous_status, 'notes', p_notes)
  );
end;
$$;


create or replace function public.admin_cancel_rejection(
  p_token text,
  p_user_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_email text := public.admin_require_session(p_token);
  v_profile public.seller_profiles;
begin
  select * into v_profile
  from public.seller_profiles
  where user_email = lower(trim(p_user_email));

  if not found then
    raise exception 'Seller profile not found.';
  end if;

  if v_profile.compliance_status <> 'rejected' then
    raise exception 'This seller is not currently rejected.';
  end if;

  update public.seller_profiles
  set compliance_status = 'submitted', rejection_reason = null, updated_at = now()
  where user_email = v_profile.user_email;

  delete from public.banned_identifiers
  where (identifier_type = 'email' and identifier_value = v_profile.user_email)
     or (identifier_type = 'id_number' and identifier_value = nullif(trim(v_profile.id_number), ''))
     or (identifier_type = 'payout_account_number' and identifier_value = nullif(trim(v_profile.payout_account_number), ''))
     or (identifier_type = 'phone_number' and identifier_value = nullif(trim(v_profile.phone_number), ''));

  insert into public.admin_action_log (admin_email, action, target_type, target_id, details)
  values (v_admin_email, 'seller_rejection_cancelled', 'seller_profile', v_profile.user_email, jsonb_build_object('previous_status', 'rejected'));
end;
$$;

grant execute on function public.admin_cancel_rejection(text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- >>> seller-changes-requested.sql
-- ------------------------------------------------------------
alter table public.seller_profiles
  drop constraint if exists seller_profiles_compliance_status_check;

alter table public.seller_profiles
  add constraint seller_profiles_compliance_status_check
  check (compliance_status in ('pending', 'submitted', 'approved', 'rejected', 'changes_requested'));

alter table public.seller_profiles
  add column if not exists admin_message text,
  add column if not exists fields_to_edit jsonb not null default '[]'::jsonb;

create or replace function public.admin_request_changes(
  p_token text,
  p_user_email text,
  p_message text,
  p_fields jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_email text := public.admin_require_session(p_token);
  v_profile public.seller_profiles;
  v_trimmed_message text := nullif(trim(p_message), '');
begin
  if v_trimmed_message is null then
    raise exception 'Add a message telling the seller what to fix.';
  end if;

  select * into v_profile
  from public.seller_profiles
  where user_email = lower(trim(p_user_email));

  if not found then
    raise exception 'Seller profile not found.';
  end if;

  update public.seller_profiles
  set compliance_status = 'changes_requested',
      admin_message = v_trimmed_message,
      fields_to_edit = coalesce(p_fields, '[]'::jsonb),
      rejection_reason = null,
      updated_at = now()
  where user_email = v_profile.user_email;

  insert into public.admin_action_log (admin_email, action, target_type, target_id, details)
  values (
    v_admin_email,
    'seller_changes_requested',
    'seller_profile',
    v_profile.user_email,
    jsonb_build_object('message', v_trimmed_message, 'fields', p_fields)
  );
end;
$$;

grant execute on function public.admin_request_changes(text, text, text, jsonb) to anon, authenticated;

create or replace function public.admin_review_seller(
  p_token text,
  p_user_email text,
  p_decision text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_email text := public.admin_require_session(p_token);
  v_previous_status text;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected.';
  end if;

  select compliance_status into v_previous_status
  from public.seller_profiles
  where user_email = lower(trim(p_user_email));

  if v_previous_status is null then
    raise exception 'Seller profile not found.';
  end if;

  update public.seller_profiles
  set compliance_status = p_decision,
      rejection_reason = case when p_decision = 'rejected' then nullif(trim(p_notes), '') else null end,
      admin_message = null,
      fields_to_edit = '[]'::jsonb,
      updated_at = now()
  where user_email = lower(trim(p_user_email));

  insert into public.admin_action_log (admin_email, action, target_type, target_id, details)
  values (
    v_admin_email,
    concat('seller_', p_decision),
    'seller_profile',
    lower(trim(p_user_email)),
    jsonb_build_object('previous_status', v_previous_status, 'notes', p_notes)
  );
end;
$$;
