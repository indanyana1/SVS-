-- ============================================================
-- supabase/booking-automation.sql
-- Background housekeeping for general_labour_bookings / home_care_bookings:
--   1. Auto-expire stale "requested" bookings nobody ever responded to.
--   2. Send a reminder notification (in-app always; email best-effort —
--      see the bottom of this file) the day before a confirmed booking.
--
-- This file is intentionally NOT appended into apply-all.sql: the
-- `create extension pg_cron` / `cron.schedule` calls below depend on a
-- Supabase project feature that isn't available on every plan, and
-- apply-all.sql runs as one big script where an error aborts everything
-- else in it. Run this one separately; the create-extension and
-- cron.schedule calls are wrapped so a missing pg_cron degrades to a
-- notice instead of failing the script — schema/functions are still
-- created either way and can be called manually from the SQL editor if
-- pg_cron isn't available on your plan (Dashboard -> Database ->
-- Extensions to check/enable it, then re-run this file).
-- Idempotent: safe to run repeatedly.
-- Apply via: Supabase Dashboard -> SQL Editor -> paste -> Run.
-- ============================================================

create or replace function public.expire_stale_bookings()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.general_labour_bookings
  set status = 'expired'
  where status = 'requested' and created_at < now() - interval '7 days';

  update public.home_care_bookings
  set status = 'expired'
  where status = 'requested' and created_at < now() - interval '7 days';
end;
$$;

-- Fires one EmailJS send via pg_net (async, fire-and-forget — we don't wait
-- for or check the HTTP response). Mirrors the exact request shape
-- src/lib/notificationEmail.js sends from the browser, so it works with the
-- same EmailJS account/template with zero extra setup beyond pg_net.
-- A no-op when any of the EmailJS args is null, so callers can pass them
-- straight through from optional function parameters.
create or replace function public._send_emailjs_email(
  p_service_id text,
  p_template_id text,
  p_public_key text,
  p_to_email text,
  p_to_name text,
  p_title text,
  p_message text,
  p_link text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_service_id is null or p_template_id is null or p_public_key is null or coalesce(p_to_email, '') = '' then
    return;
  end if;

  perform net.http_post(
    url := 'https://api.emailjs.com/api/v1.0/email/send',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'service_id', p_service_id,
      'template_id', p_template_id,
      'user_id', p_public_key,
      'template_params', jsonb_build_object(
        'to_email', p_to_email,
        'user_email', p_to_email,
        'email', p_to_email,
        'recipient', p_to_email,
        'reply_to', p_to_email,
        'to_name', coalesce(p_to_name, 'there'),
        'user_name', coalesce(p_to_name, 'there'),
        'name', coalesce(p_to_name, 'there'),
        'notification_title', p_title,
        'notification_message', p_message,
        'action_url', p_link,
        'reset_link', p_link,
        'link', p_link,
        'role_label', p_title
      )
    )
  );
exception when others then
  -- Best-effort: a pg_net hiccup must never fail the reminder job itself
  -- (the in-app notification has already been written by that point).
  raise notice '_send_emailjs_email failed for %: %', p_to_email, sqlerrm;
end;
$$;

-- Reminder notifications for bookings happening tomorrow. notification_key
-- is deterministic so re-running this (or the cron job firing twice) never
-- inserts a duplicate — relies on the existing
-- unique(user_email, notification_key) constraint on public.notifications.
--
-- The four p_emailjs_*/p_app_origin parameters are optional and default to
-- null, in which case email sending is skipped entirely (in-app
-- notifications still happen exactly as before) — see the cron.schedule
-- block at the bottom of this file for how to opt in.
create or replace function public.send_booking_reminders(
  p_emailjs_service_id text default null,
  p_emailjs_template_id text default null,
  p_emailjs_public_key text default null,
  p_app_origin text default null
)
returns void
language plpgsql
security definer
set search_path = public, net
as $$
declare
  v_tomorrow text := (current_date + 1)::text;
  r record;
