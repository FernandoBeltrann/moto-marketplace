import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MercadoPagoCheckout } from '@/components/MercadoPagoCheckout';
import { cashPrice, formatMXN, getMotorcycleByPath, productPath } from '@/lib/catalog';
import { getMaxInstallments, getMercadoPagoPublicKey } from '@/lib/mercadopago';
import { site } from '@/lib/site';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ brand: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand, slug } = await params;
  const moto = await getMotorcycleByPath(brand, slug);
  if (!moto) return { title: 'Checkout no encontrado' };
  return {
    title: `Pagar ${moto.brand} ${moto.model} ${moto.year}`,
    description: 'Paga tu moto con tarjeta de débito (1 pago) o crédito (hasta 24 meses).',
    robots: { index: false, follow: false },
    alternates: { canonical: `${site.url}${productPath(moto)}` },
  };
}

export default async function CheckoutPage({ params }: Props) {
  const { brand, slug } = await params;
  const moto = await getMotorcycleByPath(brand, slug);
  if (!moto) notFound();

  const amount = cashPrice(moto);
  const publicKey = getMercadoPagoPublicKey();
  const maxInstallments = getMaxInstallments();

  return (
    <main className="product-hero">
      <div className="container product-grid">
        <div>
          <Link href={productPath(moto)} className="small muted">
            ← Volver al detalle
          </Link>
          <div
            className={
              'bike-visual' +
              (moto.imageUrl ? ' bike-visual--photo bike-visual--photo-hero' : '')
            }
            style={{ borderRadius: 32, height: 320, marginTop: 18 }}
          >
            {moto.imageUrl ? (
              <Image
                src={moto.imageUrl}
                alt={`${moto.brand} ${moto.model} ${moto.year}`}
                fill
                className="bike-visual__img"
                sizes="(max-width: 900px) 100vw, 480px"
                priority
              />
            ) : (
              <div className="bike-line" />
            )}
          </div>
          <section className="checkout-summary">
            <span className="eyebrow">{moto.category}</span>
            <h1 className="checkout-summary__title">
              {moto.brand} {moto.model} {moto.year}
            </h1>
            <p className="checkout-summary__desc">{moto.shortDescription}</p>
            <div className="checkout-total">
              <span className="small muted">Total a pagar</span>
              <strong className="checkout-total__amount">{formatMXN(amount)}</strong>
              <span className="checkout-total__note">
                Débito en 1 pago · Crédito hasta {maxInstallments} meses (con intereses del banco)
              </span>
            </div>
            <ul className="checkout-trust" aria-label="Garantías del pago">
              <li>Pago seguro procesado por Mercado Pago</li>
              <li>Autenticación 3DS 2.0 y antifraude integrados</li>
              <li>Datos de tu tarjeta cifrados de extremo a extremo</li>
            </ul>
          </section>
        </div>
        <aside className="sticky-box">
          <header className="checkout-aside-head">
            <span className="mp-cta__badge" aria-hidden="true">MP</span>
            <div>
              <h2 className="checkout-aside-head__title">Pagar con Mercado Pago</h2>
              <p className="small muted checkout-aside-head__sub">
                Elige tarjeta de débito o crédito para confirmar tu compra.
              </p>
            </div>
          </header>
          <MercadoPagoCheckout
            amount={amount}
            publicKey={publicKey}
            maxInstallments={maxInstallments}
            motorcycle={{
              id: moto.id,
              brand,
              slug,
              name: `${moto.brand} ${moto.model} ${moto.year}`.trim(),
            }}
          />
        </aside>
      </div>
    </main>
  );
}
