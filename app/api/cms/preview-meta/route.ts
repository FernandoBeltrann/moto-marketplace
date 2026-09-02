import { NextResponse } from 'next/server';
import { normalizeDoc } from '@/lib/cms/blocks';
import { buildPageJsonLd } from '@/lib/cms/schema-jsonld';
import { site } from '@/lib/site';

export const runtime = 'nodejs';

/**
 * POST /api/cms/preview-meta — dado un doc (bloques), devuelve TODO el SEO que
 * la página emitirá: el/los bloques JSON-LD de Schema.org (idénticos a los que
 * inyecta /p/[slug]) y su entrada de sitemap. Alimenta la pestaña "Schema/SEO"
 * del Studio para que Marketing vea el resultado sin salir del playground.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { doc?: unknown; updatedAt?: string };
    if (!body.doc) return NextResponse.json({ error: 'Falta doc.' }, { status: 400 });
    const doc = normalizeDoc(body.doc);
    const jsonLd = buildPageJsonLd(doc);
    const base = site.url.replace(/\/$/, '');
    const loc = `${base}/p/${doc.slug}`;
    const lastmod = (body.updatedAt || new Date().toISOString()).slice(0, 10);

    // Meta tags (title, description, canonical, Open Graph, Twitter) — espejo de
    // generateMetadata() en app/p/[slug]/page.tsx.
    const me = (v: string) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const abs = (u: string) => (/^https?:\/\//i.test(u) ? u : `${base}${u.startsWith('/') ? u : '/' + u}`);
    const title = doc.title;
    const description = doc.description || site.description;
    const ogImg = doc.ogImageUrl ? abs(doc.ogImageUrl) : null;
    const metaTags = [
      `<title>${me(title)}</title>`,
      `<meta name="description" content="${me(description)}" />`,
      `<link rel="canonical" href="${loc}" />`,
      `<meta property="og:title" content="${me(title)}" />`,
      `<meta property="og:description" content="${me(description)}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:url" content="${loc}" />`,
      ...(ogImg ? [`<meta property="og:image" content="${me(ogImg)}" />`] : []),
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${me(title)}" />`,
      `<meta name="twitter:description" content="${me(description)}" />`,
    ].join('\n');

    // Etiquetas <script> tal como aparecen en el <head> de la página pública.
    const headTags = jsonLd
      .map((node) => `<script type="application/ld+json">\n${JSON.stringify(node, null, 2)}\n</script>`)
      .join('\n');

    // Fragmento de sitemap.xml para esta página.
    const sitemapXml = `<url>\n  <loc>${loc}</loc>\n  <lastmod>${lastmod}</lastmod>\n</url>`;

    return NextResponse.json({
      jsonLd,
      metaTags,
      headTags,
      sitemap: { loc, lastmod },
      sitemapXml,
      schemaType: doc.schema.type,
      nodes: jsonLd.map((n) => n['@type']),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
