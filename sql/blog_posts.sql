-- Blog module — nueva colección, sin tabla previa que proteger.
--
-- A diferencia de motorcycles (que ya existía antes de Directus y por eso
-- usa el patrón mirror table + trigger `cms_marketplace` -> `motorcycles`),
-- `blog_posts` es una tabla nueva. Directus puede apuntar directamente a
-- ella sin ningún trigger de sincronización de por medio — más simple, y es
-- el mismo patrón que ya usan `marketplace_leads` y `motorcycle_reviews`.
--
-- Después de correr esto: en Directus Studio, Settings -> Data Model ->
-- Create Collection -> "Use Existing Table" -> selecciona `blog_posts`.
-- Ver directus-blog-setup.md para la configuración de campos.

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  author text,
  excerpt text,
  body text not null,
  -- Igual que motorcycles: `cover_image_file` guarda la relación de Directus
  -- (uuid de directus_files); `cover_image_url` es la URL pública de la
  -- misma imagen en Supabase Storage, que es lo único que lee el sitio
  -- (ver lib/blog.ts). Ver directus-blog-setup.md para cómo se sincronizan
  -- (mismo patrón de Flow que directus-images-setup.md, adaptado aquí).
  cover_image_file uuid,
  cover_image_url text,
  published boolean not null default false,
  -- Se fija automáticamente (una sola vez) la primera vez que `published`
  -- pasa a true — ver el trigger más abajo. No se pisa si luego se
  -- despublica y se vuelve a publicar.
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_blog_posts_slug on public.blog_posts (slug);
create index if not exists idx_blog_posts_published on public.blog_posts (published, published_at desc);

-- Mismo patrón de RLS que motorcycles/motorcycle_reviews: RLS activado, sin
-- policy pública — el sitio lee con SUPABASE_SERVICE_ROLE_KEY desde el
-- servidor (ver lib/supabase/server.ts), que no pasa por RLS.
alter table public.blog_posts enable row level security;

create or replace function public.blog_posts_set_timestamps()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if new.published = true and (TG_OP = 'INSERT' or OLD.published = false) then
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_blog_posts_set_timestamps on public.blog_posts;
create trigger trg_blog_posts_set_timestamps
  before insert or update on public.blog_posts
  for each row
  execute function public.blog_posts_set_timestamps();
