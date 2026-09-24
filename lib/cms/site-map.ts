/**
 * Mapa del sitio INTERACTIVO: todas las páginas reales que el CMS puede
 * controlar (lib/cms/bindings.ts) más las páginas standalone creadas en el
 * Studio, cada una con su estado real (sin tocar / borrador / publicada) —
 * para que Marketing vea de un vistazo qué ya está editado y pueda entrar a
 * editar cualquier página real con un click, sin pasar primero por
 * "Importar existente".
 */
import { listPages } from '@/lib/cms/pages';
import { getBindablePages, type BindablePage } from '@/lib/cms/bindings';
import type { CmsPage } from '@/types/cms';

export type SiteNodeStatus = 'none' | 'draft' | 'published';

export type SiteNode = {
  id: string;
  label: string;
  href?: string;
  kind: 'section' | 'bindable' | 'standalone';
  /** Solo 'bindable': llave para editar/importar esta página real. */
  bindingKey?: string;
  /** Estado real: 'none' = el CMS nunca la ha tocado, 'draft'/'published' = ya existe una página CMS. */
  status?: SiteNodeStatus;
  /** true si status='published' pero hay cambios en borrador sin publicar todavía. */
  hasUnpublishedChanges?: boolean;
  /** id de la página CMS ya creada (bindable con página existente, o standalone). */
  pageId?: string;
  /** Solo 'section': permite crear contenido nuevo bajo esta sección. */
  canCreateChild?: boolean;
  /** 'blog' = crea un post real nuevo (blog_posts + página CMS bound); default/'standalone' = página CMS suelta. */
  createKind?: 'standalone' | 'blog';
  childSlugPrefix?: string;
  children?: SiteNode[];
};

function statusOf(page: CmsPage | undefined): { status: SiteNodeStatus; hasUnpublishedChanges: boolean } {
  if (!page) return { status: 'none', hasUnpublishedChanges: false };
  if (page.status === 'published') {
    const changed = JSON.stringify(page.draftDoc) !== JSON.stringify(page.publishedDoc);
    return { status: 'published', hasUnpublishedChanges: changed };
  }
  return { status: 'draft', hasUnpublishedChanges: false };
}

export async function getSiteMap(): Promise<SiteNode[]> {
  const [pages, bindables] = await Promise.all([listPages().catch(() => [] as CmsPage[]), getBindablePages().catch(() => [])]);
  const byBindingKey = new Map(pages.filter((p) => p.bindingKey).map((p) => [p.bindingKey as string, p]));
  const standalonePages = pages.filter((p) => p.bindingKind === 'standalone');

  function bindableNode(bk: BindablePage): SiteNode {
    const page = byBindingKey.get(bk.bindingKey);
    const { status, hasUnpublishedChanges } = statusOf(page);
    // Para un artículo de blog, bk.label es el título REAL del post
    // (blog_posts.title) — no cambia solo porque el borrador del CMS tenga
    // otro título. Si ya existe una página CMS, se prefiere su título (el
    // que se ve/edita en el Studio) para que el Mapa del sitio no se quede
    // pegado en "Nuevo artículo" para siempre.
    const label = bk.bindingKind === 'blog' && page?.title ? page.title : bk.label;
    return {
      id: bk.bindingKey,
      label,
      href: bk.urlPath,
      kind: 'bindable',
      bindingKey: bk.bindingKey,
      status,
      hasUnpublishedChanges,
      pageId: page?.id,
    };
  }

  const home = bindables.find((b) => b.bindingKey === 'static:home');
  const motosListado = bindables.find((b) => b.bindingKey === 'static:motos');
  const motosCredito = bindables.find((b) => b.bindingKey === 'static:motos-a-credito');
  const aviso = bindables.find((b) => b.bindingKey === 'static:aviso-de-privacidad');
  const envio = bindables.find((b) => b.bindingKey === 'static:envio-garantia');
  const motos = bindables.filter((b) => b.bindingKind === 'moto');
  const posts = bindables.filter((b) => b.bindingKind === 'blog');

  const standaloneChildren: SiteNode[] = standalonePages.map((p) => ({
    id: `standalone:${p.id}`,
    label: `${p.title} (${p.status})`,
    href: p.urlPath,
    kind: 'standalone',
    status: p.status === 'published' ? 'published' : 'draft',
    hasUnpublishedChanges: p.status === 'published' && JSON.stringify(p.draftDoc) !== JSON.stringify(p.publishedDoc),
    pageId: p.id,
  }));

  const tree: SiteNode[] = [];
  if (home) tree.push(bindableNode(home));

  const motosSectionChildren: SiteNode[] = [];
  if (motosListado) motosSectionChildren.push(bindableNode(motosListado));
  if (motosCredito) motosSectionChildren.push(bindableNode(motosCredito));
  motosSectionChildren.push({
    id: 'motos-fichas',
    label: `Fichas de moto (${motos.length})`,
    kind: 'section',
    children: motos.map(bindableNode),
  });
  tree.push({ id: 'motos', label: 'Motos', href: '/motos', kind: 'section', children: motosSectionChildren });

  tree.push({
    id: 'blog',
    label: 'Blog',
    href: '/blog',
    kind: 'section',
    canCreateChild: true,
    createKind: 'blog',
    children: [{ id: 'blog-posts', label: `Artículos (${posts.length})`, kind: 'section', children: posts.map(bindableNode) }],
  });

  const legalChildren: SiteNode[] = [];
  if (aviso) legalChildren.push(bindableNode(aviso));
  if (envio) legalChildren.push(bindableNode(envio));
  tree.push({ id: 'legal', label: 'Legal', kind: 'section', children: legalChildren });

  tree.push({
    id: 'cms',
    label: 'Páginas nuevas (fuera del sitio actual)',
    kind: 'section',
    canCreateChild: true,
    childSlugPrefix: '',
    children: standaloneChildren,
  });

  return tree;
}
