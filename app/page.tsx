import type { Metadata } from 'next';
import Link from 'next/link';
import { SearchBox } from '@/components/SearchBox';
import { HeroMotoRotator } from '@/components/HeroMotoRotator';
import { MotorcycleCard } from '@/components/MotorcycleCard';
import { getBrands, getMotorcycles } from '@/lib/catalog';
import { getCmsOverrideForRequest } from '@/lib/cms/overrides';
import { renderDocHtml } from '@/lib/cms/render';

export const revalidate = 120;

const BINDING_KEY = 'static:home';

export async function generateMetadata(): Promise<Metadata> {
  const { doc: override } = await getCmsOverrideForRequest(BINDING_KEY, false);
  if (!override) return {};
  return { title: override.title || undefined, description: override.description || undefined };
}

type Props = { searchParams: Promise<{ cmsPreview?: string }> };

export default async function HomePage({ searchParams }: Props) {
  const sp = searchParams ? await searchParams : {};
  const [all, brands, { doc: override, isPreview }] = await Promise.all([
    getMotorcycles(),
    getBrands(),
    getCmsOverrideForRequest(BINDING_KEY, sp.cmsPreview === '1'),
  ]);
  const featured = all.slice(0, 6);
  const heroSlides = all.filter((m) => m.imageUrl).slice(0, 8);
  const extraHtml = override ? renderDocHtml(override) : null;
  return (
    <main>
      {isPreview && (
        <div style={{ background: '#fff3e0', color: '#7a3b00', padding: '8px 16px', textAlign: 'center', fontSize: 13 }}>
          Vista previa del borrador — esto aún no está publicado.
        </div>
      )}
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">Motos nuevas + financiamiento powered by Finva</span>
            <h1>{override?.title || 'Encuentra tu moto y calcula cuánto pagarías al mes.'}</h1>
            <p>{override?.description || 'Explora motos por presupuesto, uso y marca. Inicia tu compra en minutos con opciones de financiamiento gestionadas por Finva.'}</p>
            <SearchBox brands={brands} />
          </div>
          <div className="hero-card">
            <HeroMotoRotator slides={heroSlides} />
            <div className="kpi-strip">
              <div className="kpi"><strong>1</strong><span className="small muted">Elige moto</span></div>
              <div className="kpi"><strong>2</strong><span className="small muted">Calcula pago</span></div>
              <div className="kpi"><strong>3</strong><span className="small muted">Inicia compra</span></div>
              <div className="kpi"><strong>4</strong><span className="small muted">Finva gestiona</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div><h2>Motos destacadas</h2><p>Ordenadas por intención comercial: disponibilidad, precio, financiamiento y conversión esperada.</p></div>
            <Link className="btn" href="/motos">Ver catálogo</Link>
          </div>
          <div className="grid">{featured.map((moto) => <MotorcycleCard moto={moto} key={moto.id} />)}</div>
        </div>
      </section>

      <section id="como-funciona" className="section--como-fullpage" aria-labelledby="como-funciona-title">
        <div className="como-funciona-shell">
          <div className="hero-card hero-card--como-fullpage">
            <div className="como-funciona-body">
              <h3 id="como-funciona-title">Cómo funciona</h3>
              <div className="como-funciona-steps">
                <p><strong>1.</strong> Encuentra tu moto.</p>
                <p><strong>2.</strong> Calcula enganche y mensualidad estimada.</p>
                <p><strong>3.</strong> WhatsApp e intención de compra.</p>
                <p><strong>4.</strong> Finva continúa evaluación, documentos, aprobación y cierre.</p>
              </div>
            </div>
            <Link className="btn green full como-funciona-cta" href="/motos-a-credito">Ver motos a crédito</Link>
          </div>
        </div>
      </section>

      {extraHtml && (
        <section className="section">
          {/* Sección adicional editable por marketing (CMS), al final del home. HTML ya saneado. */}
          <div className="container cms-page-body" dangerouslySetInnerHTML={{ __html: extraHtml }} />
        </section>
      )}
    </main>
  );
}
