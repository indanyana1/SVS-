-- Adds an append-only timeline of status transitions for each order.
-- Each entry is an object: { "status": "In Transit", "at": "2026-05-08T01:28:00Z", "location": "..." }

alter table public.orders
  add column if not exists status_history jsonb not null default '[]'::jsonb;

create index if not exists orders_status_history_gin_idx
  on public.orders using gin (status_history);
