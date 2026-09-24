import type { Metadata } from 'next';
import Link from 'next/link';
import { MotorcycleCard } from '@/components/MotorcycleCard';
import { getMotorcycles } from '@/lib/catalog';
import { getCmsOverrideForRequest } from '@/lib/cms/overrides';
import { renderDocHtml } from '@/lib/cms/render';

export const revalidate = 120;

const BINDING_KEY = 'static:motos-a-credito';

export async function generateMetadata(): Promise<Metadata> {
  const { doc: override } = await getCmsOverrideForRequest(BINDING_KEY, false);
  return {
    title: override?.title || 'Motos a crédito',
    description:
      override?.description ||
      'Compra una moto nueva a crédito. Calcula mensualidades estimadas y empieza tu proceso con financiamiento gestionado por Finva.',
  };
}

type Props = { searchParams: Promise<{ cmsPreview?: string }> };

export default async function FinancingPage({ searchParams }: Props) {
  const sp = searchParams ? await searchParams : {};
  const [all, { doc: override, isPreview }] = await Promise.all([
    getMotorcycles(),
    getCmsOverrideForRequest(BINDING_KEY, sp.cmsPreview === '1'),
  ]);
  const motos = all.filter((m) => m.monthlyFrom).slice(0, 9);
  const introHtml = override ? renderDocHtml(override) : null;
  return (
    <main>
      {isPreview && (
        <div style={{ background: '#fff3e0', color: '#7a3b00', padding: '8px 16px', textAlign: 'center', fontSize: 13 }}>
          Vista previa del borrador — esto aún no está publicado.
        </div>
      )}
      {introHtml ? (
        <section className="section">
          {/* Hero editable por marketing (CMS) — reemplaza el hero fijo. HTML ya saneado. */}
          <div className="container cms-page-body" dangerouslySetInnerHTML={{ __html: introHtml }} />
        </section>
      ) : (
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <span className="eyebrow">Motos a crédito</span>
              <h1>Compra tu moto en mensualidades.</h1>
              <p>Compara opciones, calcula un pago estimado y empieza tu proceso. El análisis y seguimiento de financiamiento se gestionan con Finva.</p>
              <Link className="btn green" href="/motos">Ver motos disponibles</Link>
            </div>
            <div className="hero-card">
              <h3>Qué necesitas normalmente</h3>
              <p></p>
              <div className="notice"> Identificación, comprobante de domicilio, comprobante de ingresos y autorización para evaluación crediticia cuando aplique.</div>
            </div>
          </div>
        </section>
      )}
      <section className="section">
        <div className="container">
          <div className="section-head"><div><h2>Modelos populares para financiar</h2><p>Priorizamos motos con buena intención de compra y pagos fáciles de entender.</p></div></div>
          <div className="grid">{motos.map((moto) => <MotorcycleCard moto={moto} key={moto.id} />)}</div>
        </div>
      </section>
    </main>
  );
}
