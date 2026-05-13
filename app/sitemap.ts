import type { MetadataRoute } from 'next';
import { getMotorcycles, productPath } from '@/lib/catalog';
import { site } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = [
    { url: site.url, lastModified: new Date() },
    { url: `${site.url}/motos`, lastModified: new Date() },
    { url: `${site.url}/motos-a-credito`, lastModified: new Date() },
    { url: `${site.url}/envio-garantia`, lastModified: new Date() },
  ];
  const list = await getMotorcycles();
  const products = list.map((m) => ({ url: `${site.url}${productPath(m)}`, lastModified: new Date() }));
  return [...base, ...products];
}
