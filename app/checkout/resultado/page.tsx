import type { Metadata } from 'next';
import Link from 'next/link';
import { MercadoPagoStatusScreen } from '@/components/MercadoPagoStatusScreen';
import { getMercadoPagoPublicKey } from '@/lib/mercadopago';
import { site } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Resultado del pago',
  description: 'Estado del pago de tu moto en Mercado Pago.',
  robots: { index: false, follow: false },
};

type SearchParams = {
  payment_id?: string;
  status?: string;
  motorcycle_brand?: string;
  motorcycle_slug?: string;
};

type Props = { searchParams: Promise<SearchParams> };

const STATUS_COPY: Record<string, { title: string; body: string; tone: 'ok' | 'warn' | 'bad' }> = {
  approved: {
    title: '¡Pago aprobado!',
    body: 'Gracias por tu compra. Te contactaremos en breve para coordinar entrega y documentos.',
    tone: 'ok',
  },
  in_process: {
    title: 'Pago en revisión',
    body: 'Mercado Pago está revisando la operación. Recibirás un email en cuanto se confirme.',
    tone: 'warn',
  },
  pending: {
    title: 'Pago pendiente',
    body: 'Aún no se completa el pago. Si elegiste pago en efectivo, sigue las instrucciones de Mercado Pago.',
    tone: 'warn',
  },
  rejected: {
    title: 'Pago rechazado',
    body: 'No pudimos completar el cobro. Intenta con otra tarjeta o medio de pago.',
    tone: 'bad',
  },
};

export default async function ResultPage({ searchParams }: Props) {
  const params = await searchParams;
  const paymentId = (params.payment_id ?? '').trim();
  const status = (params.status ?? '').trim();
  const back =
    params.motorcycle_brand && params.motorcycle_slug
      ? `/motos/${params.motorcycle_brand}/${params.motorcycle_slug}`
      : '/motos';
  const publicKey = getMercadoPagoPublicKey();
  const copy = STATUS_COPY[status] ?? STATUS_COPY.rejected;

  return (
    <main className="product-hero">
      <div className="container" style={{ paddingTop: 30 }}>
        <Link href={back} className="small muted">
          ← Volver al detalle de la moto
        </Link>
        <section className="section" style={{ paddingTop: 16 }}>
          <span className={`eyebrow eyebrow--${copy.tone}`}>{copy.title}</span>
          <h1>{copy.title}</h1>
          <p>{copy.body}</p>
          {paymentId ? (
            <p className="small muted">Referencia Mercado Pago: <code>{paymentId}</code></p>
          ) : null}
        </section>
        {paymentId ? (
          <div className="section">
            <MercadoPagoStatusScreen
              paymentId={paymentId}
              publicKey={publicKey}
              returnUrl={`${site.url}${back}`}
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}
