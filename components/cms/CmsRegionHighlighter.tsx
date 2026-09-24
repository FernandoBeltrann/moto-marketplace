'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Puente Studio <-> página real, SOLO activo con ?cmsPreview=1 (la misma
 * condición que ya gatea el override de contenido — ver lib/cms/overrides.ts).
 * El Studio (app/studio/page.tsx) embebe esta página en un <iframe> y le
 * manda `postMessage({ type: 'cms-highlight', regionId })` cuando el usuario
 * enfoca el campo de un componente editable; acá resaltamos y hacemos scroll
 * al elemento real `[data-cms-region="<regionId>"]` para que sea obvio a qué
 * parte de la página corresponde ese campo. No hace nada fuera de esa vista
 * previa embebida — cero costo/riesgo en producción normal.
 */
function Highlighter() {
  const sp = useSearchParams();
  const active = sp.get('cmsPreview') === '1';

  useEffect(() => {
    if (!active) return;
    let lastEl: HTMLElement | null = null;
    function clear() {
      if (lastEl) {
        lastEl.style.outline = '';
        lastEl.style.outlineOffset = '';
        lastEl = null;
      }
    }
    function onMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || typeof data !== 'object' || data.type !== 'cms-highlight') return;
      clear();
      const regionId = data.regionId as string | null;
      if (!regionId) return;
      const el = document.querySelector<HTMLElement>(`[data-cms-region="${CSS.escape(regionId)}"]`);
      if (!el) return;
      el.style.outline = '3px solid #dd5a10';
      el.style.outlineOffset = '2px';
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      lastEl = el;
    }
    window.addEventListener('message', onMessage);
    // Avisa al padre (Studio) que ya está listo para recibir highlights.
    window.parent?.postMessage({ type: 'cms-preview-ready' }, '*');
    return () => {
      window.removeEventListener('message', onMessage);
      clear();
    };
  }, [active]);

  return null;
}

export function CmsRegionHighlighter() {
  return (
    <Suspense fallback={null}>
      <Highlighter />
    </Suspense>
  );
}
