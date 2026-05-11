import type { Metadata } from 'next';
import Link from 'next/link';
import { MotorcycleCard } from '@/components/MotorcycleCard';
import { getMotorcycles } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Motos a crédito',
  description: 'Compra una moto nueva a crédito. Calcula mensualidades estimadas y empieza tu proceso con financiamiento gestionado por Finva.'
};

export default function FinancingPage() {
  const motos = getMotorcycles().filter((m) => m.monthlyFrom).slice(0, 9);
  return (
    <main>
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
      <section className="section">
        <div className="container">
          <div className="section-head"><div><h2>Modelos populares para financiar</h2><p>Priorizamos motos con buena intención de compra y pagos fáciles de entender.</p></div></div>
          <div className="grid">{motos.map((moto) => <MotorcycleCard moto={moto} key={moto.id} />)}</div>
        </div>
      </section>
    </main>
  );
}
