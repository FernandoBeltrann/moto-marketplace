import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CreditApplicationShell } from '@/components/credit-application/CreditApplicationShell';
import { PrecioContado } from '@/components/PrecioContado';
import { MotorcycleReviews } from '@/components/MotorcycleReviews';
import { brandPath, cashPrice, formatMXN, getMotorcycleByPath, getMotorcycles, productPath } from '@/lib/catalog';
import { getMotorcycleReviews } from '@/lib/motorcycle-reviews';
import { buildProductJsonLd, absoluteAssetUrl } from '@/lib/product-jsonld';
import { site } from '@/lib/site';

export const revalidate = 120;

type Props = { params: Promise<{ brand: string; slug: string }> };

export async function generateStaticParams() {
  const list = await getMotorcycles();
  return list.map((m) => ({ brand: brandPath(m.brand), slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand, slug } = await params;
  const moto = await getMotorcycleByPath(brand, slug);
  if (!moto) return { title: 'Moto no encontrada' };
  return {
    title: `${moto.brand} ${moto.model} ${moto.year} a crédito`,
    description: `Consulta precio, mensualidad estimada y opciones de compra para ${moto.brand} ${moto.model} ${moto.year}. Financiamiento gestionado por Finva.`,
    alternates: { canonical: `${site.url}${productPath(moto)}` },
    openGraph: {
      title: `${moto.brand} ${moto.model} ${moto.year}`,
      description: moto.shortDescription,
      type: 'website',
      url: `${site.url}${productPath(moto)}`,
      images: moto.imageUrl ? [{ url: absoluteAssetUrl(moto.imageUrl) }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { brand, slug } = await params;
  const moto = await getMotorcycleByPath(brand, slug);
  if (!moto) notFound();

  const reviews = await getMotorcycleReviews(moto.id);
  const jsonLd = buildProductJsonLd(moto, { reviews });

  const hasPhoto = Boolean(moto.imageUrl);

  return (
    <main className="product-hero">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container product-grid">
        <div>
          <Link href="/motos" className="small muted">← Volver al catálogo</Link>
          <div
            className={
              'bike-visual' +
              (hasPhoto ? ' bike-visual--photo bike-visual--photo-hero' : '')
            }
            style={{ borderRadius: 32, height: 430, marginTop: 18 }}
          >
            {hasPhoto && moto.imageUrl ? (
              <Image
                src={moto.imageUrl}
                alt={`${moto.brand} ${moto.model} ${moto.year}`}
                fill
                className="bike-visual__img"
                sizes="(max-width: 900px) 100vw, 560px"
                priority
              />
            ) : (
              <div className="bike-line" />
            )}
          </div>
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
            <div className="stat stat--precio"><span className="small muted">Precio</span><PrecioContado moto={moto} /></div>
            <div className="stat">
              <span className="small muted">Desde</span>
              <strong>
                {formatMXN(moto.monthlyFrom)}
                <span className="price-suffix">/mes</span>
              </strong>
            </div>
            <div className="stat"><span className="small muted">Enganche sugerido</span><strong>{formatMXN(moto.suggestedDownPayment)}</strong></div>
          </div>
          <CreditApplicationShell
            price={cashPrice(moto)}
            suggestedDownPayment={moto.suggestedDownPayment}
            motorcycleId={moto.id}
            motorcycleName={`${moto.brand} ${moto.model} ${moto.year}`}
            purchaseUrl={moto.purchaseUrl || site.defaultPurchaseUrl}
          />
          <p className="small muted">Envio incluido en CDMX y area metropolitana. En el resto del pais se recoge en agencia con posibilidad de envio, dependiendo de disponibilidad.</p>
        </aside>
      </div>
      <MotorcycleReviews reviews={reviews} />
    </main>
  );
}
