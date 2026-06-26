import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cashPrice, getMotorcycleByPath } from '@/lib/catalog';
import { estimateMonthlyPayment, TERMS } from '@/lib/finance';
import { EmbeddedCreditApplication } from '@/components/credit-application/EmbeddedCreditApplication';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ brand: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Clampa el enganche dentro del rango permitido por el calculador (10%–60%). */
function clampDownPayment(raw: number, price: number, fallback: number): number {
  const min = Math.round(price * 0.1);
  const max = Math.round(price * 0.6);
  const base = Number.isFinite(raw) && raw > 0 ? raw : fallback;
  return Math.min(Math.max(Math.round(base), min), max);
}

/**
 * Página standalone con SOLO el flujo (modal) de solicitud de crédito, pensada
 * para incrustarse vía iframe desde otra página. La cotización se arma con los
 * valores sugeridos de la moto y puede sobreescribirse con `?enganche=` y
 * `?plazo=` (meses).
 */
export default async function CreditApplicationEmbedPage({ params, searchParams }: Props) {
  const { brand, slug } = await params;
  const sp = await searchParams;
  const moto = await getMotorcycleByPath(brand, slug);
  if (!moto) notFound();

  const price = cashPrice(moto);
  const downPayment = clampDownPayment(
    Number(firstParam(sp.enganche)),
    price,
    moto.suggestedDownPayment
  );
  const rawMonths = Number(firstParam(sp.plazo));
  const months = (TERMS as readonly number[]).includes(rawMonths) ? rawMonths : 24;
  const monthly = estimateMonthlyPayment(price, downPayment, months);

  return (
    <main className="embed-credit">
      <div className="embed-credit__inner">
        <EmbeddedCreditApplication
          motorcycleId={moto.id}
          motorcycleSlug={moto.slug}
          motorcycleName={`${moto.brand} ${moto.model} ${moto.year}`.trim()}
          motorcycleBrand={moto.brand}
          motorcycleModel={moto.model}
          motorcycleYear={moto.year}
          motorcyclePrice={price}
          finvaMotorcycleId={moto.finvaMotorcycleId ?? null}
          quote={{ price, downPayment, months, monthly }}
        />
      </div>
    </main>
  );
}
