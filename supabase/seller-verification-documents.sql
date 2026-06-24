-- Identity verification documents for seller onboarding: an uploaded
-- ID/passport scan plus a live-captured selfie (never a file upload, so a
-- pre-existing or doctored photo can't be substituted). Used to gate
-- `hasCompleteSellerProfile` so sellers must complete identity checks
-- before they get seller dashboard access.

alter table public.seller_profiles
  add column if not exists id_document_path text,
  add column if not exists id_document_type text check (id_document_type in ('national_id', 'passport')),
  add column if not exists selfie_path text,
  add column if not exists selfie_captured_at timestamptz;

-- Private bucket: no public-read policy is added below, so files are not
-- reachable via a public URL. Reads still go through the anon key (this
-- prototype has no real Supabase Auth / auth.uid() anywhere), so treat this
-- as "not publicly discoverable" rather than "access-controlled" — wiring
-- up real per-row access control would require adding Supabase Auth.
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
