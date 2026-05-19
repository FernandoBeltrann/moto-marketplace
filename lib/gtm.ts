import { cashPrice } from '@/lib/catalog-format';
import type { Motorcycle } from '@/types/motorcycle';

export type GTMEventParams = Record<string, string | number | boolean | null | undefined>;

export function pushGTMEvent(eventName: string, params: GTMEventParams = {}) {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...params,
  });
}

export function trackViewMotorcycle(moto: Motorcycle) {
  pushGTMEvent('view_motorcycle', {
    motorcycle_id: moto.slug,
    motorcycle_name: `${moto.brand} ${moto.model} ${moto.year}`,
    brand: moto.brand,
    model: moto.model,
    year: moto.year,
    price: cashPrice(moto),
    category: moto.category,
  });
}

export function trackCalculatorInteraction({
  motorcycle,
  downPayment,
  termMonths,
  estimatedMonthlyPayment,
}: {
  motorcycle: Pick<Motorcycle, 'slug' | 'brand' | 'model' | 'price' | 'promoPrice'>;
  downPayment: number;
  termMonths: number;
  estimatedMonthlyPayment: number;
}) {
  pushGTMEvent('calculator_interaction', {
    motorcycle_id: motorcycle.slug,
    motorcycle_name: `${motorcycle.brand} ${motorcycle.model}`,
    brand: motorcycle.brand,
    price: cashPrice(motorcycle),
    down_payment: downPayment,
    term_months: termMonths,
    estimated_monthly_payment: estimatedMonthlyPayment,
  });
}

export function trackCatalogFilter(filterType: string, filterValue: string | number) {
  pushGTMEvent('filter_catalog', {
    filter_type: filterType,
    filter_value: filterValue,
  });
}
