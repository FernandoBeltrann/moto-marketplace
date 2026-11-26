import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { CatalogClient } from '@/components/CatalogClient';
import { CatalogFallback } from '@/components/CatalogFallback';
import { FaqAccordion, type FaqItem } from '@/components/FaqAccordion';
import { ApplyCreditCta } from '@/components/ApplyCreditCta';
import { VideoModalCard } from '@/components/VideoModalCard';
import { YouTubeThumbnail } from '@/components/YouTubeThumbnail';
import { getMotorcycles } from '@/lib/catalog';
import { toApplyCreditMoto } from '@/lib/catalog-format';
import { buildMotosACreditoJsonLd } from '@/lib/motos-a-credito-jsonld';
import { site } from '@/lib/site';

export const revalidate = 120;

/**
 * Landing SEO/ads para la búsqueda "moto a crédito" (recomendación de content gap:
 * convierte barato en Ads y no rankeaba orgánicamente). El término va en title, H1,
 * meta description y en los textos de los enlaces internos que apuntan aquí.
 * Todo el contenido sale de lo que ya dice "Así funciona" — no prometer nada
 * (tasas, "sin buró", plazos) que no esté ahí.
 */
const PAGE_PATH = '/motos-a-credito';
const ASI_FUNCIONA_PATH = '/asi-funciona-comprar-tu-moto-a-credito-con-motoclick';
const PAGE_TITLE = 'Moto a crédito: motos nuevas en mensualidades';
const PAGE_DESCRIPTION =
  'Compra tu moto a crédito en línea: elige tu moto nueva, calcula tu mensualidad y te asignamos la financiera con más probabilidad de aprobarte.';

/** Video explicativo del hero: el mismo del home ("Cómo funciona MotoClick", 16:9). */
const VIDEO_ID = 'RlHX_EdgMkI';

const STEPS = [
  {
    id: 'selecciona',
    title: '1. Selecciona tu moto',
    text: 'Elige tu moto nueva del catálogo y calcula una mensualidad estimada antes de aplicar.',
  },
  {
    id: 'aplica',
    title: '2. Aplica en línea',
    text: 'Llenas la solicitud digital y autorizas la consulta de tu historial crediticio. Un agente Finva te contacta por WhatsApp.',
  },
  {
    id: 'aprueba',
    title: '3. Recibe tu aprobación',
    text: 'La respuesta tarda desde 3 minutos hasta 24 horas, según la financiera. Si te rechazan, buscamos otra opción.',
  },
  {
    id: 'estrena',
    title: '4. Estrena tu moto',
    text: 'Pagas el enganche (si aplica), firmas tu contrato y recoges tu moto en la agencia, normalmente de 1 a 10 días hábiles después de aprobado.',
  },
] as const;

const FAQS: FaqItem[] = [
  {
    id: 'como-funciona',
    question: '¿Cómo funciona comprar una moto a crédito con MotoClick?',
    answer:
      'Eliges tu moto, llenas una solicitud en línea y Finva evalúa tu perfil e historial crediticio para asignarte la financiera aliada con mayor probabilidad de aprobarte. Un agente Finva te acompaña por WhatsApp hasta la entrega en la agencia.',
  },
  {
    id: 'buro',
    question: '¿Puedo sacar una moto a crédito si estoy en buró de crédito?',
    answer:
      'Sí, es posible. Un historial negativo en el buró no descarta automáticamente tu solicitud: evaluamos tu perfil completo y buscamos la financiera con mayor probabilidad de aprobarte. Si no calificas directamente, existe la opción de sumar un aval.',
  },
  {
    id: 'sin-enganche',
    question: '¿Puedo comprar una moto a crédito sin enganche?',
    answer:
      'Sí, dependiendo de la financiera y de tu perfil. Si priorizas no dar enganche, se ajusta la tasa o el plazo; si buscas la tasa más baja, normalmente se pide más enganche y documentación. Cuéntanos qué te importa más (enganche, tasa o mensualidad) y buscamos la mejor combinación.',
  },
  {
    id: 'requisitos',
    question: '¿Qué requisitos piden para una moto a crédito?',
    answer:
      'Siempre se requiere tu INE. Según la financiera y tu perfil, también pueden pedir comprobante de ingresos de los últimos 3 meses, comprobante de domicilio, referencias y datos de empleo. Si trabajas por tu cuenta o eres repartidor, los estados de cuenta son el comprobante más aceptado, y hay financieras que no piden comprobante de ingresos.',
  },
  {
    id: 'tiempos',
    question: '¿Cuánto tardan en aprobarme y entregarme la moto?',
    answer:
      'La aprobación tarda desde 3 minutos hasta 24 horas, según la financiera; los bancos suelen tardar más que las financieras no bancarias. La entrega es de 1 a 10 días hábiles después de la aprobación, según la financiera y el inventario de la agencia.',
  },
  {
    id: 'financieras',
    question: '¿MotoClick es una financiera? ¿Con quién trabajan?',
    answer:
      'No. MotoClick es la plataforma de Finva para financiar tu moto: evaluamos tu perfil y te conectamos con una financiera aliada, como HeyBanco, Santander, BBVA, Atrato, Maxikash, CrediToGo o Galgo. La aprobación final y los términos del crédito los define la financiera.',
  },
];

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: `${site.url.replace(/\/$/, '')}${PAGE_PATH}` },
  // Sin esto heredaba el og:url del layout (el home) en todas las páginas.
  openGraph: {
    title: `${PAGE_TITLE} | ${site.name}`,
    description: PAGE_DESCRIPTION,
    type: 'website',
    url: `${site.url.replace(/\/$/, '')}${PAGE_PATH}`,
    images: [{ url: site.logoPath }],
  },
};

