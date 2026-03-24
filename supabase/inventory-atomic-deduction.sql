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
