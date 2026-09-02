/**
 * Todas las páginas REALES del marketplace que el CMS puede controlar
 * (bindables): cada moto, cada post de blog, y las páginas estáticas
 * (home, listados, legales). Fuente única para "Importar existente"
 * (lib/cms/existing.ts) y para el Mapa del sitio interactivo
 * (lib/cms/site-map.ts) — así ambos flujos ven exactamente las mismas
 * páginas y las mismas bindingKey/urlPath.
 *
 * bindingKey es la llave que las páginas reales usan para buscar su
 * override (ver lib/cms/overrides.ts) — moto:<id>, blog:<id>, static:<key>.
 */
import { getBlogPosts } from '@/lib/blog';
import { getMotorcycles, cashPrice, productPath } from '@/lib/catalog';
import { blogPostPath } from '@/lib/blog';
import type { CmsSchemaMeta } from '@/types/cms';

export type BindablePage = {
  bindingKey: string;
  bindingKind: 'moto' | 'blog' | 'static';
  label: string;
  urlPath: string;
  schemaType: CmsSchemaMeta['type'];
  /** HTML semilla al importar por primera vez (contenido real actual). */
  importHtml: string;
  description?: string;
  /** Sugerencia de título para el doc del CMS. */
  title: string;
};

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const STATIC_PAGES: Omit<BindablePage, 'importHtml'>[] = [
  {
    bindingKey: 'static:home',
    bindingKind: 'static',
    label: 'Inicio',
    urlPath: '/',
    schemaType: 'WebPage',
    title: 'Encuentra tu moto y calcula cuánto pagarías al mes.',
    description: 'Sección adicional al final del home (el hero y el buscador siguen siendo funcionales, no bloques).',
  },
  {
    bindingKey: 'static:motos',
    bindingKind: 'static',
    label: 'Catálogo de motos (listado)',
    urlPath: '/motos',
    schemaType: 'WebPage',
    title: 'Catálogo de motos nuevas',
    description: 'Encabezado del listado — el grid de motos abajo sigue siendo el catálogo en vivo.',
  },
  {
    bindingKey: 'static:motos-a-credito',
    bindingKind: 'static',
    label: 'Motos a crédito (listado)',
    urlPath: '/motos-a-credito',
    schemaType: 'WebPage',
    title: 'Motos a crédito',
    description: 'Hero del listado de financiamiento — el grid de modelos abajo sigue siendo en vivo.',
  },
  {
    bindingKey: 'static:aviso-de-privacidad',
    bindingKind: 'static',
    label: 'Aviso de privacidad',
    urlPath: '/aviso-de-privacidad',
    schemaType: 'WebPage',
    title: 'Aviso de privacidad',
    description: 'Contenido legal completo — página estática, sin partes dinámicas.',
  },
  {
    bindingKey: 'static:envio-garantia',
    bindingKind: 'static',
    label: 'Envío y garantía',
    urlPath: '/envio-garantia',
    schemaType: 'WebPage',
    title: 'Envío y garantía',
    description: 'Contenido legal/operativo completo — página estática, sin partes dinámicas.',
  },
];

const STATIC_IMPORT_HTML: Record<string, string> = {
  'static:home':
    '<h2>Por qué elegir MotoClick</h2><p>Cuéntales a tus clientes qué te hace diferente — esta sección aparece al final del home.</p>',
  'static:motos':
    '<span>Catálogo</span><h1>Motos nuevas disponibles</h1><p>Filtra por marca, precio o uso.</p>',
  'static:motos-a-credito':
    '<span>Motos a crédito</span><h1>Compra tu moto en mensualidades.</h1><p>Compara opciones, calcula un pago estimado y empieza tu proceso.</p>',
  'static:aviso-de-privacidad':
    '<h1>Aviso de privacidad</h1><p>Edita aquí el aviso de privacidad completo. Empieza importando el contenido real desde el botón "Importar existente" para no perder el texto legal vigente.</p>',
  'static:envio-garantia':
    '<h1>Envío y garantía</h1><p>Edita aquí el contenido completo de envío y garantía.</p>',
};

export async function getBindablePages(): Promise<BindablePage[]> {
  const out: BindablePage[] = [];

  for (const s of STATIC_PAGES) {
    out.push({ ...s, importHtml: STATIC_IMPORT_HTML[s.bindingKey] ?? `<h1>${esc(s.title)}</h1>` });
  }

  try {
    const motos = await getMotorcycles();
    for (const m of motos) {
      const price = Number(cashPrice(m));
      const img = m.imageUrl ? `<img src="${esc(m.imageUrl)}" alt="${esc(m.brand + ' ' + m.model)}"/>` : '';
      out.push({
        bindingKey: `moto:${m.id}`,
        bindingKind: 'moto',
        label: `${m.brand} ${m.model} ${m.year}`,
        urlPath: productPath(m),
        schemaType: 'Article',
        title: `${m.brand} ${m.model} ${m.year}`,
        description: m.shortDescription || undefined,
        importHtml:
          (m.shortDescription ? `<p>${esc(m.shortDescription)}</p>` : '') +
          img +
          (price ? `<p>Precio desde $${price.toLocaleString('es-MX')} MXN.</p>` : ''),
      });
    }
  } catch {
    /* catálogo no disponible: se omite */
  }

  try {
    const posts = await getBlogPosts();
    for (const p of posts) {
      out.push({
        bindingKey: `blog:${p.id}`,
        bindingKind: 'blog',
        label: p.title,
        urlPath: blogPostPath(p),
        schemaType: 'Article',
        title: p.title,
        description: p.excerpt || undefined,
        importHtml:
          (p.excerpt ? `<p>${esc(p.excerpt)}</p>` : '') +
          (p.coverImageUrl ? `<img src="${esc(p.coverImageUrl)}" alt="${esc(p.title)}"/>` : '') +
          (p.body || ''),
      });
    }
  } catch {
    /* blog no disponible: se omite */
  }

  return out;
}
