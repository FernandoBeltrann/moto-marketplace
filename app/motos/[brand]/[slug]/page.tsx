import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MotorcycleViewTracker } from "@/components/MotorcycleViewTracker";
import { FinvaCheckout } from "@/components/FinvaCheckout";
import { PrecioContado } from "@/components/PrecioContado";
import { MotorcycleReviews } from "@/components/MotorcycleReviews";
import {
  brandPath,
  cashPrice,
  formatMXN,
  getMotorcycleByPath,
  getMotorcycles,
  productPath,
} from "@/lib/catalog";
import { getMotorcycleReviews } from "@/lib/motorcycle-reviews";
import { buildProductJsonLd, absoluteAssetUrl } from "@/lib/product-jsonld";
import { site } from "@/lib/site";
import { getCmsOverrideForRequest } from "@/lib/cms/overrides";
import { renderDocHtml } from "@/lib/cms/render";
import { buildPageJsonLd } from "@/lib/cms/schema-jsonld";
import { productPath as motoProductPath } from "@/lib/catalog";

export const revalidate = 120;

type Props = { params: Promise<{ brand: string; slug: string }> };

export async function generateStaticParams() {
  const list = await getMotorcycles();
  return list.map((m) => ({ brand: brandPath(m.brand), slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand, slug } = await params;
  const moto = await getMotorcycleByPath(brand, slug);
  if (!moto) return { title: "Moto no encontrada" };
  const { doc: override } = await getCmsOverrideForRequest(`moto:${moto.id}`, false);
  const title = override?.title || `${moto.brand} ${moto.model} ${moto.year} a crédito`;
  const description =
    override?.description ||
    `Consulta precio, mensualidad estimada y opciones de compra para ${moto.brand} ${moto.model} ${moto.year}. Financiamiento gestionado por Finva.`;
  const ogImage = override?.ogImageUrl || (moto.imageUrl ? absoluteAssetUrl(moto.imageUrl) : undefined);
  return {
    title,
    description,
    alternates: { canonical: `${site.url}${productPath(moto)}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `${site.url}${productPath(moto)}`,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

type PageProps = Props & { searchParams: Promise<{ cmsPreview?: string }> };

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { brand, slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const moto = await getMotorcycleByPath(brand, slug);
  if (!moto) notFound();

  const reviews = await getMotorcycleReviews(moto.id);
  const jsonLd = buildProductJsonLd(moto, { reviews });
  const { doc: override, isPreview } = await getCmsOverrideForRequest(`moto:${moto.id}`, sp.cmsPreview === '1');
  const overrideHtml = override ? renderDocHtml(override) : null;
  const overrideJsonLd = override ? buildPageJsonLd(override, motoProductPath(moto)) : [];

  const hasPhoto = Boolean(moto.imageUrl);

  return (
    <main className="product-hero">
      <MotorcycleViewTracker motorcycle={moto} />
      {isPreview && (
        <div style={{ background: '#fff3e0', color: '#7a3b00', padding: '8px 16px', textAlign: 'center', fontSize: 13 }}>
          Vista previa del borrador — esto aún no está publicado.
        </div>
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {overrideJsonLd.map((node, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }} />
      ))}
      <div className="container product-grid">
        <div>
          <Link href="/motos" className="small muted">
            ← Volver al catálogo
          </Link>
          <div
            className={
              "bike-visual" +
              (hasPhoto ? " bike-visual--photo bike-visual--photo-hero" : "")
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
            <div className="tags">
              {moto.bestFor.map((x) => (
                <span className="tag" key={x}>
                  {x}
                </span>
              ))}
            </div>
            <p>{moto.shortDescription}</p>
            <h3>Ficha rápida</h3>
            <div
              className="grid"
              style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
            >
              {Object.entries(moto.specs).map(([k, v]) => (
                <div className="stat" key={k}>
                  <span className="small muted">{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside className="sticky-box">
          <span className="eyebrow">{moto.category}</span>
          <h1>
            {moto.brand} {moto.model} {moto.year}
          </h1>
          <p>{moto.shortDescription}</p>
          {moto.firstAnswer ? (
            <p className="first-answer" style={{ fontWeight: 600 }}>
              {moto.firstAnswer}
            </p>
          ) : null}
          {/*
            Bloque de precio: controlado por `moto.showPrice` (columna
            `show_price` en Directus, default false). Mientras la columna no
            exista o no se marque true por producto, esto no renderiza nada —
            mismo comportamiento visible que antes de este cambio.
          */}
          {moto.showPrice ? (
            <div className="stat-grid">
              <div className="stat stat--precio">
                <span className="small muted">Precio promoción</span>
                <PrecioContado moto={moto} />
              </div>
              <div className="stat">
                <span className="small muted">Desde</span>
                <strong>
                  {formatMXN(moto.monthlyFrom)}
                  <span className="price-suffix">/mes</span>
                </strong>
              </div>
              <div className="stat">
                <span className="small muted">Enganche sugerido</span>
                <strong>{formatMXN(moto.suggestedDownPayment)}</strong>
              </div>
            </div>
          ) : null}
          <FinvaCheckout
            price={cashPrice(moto)}
            suggestedDownPayment={moto.suggestedDownPayment}
            motorcycle={{
              id: moto.id,
              brand: moto.brand,
              model: moto.model,
              year: moto.year,
              slug,
              name: `${moto.brand} ${moto.model} ${moto.year}`.trim(),
              finvaMotorcycleId: moto.finvaMotorcycleId ?? null,
            }}
            purchaseUrl={moto.purchaseUrl || site.defaultPurchaseUrl}
          />
          <p className="shipping-note small muted">
            <span className="shipping-note__icon" aria-hidden>
              🚚
            </span>
            <span>
              Envío incluido en CDMX y área metropolitana. En el resto del país se
              recoge en agencia, con posibilidad de envío según disponibilidad.
            </span>
          </p>
        </aside>
      </div>
      {overrideHtml && (
        <section className="section">
          {/* Contenido editorial de marketing (CMS) — HTML ya saneado por renderDocHtml. */}
          <div className="container cms-page-body" style={{ maxWidth: 820 }} dangerouslySetInnerHTML={{ __html: overrideHtml }} />
        </section>
      )}
      <MotorcycleReviews reviews={reviews} />
    </main>
  );
}
