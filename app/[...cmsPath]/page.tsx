import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublishedPageByUrlPath, getPublishedStandaloneUrlPaths, getPageByUrlPathAny } from '@/lib/cms/pages';
import { getCmsPreviewDocForPage, hasCmsSession } from '@/lib/cms/overrides';
import { renderDocHtml } from '@/lib/cms/render';
import { buildPageJsonLd } from '@/lib/cms/schema-jsonld';
import { site } from '@/lib/site';

// Catch-all genérico: cualquier página standalone que marketing crea en el
// Studio vive en la URL que ELLOS eligieron (`urlPath`, ej. /promos/verano),
// no forzada bajo /p/[slug] — esta es la única plantilla para todas. Solo
// atrapa rutas que ningún otro segmento estático (app/motos, app/blog, …)
// ya reclamó, así que no compite con el resto del sitio. ISR de 120s, igual
// que el resto del sitio.
export const revalidate = 120;

type Props = {
  params: Promise<{ cmsPath: string[] }>;
  searchParams: Promise<{ cmsPreview?: string }>;
};

function toUrlPath(segments: string[]): string {
  return `/${segments.join('/')}`;
}

export async function generateStaticParams() {
  const paths = await getPublishedStandaloneUrlPaths();
  return paths
    .filter((p) => p && p !== '/')
    .map((p) => ({ cmsPath: p.replace(/^\//, '').split('/').filter(Boolean) }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { cmsPath } = await params;
  const { cmsPreview } = await searchParams;
  const urlPath = toUrlPath(cmsPath);
  let page = await getPublishedPageByUrlPath(urlPath);
  // Un borrador standalone que aún no se ha publicado no existe para
  // getPublishedPageByUrlPath — sin esto, la pestaña del navegador decía
  // "Página no encontrada" incluso cuando el body de abajo sí lograba
  // mostrar la vista previa. Mismo criterio de sesión que el body.
  if (!page && cmsPreview === '1' && (await hasCmsSession())) {
    page = await getPageByUrlPathAny(urlPath);
  }
  if (!page) return { title: 'Página no encontrada' };
  const doc = page.draftDoc; // metadata usa el título/desc actual publicado (draft == published tras publicar)
  const description = doc.description || site.description;
  const images = doc.ogImageUrl ? [{ url: doc.ogImageUrl }] : undefined;
  return {
    title: doc.title,
    description,
    alternates: { canonical: `${site.url}${urlPath}` },
    openGraph: { title: doc.title, description, type: 'website', url: `${site.url}${urlPath}`, images },
    twitter: { card: 'summary_large_image', title: doc.title, description },
  };
}

export default async function CmsStandalonePage({ params, searchParams }: Props) {
  const { cmsPath } = await params;
  const { cmsPreview } = await searchParams;
  const urlPath = toUrlPath(cmsPath);

  const page = await getPublishedPageByUrlPath(urlPath);
  // bindingKey para páginas standalone es null, así que preview usa el pageId
  // directo en vez de bindingKey — ver getCmsOverrideForRequest para el caso
  // bound (moto/blog/estáticas), que sí resuelve por bindingKey.
  let doc = page?.publishedDoc ?? null;
  let isPreview = false;
  if (cmsPreview === '1') {
    // Antes esto solo corría si `page` ya existía (es decir, si la página YA
    // estaba publicada) — un borrador guardado pero nunca publicado no tenía
    // fila que pasara ese filtro, así que su vista previa daba 404 aunque
    // "Guardar cambios" hubiera funcionado bien. Ahora, si no se encontró
    // publicada, se busca la página sin filtro de publicado — el draft solo
    // se expone si getCmsPreviewDocForPage confirma sesión válida del Studio.
    const pageForPreview = page ?? (await getPageByUrlPathAny(urlPath));
    if (pageForPreview) {
      const preview = await getCmsPreviewDocForPage(pageForPreview.id);
      if (preview) {
        doc = preview;
        isPreview = true;
      }
    }
  }
  if (!doc) notFound();

  const jsonLd = buildPageJsonLd(doc, urlPath);
  const bodyHtml = renderDocHtml(doc);

  return (
    <main className="section">
      {isPreview && (
        <div style={{ background: '#fff3e0', color: '#7a3b00', padding: '8px 16px', textAlign: 'center', fontSize: 13 }}>
          Vista previa del borrador — esto aún no está publicado.
        </div>
      )}
      {jsonLd.map((node, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }} />
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
