-- Atomic inventory deduction for marketplace orders.
-- Uses a single UPDATE statement (not SELECT-then-UPDATE) so two concurrent
-- purchases of the last unit cannot both succeed: the WHERE clause
-- `quantity IS NULL OR quantity >= requested` is evaluated and applied
-- atomically by PostgreSQL — no separate lock acquisition required.
-- A BEGIN…EXCEPTION block acts as an implicit savepoint so partial decrements
-- on multi-item orders are always rolled back on failure.
-- Idempotent: safe to run repeatedly. Apply via: Supabase Dashboard -> SQL Editor -> Run.

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
on public.inventory_deduction_events for select using (true);

drop policy if exists "Public insert inventory deduction events" on public.inventory_deduction_events;
create policy "Public insert inventory deduction events"
on public.inventory_deduction_events for insert with check (true);

drop policy if exists "Public update inventory deduction events" on public.inventory_deduction_events;
create policy "Public update inventory deduction events"
on public.inventory_deduction_events for update using (true) with check (true);

drop policy if exists "Public read inventory audit log" on public.inventory_audit_log;
create policy "Public read inventory audit log"
on public.inventory_audit_log for select using (true);

drop policy if exists "Public insert inventory audit log" on public.inventory_audit_log;
create policy "Public insert inventory audit log"
on public.inventory_audit_log for insert with check (true);

