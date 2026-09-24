/**
 * Enlaces pre-hechos para el módulo Botón: rutas reales del sitio, motos, blog,
 * páginas del CMS publicadas y WhatsApp. Marketing elige a dónde apunta el
 * botón sin escribir la URL a mano.
 */
import { getMotorcycles, productPath } from '@/lib/catalog';
import { getBlogPosts, blogPostPath } from '@/lib/blog';
import { getPublishedSlugs } from '@/lib/cms/pages';
import { site } from '@/lib/site';

export type SiteLink = { label: string; href: string; group: string };

export async function getSiteLinks(): Promise<SiteLink[]> {
  const links: SiteLink[] = [
    { label: 'Inicio', href: '/', group: 'Sitio' },
    { label: 'Catálogo de motos', href: '/motos', group: 'Sitio' },
    { label: 'Motos a crédito', href: '/motos-a-credito', group: 'Sitio' },
    { label: 'Blog', href: '/blog', group: 'Sitio' },
    { label: 'Aviso de privacidad', href: '/aviso-de-privacidad', group: 'Legal' },
    { label: 'Envío y garantía', href: '/envio-garantia', group: 'Legal' },
    { label: 'WhatsApp', href: `https://wa.me/${site.whatsapp}`, group: 'Contacto' },
  ];
  try {
    for (const m of (await getMotorcycles()).slice(0, 30)) {
      links.push({ label: `${m.brand} ${m.model} ${m.year}`, href: productPath(m), group: 'Motos' });
    }
  } catch { /* ignore */ }
  try {
    for (const p of await getBlogPosts()) links.push({ label: p.title, href: blogPostPath(p), group: 'Blog' });
  } catch { /* ignore */ }
  try {
    for (const slug of await getPublishedSlugs()) links.push({ label: `/p/${slug}`, href: `/p/${slug}`, group: 'Páginas CMS' });
  } catch { /* ignore */ }
  return links;
}
