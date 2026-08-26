-- ============================================================
-- supabase/seller-terms-acceptance.sql
-- Records that a seller actually agreed to the Seller Terms &
-- Conditions (src/pages/LegalPages.jsx -> SellerTermsPage) before their
-- onboarding application was submitted — a simple, auditable proof of
-- consent rather than just a client-side checkbox nobody can verify later.
-- Idempotent: safe to run repeatedly.
-- Apply via: Supabase Dashboard -> SQL Editor -> paste -> Run.
-- ============================================================

alter table public.seller_profiles
  add column if not exists terms_accepted_at timestamptz;
