-- ============================================================
-- supabase/profile-images-storage.sql
-- Adds profile_image_url to account_users and creates the
-- public profile-images storage bucket.
-- Idempotent: safe to run repeatedly.
-- ============================================================

-- 1. Add profile image URL column to account_users.
alter table public.account_users
  add column if not exists profile_image_url text;

-- 2. Create the public bucket (idempotent).
insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do update set public = true;

-- 3. Allow anyone to read profile images (public bucket).
drop policy if exists "Public read profile images" on storage.objects;
create policy "Public read profile images"
on storage.objects
for select
using (bucket_id = 'profile-images');

-- 4. Allow uploads (anon key is used — no Supabase Auth).
drop policy if exists "Public upload profile images" on storage.objects;
create policy "Public upload profile images"
on storage.objects
for insert
with check (bucket_id = 'profile-images');

-- 5. Allow updates/replacements (upsert: true in the upload call).
drop policy if exists "Public update profile images" on storage.objects;
create policy "Public update profile images"
on storage.objects
for update
using (bucket_id = 'profile-images')
with check (bucket_id = 'profile-images');

-- 6. Allow deletion (for "Remove photo").
drop policy if exists "Public delete profile images" on storage.objects;
create policy "Public delete profile images"
on storage.objects
for delete
using (bucket_id = 'profile-images');
