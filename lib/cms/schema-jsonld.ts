/**
 * Schema.org POR PÁGINA, controlado por el editor de marketing.
 *
 * A diferencia de lib/organization-jsonld.ts (schema fijo por código), aquí el
 * tipo y los datos vienen de `doc.schema`, que el editor elige por página —
 * justo lo que pedía el requerimiento original de marketing (Sección 5 del
 * memo de avance). Sigue el mismo patrón que los demás *-jsonld.ts: una
 * función pura que arma un objeto, inyectado como <script type=ld+json>.
 */
import type { CmsPageDoc } from '@/types/cms';
import { site } from '@/lib/site';

const CONTEXT = 'https://schema.org';

export function buildPageJsonLd(doc: CmsPageDoc): Record<string, unknown>[] {
  const base = site.url.replace(/\/$/, '');
  const url = `${base}/p/${doc.slug}`;

  const main: Record<string, unknown> = {
    '@context': CONTEXT,
    '@type': doc.schema.type,
    name: doc.title,
    headline: doc.title,
    url,
    mainEntityOfPage: url,
  };
  if (doc.description) main.description = doc.description;
  if (doc.ogImageUrl) main.image = [doc.ogImageUrl];
  if (doc.schema.datePublished) main.datePublished = doc.schema.datePublished;
  if (doc.schema.dateModified) main.dateModified = doc.schema.dateModified;
  if (doc.schema.author) main.author = { '@type': 'Person', name: doc.schema.author };
  main.publisher = {
    '@type': 'Organization',
    name: site.name,
    logo: { '@type': 'ImageObject', url: `${base}${site.logoPath}` },
  };

  const nodes: Record<string, unknown>[] = [main];

  // FAQPage: si el editor eligió tipo FAQPage y hay un bloque faq, se arma el
  // mainEntity automáticamente desde los items (dato que ya llenó de todos modos).
  const faqBlock = doc.blocks.find((b) => b.type === 'faq');
  if (doc.schema.type === 'FAQPage' && faqBlock && faqBlock.type === 'faq') {
    main.mainEntity = faqBlock.items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    }));
  }

  if (doc.schema.breadcrumb && doc.schema.breadcrumb.length) {
    nodes.push({
      '@context': CONTEXT,
      '@type': 'BreadcrumbList',
      itemListElement: doc.schema.breadcrumb.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: c.url,
      })),
    });
  }

  return nodes;
}
