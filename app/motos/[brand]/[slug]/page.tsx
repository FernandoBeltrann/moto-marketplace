import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { LeadForm } from '@/components/LeadForm';
import { PaymentCalculator } from '@/components/PaymentCalculator';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { brandPath, formatMXN, getMotorcycleByPath, getMotorcycles, productPath } from '@/lib/catalog';
import { site } from '@/lib/site';

type Props = { params: Promise<{ brand: string; slug: string }> };

export async function generateStaticParams() {
  return getMotorcycles().map((m) => ({ brand: brandPath(m.brand), slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand, slug } = await params;
  const moto = getMotorcycleByPath(brand.replaceAll('-', ' '), slug);
  if (!moto) return { title: 'Moto no encontrada' };
  return {
    title: `${moto.brand} ${moto.model} ${moto.year} a crédito`,
    description: `Consulta precio, mensualidad estimada y opciones de compra para ${moto.brand} ${moto.model} ${moto.year}. Financiamiento gestionado por Finva.`,
    alternates: { canonical: `${site.url}${productPath(moto)}` },
    openGraph: { title: `${moto.brand} ${moto.model} ${moto.year}`, description: moto.shortDescription, type: 'website' }
  };
}

export default async function ProductPage({ params }: Props) {
  const { brand, slug } = await params;
  const moto = getMotorcycleByPath(brand.replaceAll('-', ' '), slug);
  if (!moto) notFound();

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: `${moto.brand} ${moto.model} ${moto.year}`,
    brand: { '@type': 'Brand', name: moto.brand },
    description: moto.shortDescription,
    offers: { '@type': 'Offer', priceCurrency: 'MXN', price: moto.price, availability: 'https://schema.org/InStock', url: `${site.url}${productPath(moto)}` }
  };

  return (
    <main className="product-hero">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container product-grid">
        <div>
          <Link href="/motos" className="small muted">← Volver al catálogo</Link>
          <div className="bike-visual" style={{ borderRadius: 32, height: 430, marginTop: 18 }}><div className="bike-line" /></div>
          <section className="section" style={{ paddingTop: 26 }}>
            <h2>¿Para quién es buena?</h2>
            <div className="tags">{moto.bestFor.map((x) => <span className="tag" key={x}>{x}</span>)}</div>
            <p>{moto.shortDescription}</p>
            <h3>Ficha rápida</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {Object.entries(moto.specs).map(([k, v]) => <div className="stat" key={k}><span className="small muted">{k}</span><strong>{v}</strong></div>)}
            </div>
          </section>
        </div>
        <aside className="sticky-box">
          <span className="eyebrow">{moto.category}</span>
          <h1>{moto.brand} {moto.model} {moto.year}</h1>
          <p>{moto.shortDescription}</p>
          <div className="stat-grid">
            <div className="stat"><span className="small muted">Precio</span><strong>{formatMXN(moto.price)}</strong></div>
            <div className="stat">
              <span className="small muted">Desde</span>
              <strong>
                {formatMXN(moto.monthlyFrom)}
                <span className="price-suffix">/mes</span>
              </strong>
            </div>
            <div className="stat"><span className="small muted">Enganche sugerido</span><strong>{formatMXN(moto.suggestedDownPayment)}</strong></div>
          </div>
          <PaymentCalculator price={moto.price} suggestedDownPayment={moto.suggestedDownPayment} motorcycleId={moto.id} />
          <div className="calculator">
            <h3>Iniciar compra</h3>
            <LeadForm motorcycleId={moto.id} motorcycleName={`${moto.brand} ${moto.model} ${moto.year}`} />
            <div style={{ height: 10 }} />
            <WhatsAppButton motorcycleId={moto.id} text={`Hola, quiero información para comprar la ${moto.brand} ${moto.model} ${moto.year}`} />
          </div>
          <p className="small muted">Disponible en: {moto.availableCities.join(', ')}. Validar inventario antes de prometer entrega.</p>
        </aside>
      </div>
    </main>
  );
}
