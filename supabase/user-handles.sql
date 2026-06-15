-- ============================================================
-- Per-user shareable handles
-- ------------------------------------------------------------
-- Adds a public, URL-friendly `user_handle` to `account_users`
-- so every registered person gets a profile link they can share
-- (e.g. https://svs-ecommerce.com/u/jane-doe-4f2a).  Anyone who
-- opens that link can start a 1-to-1 chat with the owner.
--
-- Run once against your Supabase project (idempotent).
-- ============================================================

alter table public.account_users
  add column if not exists user_handle text;

-- Case-insensitive uniqueness without forcing lowercase storage.
create unique index if not exists account_users_user_handle_unique
  on public.account_users (lower(user_handle))
  where user_handle is not null;

-- Fast lookup for the /u/:handle route.
create index if not exists account_users_user_handle_idx
  on public.account_users (user_handle);
