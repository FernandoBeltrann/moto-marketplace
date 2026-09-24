import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CatalogClient } from '@/components/CatalogClient';
import { getMotorcycles } from '@/lib/catalog';
import { getCmsOverrideForRequest } from '@/lib/cms/overrides';
import { renderDocHtml } from '@/lib/cms/render';

export const revalidate = 120;

const BINDING_KEY = 'static:motos';

export async function generateMetadata(): Promise<Metadata> {
  const { doc: override } = await getCmsOverrideForRequest(BINDING_KEY, false);
  return {
    title: override?.title || 'Catálogo de motos nuevas',
    description:
      override?.description ||
      'Explora motos nuevas por marca, precio, uso y mensualidades estimadas. Compra ahora y recoge en tu distribuidor mas cercano.',
  };
}

type Props = { searchParams: Promise<{ cmsPreview?: string }> };

export default async function CatalogPage({ searchParams }: Props) {
  const sp = searchParams ? await searchParams : {};
  const [motos, { doc: override, isPreview }] = await Promise.all([
    getMotorcycles(),
    getCmsOverrideForRequest(BINDING_KEY, sp.cmsPreview === '1'),
  ]);
  const introHtml = override ? renderDocHtml(override) : null;
  return (
    <main className="section">
      {isPreview && (
        <div style={{ background: '#fff3e0', color: '#7a3b00', padding: '8px 16px', textAlign: 'center', fontSize: 13 }}>
          Vista previa del borrador — esto aún no está publicado.
        </div>
      )}
      <div className="container">
        {introHtml ? (
          // Intro editable por marketing (CMS) — reemplaza el encabezado fijo. HTML ya saneado.
          <div className="cms-page-body" dangerouslySetInnerHTML={{ __html: introHtml }} />
        ) : (
          <>
            <span className="eyebrow">Catálogo</span>
            <h1>Motos nuevas disponibles</h1>
            <p>Filtra por marca, precio o uso.</p>
          </>
        )}
        <Suspense fallback={<p className="small muted">Cargando catálogo…</p>}>
          <CatalogClient motos={motos} emptyStateMessage={override?.componentConfig?.catalogEmptyState?.message as string | undefined} />
        </Suspense>
      </div>
    </main>
  );
}
