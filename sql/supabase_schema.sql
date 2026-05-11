create table if not exists public.marketplace_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text,
  lead_destination text,
  name text,
  phone text,
  city text,
  purchase_timing text,
  "motorcycleId" text,
  "motorcycleName" text,
  path text,
  utm jsonb,
  user_agent text,
  ip text
);

alter table public.marketplace_leads enable row level security;

-- El insert se hace con SUPABASE_SERVICE_ROLE_KEY desde API route, por eso no necesitas policy pública.