/**
 * Página única del catálogo: el menú ya no tiene "Motos"; /motos redirige aquí
 * (next.config.js), conservando los filtros del buscador del home (?brand=…&budget=…&category=…).
 * Orden: hero → catálogo (lo que busca el tráfico de Ads) → pasos, requisitos y FAQ (lo que
 * necesita Google para entender que esta página responde "moto a crédito").
 */
export default async function MotosACreditoPage() {
  const motos = await getMotorcycles();
  const applyMotos = motos.map(toApplyCreditMoto);
  const brands = Array.from(new Set(motos.map((m) => m.brand))).sort();
  const brandList =
    brands.length > 1 ? `${brands.slice(0, -1).join(', ')} y ${brands[brands.length - 1]}` : brands[0] ?? '';

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildMotosACreditoJsonLd(
              motos,
              FAQS.map((f) => ({ question: f.question, answer: f.answer })),
              PAGE_TITLE,
              PAGE_DESCRIPTION,
            ),
          ).replace(/</g, '\\u003c'),
        }}
      />
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">Financiamiento gestionado por Finva</span>
            <h1>Tu moto a crédito, en mensualidades.</h1>
            <p>
              Compara motos, calcula una mensualidad estimada y aplica en línea. Finva evalúa tu perfil y te
              asigna la financiera aliada con mayor probabilidad de aprobarte.
            </p>
            <a className="btn green" href="#inventario">Ver motos disponibles</a>
          </div>
          <div className="hero-card">
            <VideoModalCard
              thumbnail={<YouTubeThumbnail videoId={VIDEO_ID} />}
              location="motos_a_credito_hero"
              videoId={VIDEO_ID}
              orientation="horizontal"
              applyMotos={applyMotos}
            />
            <div className="notice" style={{ marginTop: 16 }}>
              <strong>Qué necesitas normalmente:</strong> INE, comprobante de domicilio, comprobante de ingresos y
              autorización para consultar tu historial crediticio. Cada financiera pide algo distinto.
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="inventario" style={{ scrollMarginTop: 80 }}>
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Elige tu moto a crédito</h2>
              <p>
                Todo el inventario disponible{brandList ? `: ${brandList}` : ''}. Filtra por marca, precio o uso.
              </p>
            </div>
          </div>
          <Suspense fallback={<CatalogFallback motos={motos} />}>
            <CatalogClient motos={motos} />
          </Suspense>
        </div>
      </section>

      <section className="section" id="como-funciona">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Cómo sacar tu moto a crédito en 4 pasos</h2>
              <p>De elegir tu moto a recogerla en la agencia, con un agente Finva contigo por WhatsApp.</p>
            </div>
          </div>
          <div className="two-col">
            {STEPS.map((step) => (
              <article className="card" key={step.id}>
                <div className="card-body">
                  <h3 style={{ marginTop: 0 }}>
                    <Link href={`${ASI_FUNCIONA_PATH}#${step.id}`}>{step.title}</Link>
                  </h3>
                  <p className="muted" style={{ marginBottom: 0 }}>{step.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="preguntas-frecuentes">
        <div className="container" style={{ maxWidth: 720 }}>
          <h2>Preguntas frecuentes sobre motos a crédito</h2>
          <FaqAccordion items={FAQS} />
          <div className="cta-box">
            <ApplyCreditCta motos={applyMotos} />
            <div className="cta-box__sub">Sin compromiso · Un agente Finva te acompaña desde el primer paso</div>
          </div>
          <p className="small muted">
            ¿Quieres ver el proceso completo?{' '}
            <Link href={ASI_FUNCIONA_PATH}>Así funciona comprar tu moto a crédito</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
