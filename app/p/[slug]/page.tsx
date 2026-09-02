import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublishedPage, getPublishedSlugs } from '@/lib/cms/pages';
import { renderDocHtml } from '@/lib/cms/render';
import { buildPageJsonLd } from '@/lib/cms/schema-jsonld';
import { site } from '@/lib/site';

// Renderer genérico: una sola plantilla sirve TODAS las páginas que crea
// marketing. Crear una página nueva no requiere deploy de código — solo
// publicar en el Studio. ISR de 120s, igual que el resto del sitio.
export const revalidate = 120;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getPublishedPage(slug);
  if (!doc) return { title: 'Página no encontrada' };
  const description = doc.description || site.description;
  const images = doc.ogImageUrl ? [{ url: doc.ogImageUrl }] : undefined;
  return {
    title: doc.title,
    description,
    alternates: { canonical: `${site.url}/p/${doc.slug}` },
    openGraph: { title: doc.title, description, type: 'website', url: `${site.url}/p/${doc.slug}`, images },
    twitter: { card: 'summary_large_image', title: doc.title, description },
  };
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  const doc = await getPublishedPage(slug);
  if (!doc) notFound();

  const jsonLd = buildPageJsonLd(doc);
  const bodyHtml = renderDocHtml(doc);

  return (
    <main className="section">
      {jsonLd.map((node, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
        />
      ))}
      <div className="container" style={{ maxWidth: 820 }}>
        {/*
          bodyHtml sale de renderDocHtml (lib/cms/render.ts), una transformación
          determinista del JSON canónico ya saneado — no es input crudo de
          usuario. Mismo patrón que el cuerpo del blog.
        */}
        <div className="cms-page-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </div>
    </main>
  );
}
