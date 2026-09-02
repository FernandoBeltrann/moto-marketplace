-- Añade "binding" a cms_pages: qué página REAL del marketplace controla
-- cada fila (o ninguna, si es standalone), y una url_path configurable en
-- vez de forzar todo bajo /p/[slug].
--
-- binding_key es la llave estable para buscar el override publicado desde
-- la página real (ver lib/cms/overrides.ts):
--   moto:<motorcycleId> | blog:<blogPostId> | static:home | static:motos |
--   static:motos-a-credito | static:aviso-de-privacidad | static:envio-garantia
-- null = standalone (vive donde diga url_path, antes forzado a /p/{slug}).

alter table public.cms_pages
  add column if not exists binding_kind text not null default 'standalone'
    check (binding_kind in ('standalone', 'moto', 'blog', 'static')),
  add column if not exists binding_key text,
  add column if not exists url_path text;

-- Backfill: páginas existentes eran todas standalone en /p/{slug}.
update public.cms_pages set url_path = '/p/' || slug where url_path is null;

alter table public.cms_pages alter column url_path set not null;

-- Una sola página CMS puede controlar cada binding real (no duplicados).
create unique index if not exists cms_pages_binding_key_uidx
  on public.cms_pages (binding_key) where binding_key is not null;

-- Cada url_path debe ser único (evita que dos páginas standalone choquen).
create unique index if not exists cms_pages_url_path_uidx on public.cms_pages (url_path);
