import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CatalogClient } from '@/components/CatalogClient';
import { VideoModalCard } from '@/components/VideoModalCard';
import { YouTubeThumbnail } from '@/components/YouTubeThumbnail';
import { getMotorcycles } from '@/lib/catalog';
import { toApplyCreditMoto } from '@/lib/catalog-format';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Motos a crédito',
  description:
    'Todas las motos nuevas disponibles para comprar a crédito. Filtra por marca, precio o uso, calcula tu mensualidad estimada y aplica en línea con financiamiento gestionado por Finva.',
};

/** Video explicativo del hero: el mismo del home ("Cómo funciona MotoClick", 16:9). */
const VIDEO_ID = 'RlHX_EdgMkI';

/**
 * Página única del catálogo: el menú ya no tiene "Motos"; /motos redirige aquí
 * (next.config.js), conservando los filtros del buscador del home (?brand=…&budget=…&category=…).
 */
export default async function MotosACreditoPage() {
  const motos = await getMotorcycles();
  const applyMotos = motos.map(toApplyCreditMoto);

  return (
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">Motos a crédito</span>
            <h1>Compra tu moto en mensualidades.</h1>
            <p>
              Compara opciones, calcula un pago estimado y empieza tu proceso. El análisis y seguimiento de
              financiamiento se gestionan con Finva.
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
              <strong>Qué necesitas normalmente:</strong> identificación, comprobante de domicilio, comprobante de
              ingresos y autorización para evaluación crediticia cuando aplique.
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="inventario" style={{ scrollMarginTop: 80 }}>
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Motos disponibles a crédito</h2>
              <p>Todo el inventario disponible. Filtra por marca, precio o uso.</p>
            </div>
          </div>
          <Suspense fallback={<p className="small muted">Cargando catálogo…</p>}>
            <CatalogClient motos={motos} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
