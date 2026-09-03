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
  return {
    title: `${moto.brand} ${moto.model} ${moto.year} a crédito`,
    description: `Consulta precio, mensualidad estimada y opciones de compra para ${moto.brand} ${moto.model} ${moto.year}. Financiamiento gestionado por Finva.`,
    alternates: { canonical: `${site.url}${productPath(moto)}` },
    openGraph: {
      title: `${moto.brand} ${moto.model} ${moto.year}`,
      description: moto.shortDescription,
      type: "website",
      url: `${site.url}${productPath(moto)}`,
      images: moto.imageUrl
        ? [{ url: absoluteAssetUrl(moto.imageUrl) }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${moto.brand} ${moto.model} ${moto.year}`,
      description: moto.shortDescription,
      images: moto.imageUrl ? [absoluteAssetUrl(moto.imageUrl)] : undefined,
    },
  };
}

/** Íconos de la fila de garantías: mismo trazo (1.75) para que se lean como un set. */
function TrustIcon({ name }: { name: "truck" | "shield" | "bolt" }) {
  const paths = {
    truck: (
      <>
        <path d="M3 7.5h9.5v8H3z" />
        <path d="M12.5 10.5H16l3 3v2h-6.5z" />
        <circle cx="6.5" cy="16.5" r="1.8" />
        <circle cx="16" cy="16.5" r="1.8" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3.5l6.5 2.4v5c0 4-2.7 7.3-6.5 8.6-3.8-1.3-6.5-4.6-6.5-8.6v-5z" />
        <path d="M9.3 11.8l1.9 1.9 3.6-3.7" />
      </>
    ),
    bolt: <path d="M13.2 3.5L6.4 13h4.6l-.9 7.5L17.6 11H13z" />,
  };
  return (
    <svg
      className="trust-item__icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}

export default async function ProductPage({ params }: Props) {
  const { brand, slug } = await params;
  const moto = await getMotorcycleByPath(brand, slug);
  if (!moto) notFound();

  const reviews = await getMotorcycleReviews(moto.id);
  const jsonLd = buildProductJsonLd(moto, { reviews });

  const hasPhoto = Boolean(moto.imageUrl);
  const specs = Object.entries(moto.specs);

  return (
    <main className="product-hero">
      <MotorcycleViewTracker motorcycle={moto} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container">
        <nav className="breadcrumb" aria-label="Ruta de navegación">
          <Link href="/motos">Catálogo</Link>
          <span className="breadcrumb__sep" aria-hidden>
            /
          </span>
          <Link href={`/motos?brand=${encodeURIComponent(moto.brand)}`}>
            {moto.brand}
          </Link>
          <span className="breadcrumb__sep" aria-hidden>
            /
          </span>
          <span className="breadcrumb__current" aria-current="page">
            {moto.model}
          </span>
        </nav>
      </div>

      <div className="container product-grid">
        <div className="product-media-col">
          <figure
            className={
              "bike-visual product-figure" +
              (hasPhoto ? " bike-visual--photo bike-visual--photo-hero" : "")
            }
          >
            {hasPhoto && moto.imageUrl ? (
              <Image
                src={moto.imageUrl}
                alt={`${moto.brand} ${moto.model} ${moto.year} vista lateral`}
                fill
                className="bike-visual__img"
                sizes="(max-width: 900px) 100vw, 560px"
                priority
              />
            ) : (
              <div className="bike-line" />
            )}
          </figure>

          <section className="product-section" aria-labelledby="para-quien">
            <h2 id="para-quien" className="product-section__title">
              ¿Para quién es buena?
            </h2>
            <p className="product-section__lead">{moto.shortDescription}</p>
            <ul className="chip-row">
              {moto.bestFor.map((x) => (
                <li className="chip" key={x}>
                  {x}
                </li>
              ))}
            </ul>
          </section>

          <section className="product-section" aria-labelledby="ficha">
            <h2 id="ficha" className="product-section__title">
              Ficha rápida
            </h2>
            <dl className="spec-list">
              {specs.map(([k, v]) => (
                <div className="spec-row" key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
        <aside className="sticky-box product-buy">
          <header className="product-head">
            <p className="product-head__meta">
              <span className="product-head__brand">{moto.brand}</span>
              <span className="product-head__dot" aria-hidden>
                ·
              </span>
              <span>{moto.year}</span>
              <span className="product-head__dot" aria-hidden>
                ·
              </span>
              <span>{moto.category}</span>
            </p>
            <h1 className="product-head__title">
              {moto.model}{" "}
              <span className="product-head__year">{moto.year}</span>
            </h1>
          </header>

          {/* Respuesta directa/corta para AEO (columna `first_answer`, opcional). */}
          {moto.firstAnswer ? (
            <p className="first-answer">{moto.firstAnswer}</p>
          ) : null}

          {/*
            Bloque de precio: controlado por `moto.showPrice` (columna
            `show_price` en Directus, default false). Mientras la columna no
            exista o no se marque true por producto, esto no renderiza nada —
            mismo comportamiento visible que antes de este cambio.
          */}
          {moto.showPrice ? (
            <div className="price-block">
              <div className="price-block__main">
                <span className="price-block__label">Precio de contado</span>
                <PrecioContado moto={moto} />
              </div>
              <dl className="price-block__meta">
                <div>
                  <dt>Desde</dt>
                  <dd>
                    {formatMXN(moto.monthlyFrom)}
                    <span className="price-suffix">/mes</span>
                  </dd>
                </div>
                <div>
                  <dt>Enganche sugerido</dt>
                  <dd>{formatMXN(moto.suggestedDownPayment)}</dd>
                </div>
              </dl>
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

          <ul className="trust-row">
            <li className="trust-item">
              <TrustIcon name="truck" />
              <span className="trust-item__label">Envío incluido en CDMX</span>
              <span className="trust-item__detail">
                En el resto del país se recoge en agencia, con envío según
                disponibilidad.
              </span>
            </li>
            <li className="trust-item">
              <TrustIcon name="shield" />
              <span className="trust-item__label">Garantía de agencia</span>
              <span className="trust-item__detail">
                Moto nueva, con factura original a tu nombre.
              </span>
            </li>
            <li className="trust-item">
              <TrustIcon name="bolt" />
              <span className="trust-item__label">Respuesta en minutos</span>
              <span className="trust-item__detail">
                Solicitas tu crédito sin salir de esta página.
              </span>
            </li>
          </ul>
        </aside>
      </div>

      <MotorcycleReviews reviews={reviews} />
    </main>
  );
}
