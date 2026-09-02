import type { MetadataRoute } from 'next';
import { getMotorcycles, productPath } from '@/lib/catalog';
import { getBlogPosts, blogPostPath, blogPostDate } from '@/lib/blog';
import { getPublishedSitemapEntries } from '@/lib/cms/pages';
import { site } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = [
    { url: site.url, lastModified: new Date() },
    { url: `${site.url}/motos`, lastModified: new Date() },
    { url: `${site.url}/motos-a-credito`, lastModified: new Date() },
    { url: `${site.url}/envio-garantia`, lastModified: new Date() },
    { url: `${site.url}/aviso-de-privacidad`, lastModified: new Date() },
    { url: `${site.url}/blog`, lastModified: new Date() },
  ];
  const list = await getMotorcycles();
  const products = list.map((m) => ({
    url: `${site.url}${productPath(m)}`,
    // Usa la fecha real de edición (`updated_at`, mantenida por el trigger de
    // sync de Directus) en vez de la hora del build — así Google ve cuándo
    // hay contenido realmente fresco.
    lastModified: m.updatedAt ? new Date(m.updatedAt) : new Date(),
  }));
  const posts = await getBlogPosts();
  const blogEntries = posts.map((p) => ({
    url: `${site.url}${blogPostPath(p)}`,
    lastModified: new Date(blogPostDate(p)),
  }));
  const cms = await getPublishedSitemapEntries();
  const cmsEntries = cms.map((c) => ({
    url: `${site.url}${c.urlPath}`,
    lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
  }));
  return [...base, ...products, ...blogEntries, ...cmsEntries];
}
