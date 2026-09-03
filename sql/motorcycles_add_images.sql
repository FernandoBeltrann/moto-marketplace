-- Ejecutar una vez en proyectos que ya tenían `motorcycles` sin columnas de imagen.
alter table public.motorcycles add column if not exists image_url text;
alter table public.motorcycles add column if not exists gallery_urls jsonb not null default '[]'::jsonb;
