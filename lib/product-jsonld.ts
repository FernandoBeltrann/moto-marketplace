import type { Motorcycle } from '@/types/motorcycle';
import type { MotorcycleReview } from '@/types/motorcycle-review';
import { cashPrice, productPath } from '@/lib/catalog';
import { site } from '@/lib/site';

const CONTEXT = 'https://schema.org';

export type ProductJsonLdReviews = { reviews: MotorcycleReview[] };

const policyPageUrl = () => `${site.url.replace(/\/$/, '')}/envio-garantia`;

/** Convierte URL de imagen del catálogo a absoluta (requerido por Google). */
export function absoluteAssetUrl(url: string): string {
  const t = url.trim();
  if (/^https?:\/\//i.test(t)) return t;
  const base = site.url.replace(/\/$/, '');
  return `${base}${t.startsWith('/') ? t : `/${t}`}`;
}

function productImageUrls(moto: Motorcycle): string[] {
  const out: string[] = [];
  if (moto.imageUrl) out.push(absoluteAssetUrl(moto.imageUrl));
  if (moto.galleryUrls?.length) {
    for (const u of moto.galleryUrls) {
      const abs = absoluteAssetUrl(u);
      if (!out.includes(abs)) out.push(abs);
    }
  }
  return out;
}

function priceValidUntilIso(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().slice(0, 10);
}

const freeMx = { '@type': 'MonetaryAmount', value: '0', currency: 'MXN' };
const destMx = { '@type': 'DefinedRegion', addressCountry: 'MX' };

const deliveryTimeCdmxMetro = {
  '@type': 'ShippingDeliveryTime',
  handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
  transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 7, unitCode: 'DAY' },
};

/** Recogida en tienda / coordinación: plazos más variables. */
const deliveryTimeInterior = {
  '@type': 'ShippingDeliveryTime',
  handlingTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 5, unitCode: 'DAY' },
  transitTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 2, unitCode: 'DAY' },
};

/**
 * Dos opciones a MXN 0: entrega en CDMX y zona metropolitana; resto del país con recogida y envío negociable.
 * Google no permite subdividir MX en `addressRegion` para Search; el detalle está en `/envio-garantia`.
 */
function offerShippingDetailsList() {
  return [
    {
      '@type': 'OfferShippingDetails',
      shippingRate: freeMx,
      shippingDestination: destMx,
      deliveryTime: deliveryTimeCdmxMetro,
    },
    {
      '@type': 'OfferShippingDetails',
      shippingRate: freeMx,
      shippingDestination: destMx,
      deliveryTime: deliveryTimeInterior,
    },
  ];
}

/**
 * Política de postventa: condiciones de garantía y devolución dependen de la marca y la póliza de cada moto.
 * `MerchantReturnUnlimitedWindow` refleja que no hay un plazo fijo unificado del marketplace frente al plazo legal de fabricante.
 */
function merchantReturnPolicy() {
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'MX',
    returnPolicyCategory: 'https://schema.org/MerchantReturnUnlimitedWindow',
    returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
    returnMethod: ['https://schema.org/ReturnInStore', 'https://schema.org/ReturnByMail'],
    merchantReturnLink: `${policyPageUrl()}#garantia`,
  };
}

function averageRating(reviews: MotorcycleReview[]): number {
  if (!reviews.length) return 0;
  const sum = reviews.reduce((a, r) => a + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

function reviewToJsonLd(r: MotorcycleReview, productName: string, sku: string) {
  const date = r.publishedAt.includes('T') ? r.publishedAt.slice(0, 10) : r.publishedAt;
  const node: Record<string, unknown> = {
    '@type': 'Review',
    name: r.title || `Reseña de ${r.authorName}`,
    author: { '@type': 'Person', name: r.authorName },
    datePublished: date,
    reviewBody: r.body,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: r.rating,
      bestRating: 5,
      worstRating: 1,
    },
    itemReviewed: { '@type': 'Product', name: productName, sku },
  };
  return node;
}

export function buildProductJsonLd(moto: Motorcycle, reviewsCtx?: ProductJsonLdReviews): Record<string, unknown> {
  const url = `${site.url.replace(/\/$/, '')}${productPath(moto)}`;
  const images = productImageUrls(moto);

  const offers: Record<string, unknown> = {
    '@type': 'Offer',
    url,
    priceCurrency: 'MXN',
    price: cashPrice(moto),
    priceValidUntil: priceValidUntilIso(),
    availability: 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
    shippingDetails: offerShippingDetailsList(),
    hasMerchantReturnPolicy: merchantReturnPolicy(),
  };

  const product: Record<string, unknown> = {
    '@context': CONTEXT,
    '@type': 'Product',
    name: `${moto.brand} ${moto.model} ${moto.year}`,
    sku: moto.id,
    brand: { '@type': 'Brand', name: moto.brand },
    description: moto.shortDescription,
    offers,
  };

  const reviews = reviewsCtx?.reviews ?? [];
  if (reviews.length) {
    product.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: averageRating(reviews),
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    };
    const productName = `${moto.brand} ${moto.model} ${moto.year}`;
    const reviewNodes = reviews.map((r) => reviewToJsonLd(r, productName, moto.id));
    product.review = reviewNodes.length === 1 ? reviewNodes[0] : reviewNodes;
  }

  if (images.length === 1) product.image = images[0];
  else if (images.length > 1) product.image = images;

  return product;
}
