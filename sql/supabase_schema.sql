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

-- Catálogo de motos (lectura desde el servidor con service role; sin policies públicas).
create table if not exists public.motorcycles (
  id text primary key,
  brand text not null,
  model text not null,
  year integer not null,
  slug text not null,
  price integer not null,
  promo_price integer,
  category text not null,
  engine_cc integer not null,
  monthly_from integer not null,
  suggested_down_payment integer not null,
  short_description text not null,
  priority_score integer not null,
  available_cities jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  best_for jsonb not null default '[]'::jsonb,
  specs jsonb not null default '{}'::jsonb,
  image_url text,
  gallery_urls jsonb not null default '[]'::jsonb,
  purchase_url text,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_motorcycles_slug on public.motorcycles (slug);
create index if not exists idx_motorcycles_published on public.motorcycles (published);
create index if not exists idx_motorcycles_priority_score on public.motorcycles (priority_score desc);

alter table public.motorcycles enable row level security;

create or replace function public.motorcycles_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_motorcycles_set_updated_at on public.motorcycles;
create trigger tr_motorcycles_set_updated_at
  before update on public.motorcycles
  for each row
  execute function public.motorcycles_set_updated_at();

-- Reseñas por moto (detalle en sql/motorcycle_reviews.sql).
create table if not exists public.motorcycle_reviews (
  id uuid primary key default gen_random_uuid(),
  motorcycle_id text not null references public.motorcycles (id) on delete cascade,
  author_name text not null,
  rating smallint not null check (rating >= 1 and rating <= 5),
  title text,
  body text not null,
  published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_motorcycle_reviews_moto_published
  on public.motorcycle_reviews (motorcycle_id, published, published_at desc);

alter table public.motorcycle_reviews enable row level security;
