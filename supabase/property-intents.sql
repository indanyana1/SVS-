-- ============================================================
-- supabase/property-intents.sql
-- Buyer-submitted "Reserve" / "Buy" intents against property listings.
-- Captures the buyer's contact info so the seller can follow up.
-- Idempotent: safe to run repeatedly.
-- Apply via: Supabase Dashboard -> SQL Editor -> paste -> Run.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.property_intents (
  id text primary key,

  listing_id text not null references public.property_listings (id) on delete cascade,

  -- Denormalized listing snapshot
  listing_title text,
  listing_image text,
  listing_location text,
  listing_price text,

  -- Seller scoping
  seller_email text,

  -- Buyer details
  buyer_email text,
  buyer_name text,
  buyer_phone text,

  -- 'reserve' (soft hold / interest) or 'buy' (firm purchase intent)
  intent_type text not null default 'reserve',
  message text,

  -- Lifecycle: 'new' | 'contacted' | 'accepted' | 'declined' | 'closed'
  status text not null default 'new',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_intents_seller_email_idx
  on public.property_intents (seller_email);
create index if not exists property_intents_listing_id_idx
  on public.property_intents (listing_id);
create index if not exists property_intents_buyer_email_idx
  on public.property_intents (buyer_email);
create index if not exists property_intents_created_at_idx
  on public.property_intents (created_at desc);

create or replace function public.set_property_intents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists property_intents_set_updated_at on public.property_intents;
create trigger property_intents_set_updated_at
  before update on public.property_intents
  for each row execute function public.set_property_intents_updated_at();

alter table public.property_intents enable row level security;

-- Prototype permission model: public CRUD, tighten when auth lands.
drop policy if exists "Public read property intents" on public.property_intents;
create policy "Public read property intents"
on public.property_intents for select using (true);

drop policy if exists "Public insert property intents" on public.property_intents;
create policy "Public insert property intents"
on public.property_intents for insert with check (true);

drop policy if exists "Public update property intents" on public.property_intents;
create policy "Public update property intents"
on public.property_intents for update using (true) with check (true);

drop policy if exists "Public delete property intents" on public.property_intents;
create policy "Public delete property intents"
on public.property_intents for delete using (true);
