import type { Motorcycle } from '@/types/motorcycle';

export function formatMXN(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
}

/** Precio de contado que paga el cliente (promoción si `promoPrice` &lt; `price`). */
export function cashPrice(m: Pick<Motorcycle, 'price' | 'promoPrice'>): number {
  const p = m.promoPrice;
  if (p != null && p > 0 && p < m.price) return p;
  return m.price;
}

/** Precio de lista a tachar cuando hay promo válida; si no, `null`. */
export function listPriceIfPromo(m: Pick<Motorcycle, 'price' | 'promoPrice'>): number | null {
  const p = m.promoPrice;
  if (p != null && p > 0 && p < m.price) return m.price;
  return null;
}

export function promoPercentSaved(m: Pick<Motorcycle, 'price' | 'promoPrice'>): number | null {
  const antes = listPriceIfPromo(m);
  if (antes == null) return null;
  return Math.max(1, Math.round((1 - cashPrice(m) / antes) * 100));
}

export function brandPath(brand: string) {
  return brand.toLowerCase().replaceAll(' ', '-');
}

export function productPath(m: Motorcycle) {
  return `/motos/${brandPath(m.brand)}/${m.slug}`;
}
