/** Artículo de blog (dominio). Los valores vienen de Postgres vía `lib/blog`. */
export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  /** Nombre del autor. Campo de texto libre en Directus, sin colección/login aparte. */
  author?: string | null;
  /** Resumen corto para la tarjeta de listado y como fallback de meta description. */
  excerpt?: string | null;
  /** HTML del cuerpo del artículo (editor WYSIWYG de Directus). */
  body: string;
  /** URL pública (Supabase Storage) de la imagen de portada. */
  coverImageUrl?: string | null;
  published: boolean;
  /** Fecha en que se publicó por primera vez (columna `published_at`, la fija un trigger). */
  publishedAt?: string | null;
  /** Fecha de última edición (columna `updated_at`). Usada para `sitemap.xml` (`lastmod`). */
  updatedAt: string;
  createdAt: string;
};