begin
  insert into public.notifications (user_email, notification_key, type, title, message, href)
  select
    b.buyer_email,
    concat('booking-reminder-', b.id, '-buyer'),
    'info',
    'Booking reminder',
    concat('Reminder: your booking with ', coalesce(b.worker_name, 'the worker'), ' is scheduled for ', b.booking_date, case when coalesce(b.booking_time, '') <> '' then concat(' at ', b.booking_time) else '' end, '.'),
    concat('/bookings/generalLabour/', b.id, '/track')
  from public.general_labour_bookings b
  where b.status = 'confirmed' and b.booking_date = v_tomorrow and coalesce(b.buyer_email, '') <> ''
  on conflict (user_email, notification_key) do nothing;

  insert into public.notifications (user_email, notification_key, type, title, message, href)
  select
    b.seller_email,
    concat('booking-reminder-', b.id, '-seller'),
    'info',
    'Booking reminder',
    concat('Reminder: you have a booking with ', coalesce(b.buyer_name, 'a buyer'), ' scheduled for ', b.booking_date, case when coalesce(b.booking_time, '') <> '' then concat(' at ', b.booking_time) else '' end, '.'),
    '/general-labour-market/sell'
  from public.general_labour_bookings b
  where b.status = 'confirmed' and b.booking_date = v_tomorrow and coalesce(b.seller_email, '') <> ''
  on conflict (user_email, notification_key) do nothing;

  insert into public.notifications (user_email, notification_key, type, title, message, href)
  select
    b.buyer_email,
    concat('booking-reminder-', b.id, '-buyer'),
    'info',
    'Booking reminder',
    concat('Reminder: your booking with ', coalesce(b.provider_name, 'the provider'), ' is scheduled for ', b.booking_date, case when coalesce(b.booking_time, '') <> '' then concat(' at ', b.booking_time) else '' end, '.'),
    concat('/bookings/homeCare/', b.id, '/track')
  from public.home_care_bookings b
  where b.status = 'confirmed' and b.booking_date = v_tomorrow and coalesce(b.buyer_email, '') <> ''
  on conflict (user_email, notification_key) do nothing;

  insert into public.notifications (user_email, notification_key, type, title, message, href)
  select
    b.seller_email,
    concat('booking-reminder-', b.id, '-seller'),
    'info',
    'Booking reminder',
    concat('Reminder: you have a booking with ', coalesce(b.buyer_name, 'a buyer'), ' scheduled for ', b.booking_date, case when coalesce(b.booking_time, '') <> '' then concat(' at ', b.booking_time) else '' end, '.'),
    '/home-care/sell'
  from public.home_care_bookings b
  where b.status = 'confirmed' and b.booking_date = v_tomorrow and coalesce(b.seller_email, '') <> ''
  on conflict (user_email, notification_key) do nothing;

  -- Email copies of the four reminder sets above. No-ops per-row when the
  -- EmailJS args are null (see _send_emailjs_email), so this is always
  -- safe to leave in even if you never opt into email reminders.
  for r in
    select * from public.general_labour_bookings b
    where b.status = 'confirmed' and b.booking_date = v_tomorrow and coalesce(b.buyer_email, '') <> ''
  loop
    perform public._send_emailjs_email(
      p_emailjs_service_id, p_emailjs_template_id, p_emailjs_public_key,
      r.buyer_email, r.buyer_name, 'Booking reminder',
      concat('Reminder: your booking with ', coalesce(r.worker_name, 'the worker'), ' is scheduled for ', r.booking_date, case when coalesce(r.booking_time, '') <> '' then concat(' at ', r.booking_time) else '' end, '.'),
      concat(coalesce(p_app_origin, ''), '/bookings/generalLabour/', r.id, '/track')
    );
  end loop;

  for r in
    select * from public.general_labour_bookings b
    where b.status = 'confirmed' and b.booking_date = v_tomorrow and coalesce(b.seller_email, '') <> ''
  loop
    perform public._send_emailjs_email(
      p_emailjs_service_id, p_emailjs_template_id, p_emailjs_public_key,
      r.seller_email, null, 'Booking reminder',
      concat('Reminder: you have a booking with ', coalesce(r.buyer_name, 'a buyer'), ' scheduled for ', r.booking_date, case when coalesce(r.booking_time, '') <> '' then concat(' at ', r.booking_time) else '' end, '.'),
      concat(coalesce(p_app_origin, ''), '/general-labour-market/sell')
    );
  end loop;

  for r in
    select * from public.home_care_bookings b
    where b.status = 'confirmed' and b.booking_date = v_tomorrow and coalesce(b.buyer_email, '') <> ''
  loop
    perform public._send_emailjs_email(
      p_emailjs_service_id, p_emailjs_template_id, p_emailjs_public_key,
      r.buyer_email, r.buyer_name, 'Booking reminder',
      concat('Reminder: your booking with ', coalesce(r.provider_name, 'the provider'), ' is scheduled for ', r.booking_date, case when coalesce(r.booking_time, '') <> '' then concat(' at ', r.booking_time) else '' end, '.'),
      concat(coalesce(p_app_origin, ''), '/bookings/homeCare/', r.id, '/track')
    );
  end loop;

  for r in
    select * from public.home_care_bookings b
    where b.status = 'confirmed' and b.booking_date = v_tomorrow and coalesce(b.seller_email, '') <> ''
  loop
    perform public._send_emailjs_email(
      p_emailjs_service_id, p_emailjs_template_id, p_emailjs_public_key,
      r.seller_email, null, 'Booking reminder',
      concat('Reminder: you have a booking with ', coalesce(r.buyer_name, 'a buyer'), ' scheduled for ', r.booking_date, case when coalesce(r.booking_time, '') <> '' then concat(' at ', r.booking_time) else '' end, '.'),
      concat(coalesce(p_app_origin, ''), '/home-care/sell')
    );
  end loop;
