-- Soporte para administrar fotos desde Directus.
--
-- IMPORTANTE: Directus edita `directus_system.cms_marketplace`, no
-- `public.motorcycles` directamente (ver trigger `trg_sync_cms_marketplace`
-- + función `sync_cms_to_marketplace()`, que hace upsert de cada fila de
-- cms_marketplace hacia motorcycles, incluyendo image_url/gallery_urls, en
-- cada INSERT/UPDATE, y marca published=false en motorcycles en DELETE).
-- Por eso esta columna va en cms_marketplace: es ahí donde vive el campo
-- "Image" de Directus, y basta con que el flow escriba image_url en
-- cms_marketplace para que el trigger existente la propague solo hacia
-- motorcycles. No hace falta tocar public.motorcycles en absoluto.
--
-- No se agrega FK a directus_files a propósito: esa tabla vive en el schema
-- que use tu instalación de Directus (normalmente `public`), y Directus
-- gestiona esa relación por su cuenta desde el campo "Image" en Data Model.
-- Si quieres el constraint de integridad referencial más adelante:
--   alter table directus_system.cms_marketplace
--     add constraint fk_cms_marketplace_cover_image_file
--     foreign key (cover_image_file) references public.directus_files (id);

alter table directus_system.cms_marketplace add column if not exists cover_image_file uuid;

comment on column directus_system.cms_marketplace.cover_image_file is
  'ID del archivo en Directus (directus_files.id) para la foto de portada. Se sube/reemplaza desde el campo "Image" en Directus Studio. El trigger trg_sync_cms_marketplace propaga la image_url resultante hacia public.motorcycles automáticamente.';

-- La galería NO se migra aquí: al agregar un campo tipo "Files (M2M)" en
-- Directus Studio (Settings -> Data Model -> cms_marketplace -> Create
-- Field), Directus ofrece crear automáticamente la tabla de unión (ej.
-- `cms_marketplace_files`). Es más limpio dejar que Directus la genere que
-- intentar precrearla a mano aquí.
