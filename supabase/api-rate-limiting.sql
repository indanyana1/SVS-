-- ============================================================
-- supabase/api-rate-limiting.sql
-- Backend-enforced rate limiting for the Vercel serverless functions in
-- api/*.js.
--
-- Why this exists: server-utils/rate-limit.js already rate-limits
-- server.js (the local-dev/Express mirror) using an in-memory Map, but
-- that only works within a single long-lived process. The real production
-- surface is api/*.js on Vercel, where each invocation can land on a
-- different, short-lived instance — an in-memory counter resets constantly
-- and provides no real protection there. This table is the shared counter
-- every invocation reads/writes instead, so the limit is enforced across
-- the whole deployment, not per-instance.
--
-- api_rate_limit_hits: one row per request that passed the check. Counting
-- rows in the trailing window is the "sliding window log" strategy — exact
-- (no fixed-window boundary burst issue) and simple. Row volume stays
-- bounded by the periodic cleanup job at the bottom.
--
-- check_and_record_rate_limit(): atomically counts hits in the window and,
-- if under the limit, records this one — see api/_rate-limit.js for the
-- caller. Like every other counter in this project (inventory deduction,
-- seller-fee promo ranking), a small race under heavy concurrent load can
-- let a few extra requests through around the boundary; that's an
-- acceptable tradeoff for a rate limiter (unlike inventory/money, being
-- off by a couple of requests has no real consequence) and avoids a much
-- heavier locking scheme.
--
-- Idempotent: safe to run repeatedly.
-- Apply via: Supabase Dashboard -> SQL Editor -> paste -> Run.
-- ============================================================

create table if not exists public.api_rate_limit_hits (
  id bigserial primary key,
  bucket_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists api_rate_limit_hits_bucket_created_idx
  on public.api_rate_limit_hits (bucket_key, created_at);

alter table public.api_rate_limit_hits enable row level security;

drop policy if exists "Public read rate limit hits" on public.api_rate_limit_hits;
create policy "Public read rate limit hits"
on public.api_rate_limit_hits
for select
using (true);

drop policy if exists "Public insert rate limit hits" on public.api_rate_limit_hits;
create policy "Public insert rate limit hits"
on public.api_rate_limit_hits
for insert
with check (true);

drop policy if exists "Public delete rate limit hits" on public.api_rate_limit_hits;
create policy "Public delete rate limit hits"
on public.api_rate_limit_hits
for delete
using (true);

create or replace function public.check_and_record_rate_limit(
  p_bucket_key text,
  p_window_seconds int,
  p_max int
)
returns table(allowed boolean, current_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz := now() - make_interval(secs => p_window_seconds);
  v_count int;
begin
  select count(*) into v_count
  from public.api_rate_limit_hits
  where bucket_key = p_bucket_key and created_at >= v_window_start;

  if v_count >= p_max then
    return query select false, v_count;
    return;
  end if;

  insert into public.api_rate_limit_hits (bucket_key) values (p_bucket_key);
  return query select true, v_count + 1;
end;
$$;

grant execute on function public.check_and_record_rate_limit(text, int, int) to anon, authenticated;

create or replace function public.prune_rate_limit_hits()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.api_rate_limit_hits where created_at < now() - interval '1 hour';
end;
$$;

-- Best-effort: enable pg_cron and schedule hourly cleanup. Wrapped so a
-- missing/unavailable extension on this Supabase plan doesn't abort the
-- rest of this script — you'll see a NOTICE instead, and the table/function
-- above are fully usable either way (rows just accumulate a bit longer
-- until you run `select public.prune_rate_limit_hits();` manually, or
-- enable pg_cron and re-run this file).
do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron extension unavailable (%): enable it via Dashboard -> Database -> Extensions, then re-run this file to schedule cleanup.', sqlerrm;
end;
$$;

do $$
begin
  perform cron.schedule('prune-rate-limit-hits', '0 * * * *', $cron$select public.prune_rate_limit_hits();$cron$);
exception when others then
  raise notice 'Could not schedule prune-rate-limit-hits (%): pg_cron may not be enabled yet.', sqlerrm;
end;
$$;
