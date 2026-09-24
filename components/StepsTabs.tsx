'use client';

import { useEffect, useState, type ReactNode } from 'react';

type StepId = 'selecciona' | 'aplica' | 'aprueba' | 'estrena';

const STEP_IDS: StepId[] = ['selecciona', 'aplica', 'aprueba', 'estrena'];

type StepMeta = { id: StepId; label: string; name: string };

const STEPS: StepMeta[] = [
  { id: 'selecciona', label: 'Paso 1', name: 'Selecciona' },
  { id: 'aplica', label: 'Paso 2', name: 'Aplica' },
  { id: 'aprueba', label: 'Paso 3', name: 'Aprueba' },
  { id: 'estrena', label: 'Paso 4', name: 'Estrena' },
];

/**
 * Pills de pasos + el contenido de cada paso, todo en un solo componente
 * porque comparten el mismo estado de "paso activo".
 *
 * IMPORTANTE para SEO/rastreo (nota del prototipo de referencia): los 4
 * `panels` se reciben ya armados (acordeón de FAQ y demás contenido) y
 * los 4 se montan SIEMPRE en el DOM — nunca se agregan o quitan según el
 * paso activo. Lo único que cambia al hacer click es una clase CSS
 * (`steps-tabs__panel--active`, ver globals.css) que hace `display: block`
 * en el panel activo y `display: none` en los otros tres. Un buscador que
 * lee el HTML servido (sin ejecutar el click) ve el texto completo de los
 * 4 pasos igual, solo que 3 quedan con `display:none` — el mismo patrón
 * que cualquier UI de tabs accesible.
 */
export function StepsTabs({ panels }: { panels: Record<StepId, ReactNode> }) {
  const [active, setActive] = useState<StepId>('selecciona');

  // Soporte para enlaces directos tipo .../asi-funciona-...#aprueba: al
  // cargar (o si el hash cambia estando ya en la página) activamos el panel
  // correspondiente y hacemos scroll hasta él — si no, ese paso se quedaría
  // con `display:none` y el navegador no tendría nada visible a donde
  // saltar aunque la URL sí traiga el "#paso".
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1);
      if (!STEP_IDS.includes(hash as StepId)) return;
      setActive(hash as StepId);
      requestAnimationFrame(() => {
        document.getElementById(`panel-${hash}`)?.scrollIntoView({ block: 'start' });
      });
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  return (
    <div className="steps-tabs">
      <div className="steps-tabs__pills" role="tablist" aria-label="Pasos para comprar tu moto a crédito">
        {STEPS.map((step) => {
          const isActive = step.id === active;
          return (
            <button
              key={step.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${step.id}`}
              className={'steps-tabs__pill' + (isActive ? ' steps-tabs__pill--active' : '')}
              onClick={() => setActive(step.id)}
            >
              <span className="steps-tabs__pill-label">{step.label}</span>
              <strong className="steps-tabs__pill-name">{step.name}</strong>
            </button>
          );
        })}
      </div>

      {STEPS.map((step) => (
        <div
          key={step.id}
          id={`panel-${step.id}`}
          role="tabpanel"
          className={'steps-tabs__panel' + (step.id === active ? ' steps-tabs__panel--active' : '')}
        >
          {panels[step.id]}
        </div>
      ))}
    </div>
  );
}