end;
$$;

-- Best-effort: enable pg_cron and schedule the two jobs daily. Wrapped so a
-- missing/unavailable extension on this Supabase plan doesn't abort the
-- whole script — you'll see a NOTICE instead, and the functions above are
-- still usable manually (e.g. `select public.expire_stale_bookings();`)
-- from the SQL editor in the meantime.
do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron extension unavailable (%): enable it via Dashboard -> Database -> Extensions, then re-run this file to schedule the jobs.', sqlerrm;
end;
$$;

do $$
begin
  perform cron.schedule('expire-stale-bookings', '0 2 * * *', $cron$select public.expire_stale_bookings();$cron$);
exception when others then
  raise notice 'Could not schedule expire-stale-bookings (%): pg_cron may not be enabled yet.', sqlerrm;
end;
$$;

do $$
begin
  perform cron.schedule('send-booking-reminders', '0 8 * * *', $cron$select public.send_booking_reminders();$cron$);
exception when others then
  raise notice 'Could not schedule send-booking-reminders (%): pg_cron may not be enabled yet.', sqlerrm;
end;
$$;

-- ============================================================
-- OPTIONAL: email the day-before reminder, not just the in-app one.
--
-- Uncomment the two blocks below, fill in your real EmailJS values (the
-- same service id / public key already in your .env — see
-- REACT_APP_EMAILJS_SERVICE_ID / REACT_APP_EMAILJS_PUBLIC_KEY — plus a
-- template id; REACT_APP_EMAILJS_NOTIFICATION_TEMPLATE_ID if you made a
-- dedicated one, otherwise REACT_APP_EMAILJS_TEMPLATE_ID), and your
-- deployed site's origin (no trailing slash). Then run just these two
-- blocks again — `cron.schedule` re-running with the same job name
-- ('send-booking-reminders') updates the existing job in place rather than
-- duplicating it, so this safely replaces the no-email version scheduled
-- above.
--
-- pg_net is wrapped the same way pg_cron is above: if it's not available
-- on your plan you'll get a NOTICE instead of an aborted script. Email
-- sending is genuinely best-effort here — there's no way to verify
-- delivery from this side, so check your EmailJS dashboard's activity log
-- after the first run (08:00 server time) to confirm it actually fired.
-- ============================================================

-- do $$
-- begin
--   create extension if not exists pg_net;
-- exception when others then
--   raise notice 'pg_net extension unavailable (%): enable it via Dashboard -> Database -> Extensions.', sqlerrm;
-- end;
-- $$;

-- do $$
-- begin
--   perform cron.schedule(
--     'send-booking-reminders',
--     '0 8 * * *',
--     $cron$select public.send_booking_reminders(
--       'REPLACE_WITH_EMAILJS_SERVICE_ID',
--       'REPLACE_WITH_EMAILJS_TEMPLATE_ID',
--       'REPLACE_WITH_EMAILJS_PUBLIC_KEY',
--       'https://REPLACE-WITH-YOUR-DEPLOYED-DOMAIN.example.com'
--     );$cron$
--   );
-- exception when others then
--   raise notice 'Could not schedule send-booking-reminders (%): pg_cron may not be enabled yet.', sqlerrm;
-- end;
-- $$;
