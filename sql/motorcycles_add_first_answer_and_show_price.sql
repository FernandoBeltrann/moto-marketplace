-- "First Answer" (AEO) + toggle de visibilidad de precio, editables desde Directus.
--
-- Igual que cover_image_file/gallery: la columna va en directus_system.cms_marketplace
-- (ahí es donde Directus edita), y el trigger trg_sync_cms_marketplace la propaga a
-- public.motorcycles (que es lo que lee el sitio via lib/catalog.ts).
--
-- IMPORTANTE — a diferencia de cover_image_file, este paso NO es suficiente por sí
-- solo. `sync_cms_to_marketplace()` hace upsert listando explícitamente las columnas
-- que reenvía a motorcycles; si first_answer/show_price no están en esa lista, Directus
-- las guardará en cms_marketplace pero NUNCA llegarán a motorcycles ni al sitio.
--
-- Antes de usar este archivo:
--   1) Ejecuta esto en el SQL editor de Supabase y comparte el resultado:
--        select pg_get_functiondef('public.sync_cms_to_marketplace()'::regprocedure)  -- vive en public, no directus_system;
--   2) Con eso, te doy el CREATE OR REPLACE FUNCTION exacto que agrega
--      first_answer/show_price a la lista de columnas (INSERT ... y el
--      ON CONFLICT (id) DO UPDATE SET ...) sin tocar el resto de la función.
--
-- Este archivo solo agrega las columnas; el paso 2 (arriba) es obligatorio para que
-- realmente lleguen a motorcycles.

alter table directus_system.cms_marketplace add column if not exists first_answer text;
alter table directus_system.cms_marketplace add column if not exists show_price boolean not null default false;

comment on column directus_system.cms_marketplace.first_answer is
  'Respuesta corta y directa (AEO/"First Answer") mostrada en la ficha de producto. Editable desde Directus. Vacía = no se muestra nada (sin cambio visual).';
comment on column directus_system.cms_marketplace.show_price is
  'Si el bloque de precio (precio de contado, mensualidad, enganche) se muestra en la ficha de producto. Default false = mismo comportamiento que hoy (precio oculto). Cambiar a true por producto cuando el negocio confirme que puede mostrarse.';

-- Necesarias también en motorcycles, porque ahí es donde el sitio realmente lee:
alter table public.motorcycles add column if not exists first_answer text;
alter table public.motorcycles add column if not exists show_price boolean not null default false;
