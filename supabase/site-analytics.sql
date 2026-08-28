-- ============================================================
-- supabase/site-analytics.sql
-- Self-hosted, privacy-friendly product analytics — page views and named
-- events, stored in your own Supabase project rather than sent to a
-- third-party analytics vendor. No new account/signup needed to turn this
-- on; the Super Admin dashboard's "Site Analytics" tab reads straight from
-- this table.
--
-- What's tracked: page path, an anonymous per-browser session id (random,
-- generated client-side, stored in localStorage — see
-- src/lib/analytics.js), the signed-in user's email when available, and a
-- small metadata blob for named events (e.g. { marketKey: 'petCareSupplies' }
-- on a "listing_created" event). No IP address, device fingerprint, or
-- third party ever sees this data.
--
-- Idempotent: safe to run repeatedly.
-- Apply via: Supabase Dashboard -> SQL Editor -> paste -> Run.
-- ============================================================

create table if not exists public.analytics_events (
  id bigserial primary key,
  event_name text not null,
  page_path text,
  session_id text not null,
  user_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at);

create index if not exists analytics_events_event_name_idx
  on public.analytics_events (event_name, created_at);

create index if not exists analytics_events_session_id_idx
  on public.analytics_events (session_id);

alter table public.analytics_events enable row level security;

drop policy if exists "Public insert analytics events" on public.analytics_events;
create policy "Public insert analytics events"
on public.analytics_events
for insert
with check (true);

-- Read access is intentionally NOT public — analytics data (which pages a
-- given signed-in email visited, in what order) is sensitive in aggregate
-- even though no single row is. Only the admin_get_site_analytics()
-- function below (gated by admin_require_session(), same as every other
-- admin-only read in this project) can read it back.
drop policy if exists "No public read analytics events" on public.analytics_events;

create or replace function public.admin_get_site_analytics(
  p_token text,
  p_since timestamptz default (now() - interval '30 days')
)
returns table(
  event_name text,
  page_path text,
  session_id text,
  user_email text,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_require_session(p_token);
  return query
    select e.event_name, e.page_path, e.session_id, e.user_email, e.metadata, e.created_at
    from public.analytics_events e
    where e.created_at >= p_since
    order by e.created_at desc
    limit 20000;
end;
$$;

grant execute on function public.admin_get_site_analytics(text, timestamptz) to anon, authenticated;

create or replace function public.prune_analytics_events()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Keep a rolling 13 months so year-over-year comparisons stay possible
  -- without the table growing forever.
  delete from public.analytics_events where created_at < now() - interval '13 months';
end;
$$;

do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron extension unavailable (%): enable it via Dashboard -> Database -> Extensions, then re-run this file to schedule cleanup.', sqlerrm;
end;
$$;

do $$
begin
  perform cron.schedule('prune-analytics-events', '0 3 * * *', $cron$select public.prune_analytics_events();$cron$);
exception when others then
  raise notice 'Could not schedule prune-analytics-events (%): pg_cron may not be enabled yet.', sqlerrm;
end;
$$;
