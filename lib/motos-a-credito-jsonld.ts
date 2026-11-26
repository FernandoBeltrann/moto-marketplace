import { site } from '@/lib/site';
import { productPath } from '@/lib/catalog-format';
import type { Motorcycle } from '@/types/motorcycle';

const PATH = '/motos-a-credito';

type Faq = { question: string; answer: string };

/** Las respuestas del acordeón traen HTML (<a>); el schema lleva solo el texto visible. */
function plainText(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Schema.org de /motos-a-credito (landing de "moto a crédito"): un solo @graph con
 * CollectionPage (el catálogo, con su ItemList de fichas), FAQPage (las mismas
 * preguntas que se ven en la página) y BreadcrumbList. `isPartOf` y `publisher`
 * apuntan a los @id de WebSite y Organization que inyecta el layout.
 */
export function buildMotosACreditoJsonLd(
  motos: Motorcycle[],
  faqs: Faq[],
  title: string,
  description: string,
): Record<string, unknown> {
  const base = site.url.replace(/\/$/, '');
  const url = `${base}${PATH}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${url}#webpage`,
        url,
        name: title,
        description,
        inLanguage: 'es-MX',
        isPartOf: { '@id': `${base}/#website` },
        publisher: { '@id': `${base}/#organization` },
        breadcrumb: { '@id': `${url}#breadcrumb` },
        mainEntity: {
          '@type': 'ItemList',
          name: 'Motos nuevas a crédito',
          numberOfItems: motos.length,
          itemListElement: motos.map((m, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: `${m.brand} ${m.model} ${m.year}`,
            url: `${base}${productPath(m)}`,
          })),
        },
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        url,
        inLanguage: 'es-MX',
        isPartOf: { '@id': `${url}#webpage` },
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: plainText(f.answer) },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${base}/` },
          { '@type': 'ListItem', position: 2, name: 'Moto a crédito', item: url },
        ],
      },
    ],
  };
}
