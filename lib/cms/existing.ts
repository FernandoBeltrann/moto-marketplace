/**
 * Páginas existentes del sitio, expuestas al Studio como HTML pre-cargado para
 * que Marketing las importe y edite. Trae contenido REAL:
 *   - Blog: el body HTML real de cada artículo publicado (blog_posts).
 *   - Motos: arma el HTML de la ficha desde la fila real del catálogo.
 *   - Estáticas: un par de páginas clave con HTML representativo.
 *
 * Nota de alcance (memo de marketing): el catálogo de motos sigue generando su
 * Schema.org Product por código; el CMS agéntico cubre páginas editoriales
 * (WebPage/Article/FAQPage/AboutPage). Importar una moto aquí es para editar su
 * COPY, no para reemplazar el feed de producto.
 */
import { getBlogPosts } from '@/lib/blog';
import { getMotorcycles, cashPrice, productPath } from '@/lib/catalog';
import { site } from '@/lib/site';
import type { CmsSchemaMeta } from '@/types/cms';

export type ExistingPage = {
  key: string;
  source: 'blog' | 'moto' | 'static';
  label: string;
  /** slug sugerido al importar al CMS (prefijado para no chocar con rutas reales). */
  suggestedSlug: string;
  schemaType: CmsSchemaMeta['type'];
  /** HTML pre-cargado para editar. */
  html: string;
  description?: string;
};

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function getExistingPages(): Promise<ExistingPage[]> {
  const out: ExistingPage[] = [];

  // --- Estáticas (HTML representativo del contenido real) ---
  out.push({
    key: 'static:motos-landing',
    source: 'static',
    label: 'Landing · Motos a crédito',
    suggestedSlug: 'motos-a-credito-editorial',
    schemaType: 'WebPage',
    description: 'Página editorial de motos a crédito',
    html:
      '<h1>Motos nuevas con financiamiento a tu medida</h1>' +
      '<p>Encuentra tu próxima moto y estrénala hoy con mensualidades accesibles en MotoClick.</p>' +
      '<h2>¿Por qué comprar a crédito con nosotros?</h2>' +
      '<p>Enganche desde 10%, plazos de 12 a 48 meses y aprobación rápida.</p>' +
      '<a href="/motos">Ver catálogo</a>',
  });

  // --- Motos reales del catálogo (top 5) ---
  try {
    const motos = (await getMotorcycles()).slice(0, 5);
    for (const m of motos) {
      const price = Number(cashPrice(m));
      const img = m.imageUrl ? `<img src="${esc(m.imageUrl)}" alt="${esc(m.brand + ' ' + m.model)}"/>` : '';
      out.push({
        key: 'moto:' + m.id,
        source: 'moto',
        label: `Moto · ${m.brand} ${m.model} ${m.year}`,
        suggestedSlug: `moto-${m.slug}`,
        schemaType: 'Article',
        description: m.shortDescription || undefined,
        html:
          `<h1>${esc(m.brand)} ${esc(m.model)} ${esc(String(m.year))}</h1>` +
          (m.shortDescription ? `<p>${esc(m.shortDescription)}</p>` : '') +
          img +
          (price ? `<p>Precio desde $${price.toLocaleString('es-MX')} MXN.</p>` : '') +
          `<a href="${esc(productPath(m))}">Ver ficha y cotizar</a>`,
      });
    }
  } catch {
    /* catálogo no disponible: se omite */
  }

  // --- Artículos de blog reales ---
  try {
    const posts = await getBlogPosts();
    for (const p of posts) {
      out.push({
        key: 'blog:' + p.slug,
        source: 'blog',
        label: `Blog · ${p.title}`,
        suggestedSlug: `blog-${p.slug}`,
        schemaType: 'Article',
        description: p.excerpt || undefined,
        html:
          `<h1>${esc(p.title)}</h1>` +
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
