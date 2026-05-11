import Link from 'next/link';
import { SearchBox } from '@/components/SearchBox';
import { MotorcycleCard } from '@/components/MotorcycleCard';
import { getMotorcycles } from '@/lib/catalog';
import { site } from '@/lib/site';

export const revalidate = 120;

export default async function HomePage() {
  const all = await getMotorcycles();
  const featured = all.slice(0, 6);
  return (
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">Motos nuevas + financiamiento powered by Finva</span>
            <h1>Encuentra tu moto y calcula cuánto pagarías al mes.</h1>
            <p>Explora motos por presupuesto, uso y marca. Inicia tu compra en minutos con opciones de financiamiento gestionadas por Finva.</p>
            <SearchBox />
          </div>
          <div className="hero-card">
            <div className="bike-visual" style={{ borderRadius: 24 }}><div className="bike-line" /></div>
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

      <section id="como-funciona" className="section">
        <div className="container two-col">
          <div><h2>Diseñado para convertir tráfico en compradores.</h2><p>El MVP está pensado para campañas de Meta/TikTok y SEO: páginas indexables, URLs limpias, mensualidad visible, CTAs directos y captura de UTM en cada lead.</p></div>
          <div className="hero-card">
            <h3>Cómo funciona</h3>
            <p><strong>1.</strong> El cliente encuentra una moto.</p>
            <p><strong>2.</strong> Calcula enganche y mensualidad estimada.</p>
            <p><strong>3.</strong> Deja WhatsApp e intención de compra.</p>
            <p><strong>4.</strong> Finva continúa evaluación, documentos, aprobación y cierre.</p>
            <Link className="btn green full" href="/motos-a-credito">Ver motos a crédito</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
