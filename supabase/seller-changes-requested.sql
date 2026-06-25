-- Lets an admin ask a seller to fix specific things without rejecting them
-- outright. Rejecting bans the seller's identifiers and reads as final;
-- this is the "almost there, just fix X" path. compliance_status gets a
-- new value ('changes_requested') rather than overloading 'rejected', so
-- the existing ban trigger (which only fires on a transition to
-- 'rejected') is never touched by this flow.
--
-- fields_to_edit stores section keys (not individual field names) so the
-- admin picks from ~4 logical groups instead of 20+ checkboxes:
--   business_identity | identity_verification | contact_address | payout_returns
-- A special value 'all' means the whole profile needs another pass.

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

-- Approving/rejecting after a changes-requested round should clear the
-- stale message/field flags so they don't linger into the next state.
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
