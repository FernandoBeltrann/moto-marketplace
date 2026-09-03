import type { Motorcycle } from '@/types/motorcycle';
import { cashPrice, formatMXN, listPriceIfPromo, promoPercentSaved } from '@/lib/catalog-format';

type Props = { moto: Pick<Motorcycle, 'price' | 'promoPrice'>; compact?: boolean };

/** Precio de lista + promo (tachado / destacado) o solo precio único. */
export function PrecioContado({ moto, compact }: Props) {
  const antes = listPriceIfPromo(moto);
  const ahora = cashPrice(moto);
  const pct = promoPercentSaved(moto);

  if (antes == null) {
    return <strong className={compact ? undefined : 'precio-contado__solo'}>{formatMXN(ahora)}</strong>;
  }

  return (
    <div className={'precio-contado' + (compact ? ' precio-contado--compact' : '')}>
      <span className="precio-contado__antes" aria-label={`Precio de lista ${formatMXN(antes)}`}>
        {formatMXN(antes)}
      </span>
      <span className="precio-contado__ahora">{formatMXN(ahora)}</span>
      {pct != null ? (
        <span className="precio-contado__pill">−{pct}%</span>
      ) : null}
    </div>
  );
}
