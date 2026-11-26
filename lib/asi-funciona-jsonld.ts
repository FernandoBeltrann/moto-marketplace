import { site } from '@/lib/site';

const PATH = '/asi-funciona-comprar-tu-moto-a-credito-con-motoclick';

type Faq = { question: string; answer: string };

/** Las respuestas del acordeón traen HTML (<a>); el schema lleva solo el texto visible. */
function plainText(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Schema.org de "Así funciona": un solo @graph con FAQPage (todas las preguntas
 * de los 4 pasos, generadas desde el mismo contenido que se ve en la página, para
 * que schema y texto visible no se desincronicen) y BreadcrumbList.
 * `isPartOf` y `publisher` apuntan a los @id de WebSite y Organization que
 * inyecta el layout (lib/organization-jsonld.ts).
 */
export function buildAsiFuncionaJsonLd(faqs: Faq[], description: string): Record<string, unknown> {
  const base = site.url.replace(/\/$/, '');
  const url = `${base}${PATH}`;
  const title = `Así funciona comprar tu moto a crédito con ${site.name}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        '@id': `${url}#webpage`,
        url,
        name: title,
        description,
        inLanguage: 'es-MX',
        isPartOf: { '@id': `${base}/#website` },
        publisher: { '@id': `${base}/#organization` },
        breadcrumb: { '@id': `${url}#breadcrumb` },
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
          { '@type': 'ListItem', position: 2, name: 'Así funciona', item: url },
        ],
      },
    ],
  };
}
