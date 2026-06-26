import type { Metadata } from 'next';
import { brandPath, cashPrice, getMotorcycles } from '@/lib/catalog';
import {
  EmbeddedCreditFlow,
  type EmbedMotoOption,
} from '@/components/credit-application/EmbeddedCreditFlow';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const revalidate = 120;

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Página standalone embebible (iframe) con el flujo completo: selector de moto
 * → calculador → wizard de solicitud.
 *
 * Query params:
 *  - `?brand=` / `?marca=` (ej. `yamaha`) → limita el selector a una sola marca.
 *  - `?moto=<id|slug>` → preselecciona un modelo (el usuario igual puede cambiarlo).
 */
export default async function CreditApplicationSelectorEmbedPage({ searchParams }: Props) {
  const sp = await searchParams;
  const list = await getMotorcycles();

  const brandParam = (firstParam(sp.brand) ?? firstParam(sp.marca))?.trim();
  const brandNorm = brandParam ? brandPath(decodeURIComponent(brandParam)) : undefined;
  const filtered = brandNorm ? list.filter((m) => brandPath(m.brand) === brandNorm) : list;

  const motorcycles: EmbedMotoOption[] = filtered.map((m) => ({
    id: m.id,
    slug: m.slug,
    brand: m.brand,
    model: m.model,
    year: m.year,
    name: `${m.brand} ${m.model} ${m.year}`.trim(),
    price: cashPrice(m),
    suggestedDownPayment: m.suggestedDownPayment,
    finvaMotorcycleId: m.finvaMotorcycleId ?? null,
    purchaseUrl: m.purchaseUrl ?? null,
    imageUrl: m.imageUrl ?? null,
  }));

  const motoParam = firstParam(sp.moto)?.toLowerCase();
  const preselected = motoParam
    ? motorcycles.find((m) => m.id.toLowerCase() === motoParam || m.slug.toLowerCase() === motoParam)
    : undefined;

  return (
    <main className="embed-credit">
      <div className="embed-credit__inner">
        <EmbeddedCreditFlow motorcycles={motorcycles} initialId={preselected?.id ?? ''} />
      </div>
    </main>
  );
}
