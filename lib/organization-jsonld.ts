import { site } from '@/lib/site';

const CONTEXT = 'https://schema.org';

/**
 * Schema.org Organization + WebSite, inyectado una vez en el <head> (root
 * layout) — no por página, a diferencia de `Product` (ver product-jsonld.ts).
 *
 * Usa los valores ya existentes en `lib/site.ts`. Si más adelante estos
 * valores se vuelven editables desde Directus (colección `site_settings`),
 * solo hay que cambiar de dónde vienen `name`/`url`/`description`/`logo` —
 * esta función y su inyección en layout.tsx no cambian.
 */
export function buildOrganizationJsonLd(): Record<string, unknown> {
  const base = site.url.replace(/\/$/, '');
  return {
    '@context': CONTEXT,
    '@type': 'Organization',
    name: site.name,
    url: base,
    logo: `${base}${site.logoPath}`,
    sameAs: [site.social.facebook, site.social.instagram, site.social.tiktok],
  };
}

export function buildWebsiteJsonLd(): Record<string, unknown> {
  const base = site.url.replace(/\/$/, '');
  return {
    '@context': CONTEXT,
    '@type': 'WebSite',
    name: site.name,
    url: base,
    description: site.description,
  };
}
