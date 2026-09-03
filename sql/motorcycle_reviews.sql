-- Reseñas por moto (lectura con service role desde Next.js).
-- Rellena desde el SQL editor de Supabase o migraciones.

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

-- Ejemplo (motorcycle_id debe coincidir con `motorcycles.id`):
-- insert into public.motorcycle_reviews (motorcycle_id, author_name, rating, title, body)
-- values ('bajaj-pulsar-ns200-2025', 'Cliente verificado', 5, 'Excelente relación calidad-precio', 'Muy contento con la atención y la moto.');
