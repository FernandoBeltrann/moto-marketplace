/**
 * Mapa auxiliar de la estructura del sitio para que Marketing ubique DÓNDE
 * quiere cambiar algo: editar una página del CMS existente, o crear una
 * subpágina bajo una sección. Marca qué es editable aquí y qué vive en código
 * o Directus (honesto con los límites del stack, ver memo).
 */
import { listPages } from '@/lib/cms/pages';

export type SiteNode = {
  id: string;
  label: string;
  href?: string;
  /** 'cms' editable en el builder; 'code' gestionado por ingeniería/Directus; 'section' agrupador. */
  managed: 'cms' | 'code' | 'section';
  /** Si es una página CMS, su slug para abrirla. */
  cmsSlug?: string;
  /** Si permite crear una subpágina CMS bajo esta sección. */
  canCreateChild?: boolean;
  /** Prefijo de slug sugerido al crear subpágina. */
  childSlugPrefix?: string;
  children?: SiteNode[];
};

export async function getSiteMap(): Promise<SiteNode[]> {
  const pages = await listPages().catch(() => []);
  const cmsChildren: SiteNode[] = pages.map((p) => ({
    id: `cms:${p.slug}`, label: `${p.title} (${p.status})`, href: `/p/${p.slug}`, managed: 'cms', cmsSlug: p.slug,
  }));

  return [
    { id: 'home', label: 'Inicio', href: '/', managed: 'code' },
    {
      id: 'motos', label: 'Motos', href: '/motos', managed: 'code', canCreateChild: true, childSlugPrefix: 'motos-',
      children: [
        { id: 'motos-catalogo', label: 'Catálogo (fichas de moto)', href: '/motos/[brand]/[slug]', managed: 'code' },
        { id: 'motos-credito', label: 'Motos a crédito', href: '/motos-a-credito', managed: 'code' },
      ],
    },
    {
      id: 'blog', label: 'Blog', href: '/blog', managed: 'code', canCreateChild: true, childSlugPrefix: 'blog-',
      children: [{ id: 'blog-posts', label: 'Artículos (Directus)', href: '/blog/[slug]', managed: 'code' }],
    },
    {
      id: 'legal', label: 'Legal', managed: 'section',
      children: [
        { id: 'aviso', label: 'Aviso de privacidad', href: '/aviso-de-privacidad', managed: 'code' },
        { id: 'envio', label: 'Envío y garantía', href: '/envio-garantia', managed: 'code' },
      ],
    },
    {
      id: 'cms', label: 'Páginas del CMS', href: '/p', managed: 'section', canCreateChild: true, childSlugPrefix: '',
      children: cmsChildren,
    },
  ];
}
