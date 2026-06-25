-- Closes two gaps left from the live-capture + admin-review work:
-- 1. The dark-photo warning shown during capture was never persisted —
--    admins reviewing a submission had no idea the seller proceeded past
--    that warning. Now stored and surfaced as a badge in the admin UI.
-- 2. Rejections had no reason captured anywhere the seller could see, and
--    no notification was ever sent — sellers only found out by trying to
--    sign in again. admin_review_seller now stores the reason on the
--    profile itself (cleared on approval / resubmission) so the existing
--    public-read policy on seller_profiles already covers exposing it back
--    to the seller, with no new policy needed.

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

-- Undoes a rejection: puts the seller back under review (not straight to
-- approved — that's still a separate, deliberate click) and removes the
-- identifiers the rejection trigger banned, so the Reports tab doesn't keep
-- showing this seller as banned once the rejection itself has been reversed.
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