create or replace function public.apply_inventory_deduction(
  p_order_key  text,
  p_user_email text,
  p_items      jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing      record;
  v_applied_items jsonb;
  v_failure_reason text;
  v_total_requested integer;
  v_total_updated   integer;
  v_clean_email     text := lower(trim(coalesce(p_user_email, '')));
begin
  -- ── Input validation ────────────────────────────────────────────────────────
  if coalesce(trim(p_order_key), '') = '' then
    raise exception 'order_key is required';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items array is required';
  end if;

  -- ── Idempotency check ───────────────────────────────────────────────────────
  -- If this order_key was already processed, return the stored result immediately.
  select * into v_existing
  from public.inventory_deduction_events
  where order_key = p_order_key
  limit 1;

  if found then
    return jsonb_build_object(
      'status',         case when v_existing.status = 'applied' then 'already_applied' else 'failed' end,
      'idempotent',     true,
      'failure_reason', v_existing.failure_reason,
      'applied_items',  v_existing.applied_items,
      'requested_items', v_existing.requested_items
    );
  end if;

  -- ── Pre-flight stock check ──────────────────────────────────────────────────
  -- Catches the common (non-race) case of clearly insufficient stock early so
  -- the error message is clear. This is NOT the race guard — that is the atomic
  -- UPDATE below. NULL quantity = unlimited stock (always passes).
  with deduped as (
    select
      (item->>'listing_id')::uuid          as listing_id,
      sum((item->>'quantity')::integer)::integer as total_qty
    from jsonb_array_elements(p_items) as item
    group by 1
  )
  select mi.id, coalesce(mi.quantity, 0)
  into v_existing.id, v_total_requested          -- reuse v_existing fields temporarily
  from deduped d
  join public.marketplace_items mi on mi.id = d.listing_id
  where mi.quantity is not null and mi.quantity < d.total_qty
  limit 1;

  if v_existing.id is not null then
    v_failure_reason := format(
      'One or more items are no longer available in the requested quantity (available: %s).',
      v_total_requested
    );
    insert into public.inventory_deduction_events
      (order_key, user_email, requested_items, applied_items, status, failure_reason)
    values
      (p_order_key, v_clean_email, p_items, '[]'::jsonb, 'failed', v_failure_reason)
    on conflict (order_key) do nothing;
    insert into public.inventory_audit_log
      (order_key, listing_id, event_type, actor_email, details)
    values
      (p_order_key, v_existing.id, 'deduction_failed', v_clean_email,
       jsonb_build_object('reason', v_failure_reason, 'available', v_total_requested));
    return jsonb_build_object(
      'status', 'failed', 'idempotent', false,
      'failure_reason', v_failure_reason, 'applied_items', '[]'::jsonb
    );
  end if;

  -- ── Atomic decrement ────────────────────────────────────────────────────────
  -- A single UPDATE statement is always atomic in PostgreSQL.  The WHERE clause
  -- `quantity IS NULL OR quantity >= total_qty` means:
  --   • If two buyers race for the last unit, only the one whose UPDATE runs
  --     first satisfies the WHERE clause.  The second finds quantity=0, the
  --     WHERE fails, that row is not updated, v_total_updated < v_total_requested,
  --     and we raise an exception that rolls back everything inside this block.
  --   • NULL quantity = unlimited stock; those rows always pass and are updated
  --     to NULL (stays unlimited).
  --
  -- BEGIN…EXCEPTION creates an implicit savepoint. On exception the savepoint
  -- is restored, undoing any partial decrements, before we log the failure.
  begin
    with deduped as (
      select
        (item->>'listing_id')::uuid               as listing_id,
        sum((item->>'quantity')::integer)::integer as total_qty
      from jsonb_array_elements(p_items) as item
      group by 1
    ),
    updated as (
      update public.marketplace_items mi
      set    quantity = mi.quantity - d.total_qty
      from   deduped d
      where  mi.id = d.listing_id
        and  (mi.quantity is null or mi.quantity >= d.total_qty)
      returning
        mi.id                            as listing_id,
        d.total_qty                      as deducted_quantity,
        -- In RETURNING, mi.quantity is the NEW value; adding back gives the old.
        (mi.quantity + d.total_qty)      as previous_quantity,
        mi.quantity                      as new_quantity
    )
    select
      (select count(*)::integer from deduped),
      (select count(*)::integer from updated),
      coalesce(
        (select jsonb_agg(
          jsonb_build_object(
            'listing_id',       listing_id,
            'deducted_quantity', deducted_quantity,
            'previous_quantity', previous_quantity,
            'new_quantity',      new_quantity
          ) order by listing_id
        ) from updated),
        '[]'::jsonb
      )
    into v_total_requested, v_total_updated, v_applied_items;

    -- If the UPDATE skipped any row, a concurrent purchase beat us to the last unit.
    if v_total_updated < v_total_requested then
      raise exception 'concurrent_stock_exhausted';
    end if;

  exception when others then
    -- Savepoint restored — all partial decrements undone.
    v_failure_reason := 'One or more items sold out while your order was being processed. Please update your cart and try again.';

    insert into public.inventory_deduction_events
      (order_key, user_email, requested_items, applied_items, status, failure_reason)
    values
      (p_order_key, v_clean_email, p_items, '[]'::jsonb, 'failed', v_failure_reason)
    on conflict (order_key) do nothing;

    insert into public.inventory_audit_log
      (order_key, event_type, actor_email, details)
    values
      (p_order_key, 'deduction_failed', v_clean_email,
       jsonb_build_object('reason', v_failure_reason));

    return jsonb_build_object(
      'status', 'failed', 'idempotent', false,
      'failure_reason', v_failure_reason, 'applied_items', '[]'::jsonb
    );
  end;

  -- ── Success: persist event + audit log ─────────────────────────────────────
  insert into public.inventory_deduction_events
    (order_key, user_email, requested_items, applied_items, status, failure_reason)
  values
    (p_order_key, v_clean_email, p_items, v_applied_items, 'applied', null);

  insert into public.inventory_audit_log
    (order_key, listing_id, event_type, quantity_delta,
     previous_quantity, new_quantity, actor_email, details)
  select
    p_order_key,
    (entry->>'listing_id')::uuid,
    'deduction_applied',
    -1 * coalesce((entry->>'deducted_quantity')::integer, 0),
    coalesce((entry->>'previous_quantity')::integer, 0),
    coalesce((entry->>'new_quantity')::integer, 0),
    v_clean_email,
    entry
  from jsonb_array_elements(v_applied_items) as entry;

  return jsonb_build_object(
    'status',          'applied',
    'idempotent',      false,
    'failure_reason',  null,
    'applied_items',   v_applied_items,
    'requested_items', p_items
  );
end;
$$;
