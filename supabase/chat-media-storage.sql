-- Chat media storage bucket for the "Let's Talk Business" chat.
--
-- Large chat attachments (photos, voice notes, videos, documents) are uploaded
-- here and only their short public URL is stored in support_chat_messages.body.
-- This replaces the old behaviour of base64-encoding files into the message
-- body, which failed for anything but tiny files.
--
-- Run this once in the Supabase SQL editor (or via `apply-all.sql`).

-- 1. Create the public bucket (idempotent).
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do update set public = true;

-- 2. Allow signed-in users to upload into the bucket.
drop policy if exists "chat-media authenticated upload" on storage.objects;
create policy "chat-media authenticated upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-media');

-- 3. Allow anyone to read objects (public bucket, so chat media renders for
--    both participants without signed URLs).
drop policy if exists "chat-media public read" on storage.objects;
create policy "chat-media public read"
  on storage.objects for select to public
  using (bucket_id = 'chat-media');

-- 4. Allow uploaders to update / delete their own objects.
drop policy if exists "chat-media owner update" on storage.objects;
create policy "chat-media owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'chat-media' and owner = auth.uid());

drop policy if exists "chat-media owner delete" on storage.objects;
create policy "chat-media owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'chat-media' and owner = auth.uid());
