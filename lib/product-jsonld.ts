import type { Motorcycle } from '@/types/motorcycle';
import type { MotorcycleReview } from '@/types/motorcycle-review';
import { cashPrice, productPath } from '@/lib/catalog';
import { site } from '@/lib/site';

const CONTEXT = 'https://schema.org';

export type ProductJsonLdReviews = { reviews: MotorcycleReview[] };

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

/**
 * Oferta mínima que Google suele aceptar para snippets de producto.
 * Envío y políticas de devolución están en `/envio-garantia`; anidar `shippingDetails` /
 * `hasMerchantReturnPolicy` en el Offer ha provocado que el validador descarte todo el
 * bloque `offers` y dispare "Either offers, review, or aggregateRating".
 */
function buildOffer(moto: Motorcycle, productPageUrl: string): Record<string, unknown> {
  return {
    '@type': 'Offer',
    url: productPageUrl,
    priceCurrency: 'MXN',
    price: Number(cashPrice(moto)),
    priceValidUntil: priceValidUntilIso(),
    availability: 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
  };
}

function averageRating(reviews: MotorcycleReview[]): number {
  if (!reviews.length) return 0;
  const sum = reviews.reduce((a, r) => a + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

function reviewToJsonLd(r: MotorcycleReview) {
  const date = r.publishedAt.includes('T') ? r.publishedAt.slice(0, 10) : r.publishedAt;
  return {
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
  };
}

export function buildProductJsonLd(moto: Motorcycle, reviewsCtx?: ProductJsonLdReviews): Record<string, unknown> {
  const url = `${site.url.replace(/\/$/, '')}${productPath(moto)}`;
  const images = productImageUrls(moto);

  const offers = buildOffer(moto, url);

  const product: Record<string, unknown> = {
    '@context': CONTEXT,
    '@type': 'Product',
    name: `${moto.brand} ${moto.model} ${moto.year}`,
    sku: moto.id,
    url,
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
      ratingCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    };
    const reviewNodes = reviews.map((r) => reviewToJsonLd(r));
    product.review = reviewNodes.length === 1 ? reviewNodes[0] : reviewNodes;
  }

  if (images.length === 1) product.image = images[0];
  else if (images.length > 1) product.image = images;

  return product;
}
