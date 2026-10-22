'use client';

import Script from 'next/script';
import { SDK_SRC } from '@/lib/finva/brick';

/**
 * Carga `finva.js` en TODAS las páginas, no solo donde monta el brick (FIN-6).
 *
 * El SDK guarda al cargar los params de campaña de la URL (`utm_*`, `gclid`,
 * `gbraid`, `wbraid`, `fbclid`) en `sessionStorage` y los reenvía al iframe al
 * montar el brick. Hasta ahora lo cargábamos *lazy* en la página de la moto
 * (`loadFinvaSdk`), así que la captura corría sobre una URL ya limpia: el
 * anuncio aterriza en la home, el visitante navega al modelo y el router ya
 * tiró el query. Medido en PostHog (Package, 30 días): 740 `credit_app_start`
 * con `gclid` (Google aterriza directo en la moto) vs 13 con `utm_*` y 8 con
 * `fbclid` (Meta aterriza en la home).
 *
 * `loadFinvaSdk` sigue funcionando igual: encuentra este `<script>` por `src` y
 * se cuelga de su `load`, o resuelve de inmediato si `window.Finva` ya existe.
 * Si la carga falla quitamos la etiqueta para que el brick cree la suya y no se
 * quede esperando un `load` que nunca llega. ~6 KB gzip; no monta nada solo.
 */
export function FinvaSdkPreload() {
  return (
    <Script
      src={SDK_SRC}
      strategy="afterInteractive"
      onError={() => {
        document.querySelector(`script[src="${SDK_SRC}"]`)?.remove();
      }}
    />
  );
}
