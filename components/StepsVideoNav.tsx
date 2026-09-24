'use client';

import { useState } from 'react';

type StepId = 'selecciona' | 'aplica' | 'aprueba' | 'estrena';

type Step = {
  id: StepId;
  label: string;
  name: string;
  videoTitle: string;
  /**
   * URL de ejemplo — reemplazar por el video real de este paso cuando esté
   * listo. Mientras tanto solo se muestra el placeholder (botón de play +
   * título), no se intenta reproducir nada.
   */
  videoUrl: string;
};

const STEPS: Step[] = [
  {
    id: 'selecciona',
    label: 'Paso 1',
    name: 'Selecciona',
    videoTitle: 'Selecciona tu moto',
    videoUrl: 'https://example.com/videos/motoclick-selecciona.mp4',
  },
  {
    id: 'aplica',
    label: 'Paso 2',
    name: 'Aplica',
    videoTitle: 'Aplica en minutos',
    videoUrl: 'https://example.com/videos/motoclick-aplica.mp4',
  },
  {
    id: 'aprueba',
    label: 'Paso 3',
    name: 'Aprueba',
    videoTitle: 'Qué pasa cuando te aprueban',
    videoUrl: 'https://example.com/videos/motoclick-aprueba.mp4',
  },
  {
    id: 'estrena',
    label: 'Paso 4',
    name: 'Estrena',
    videoTitle: 'El día de la entrega',
    videoUrl: 'https://example.com/videos/motoclick-estrena.mp4',
  },
];

/**
 * Navegación de pasos en pills + video de ejemplo debajo. Solo controla qué
 * video se muestra (placeholder por ahora, ver `videoUrl` de cada paso); el
 * contenido real de cada paso (acordeón de preguntas, para SEO) sigue
 * completo y visible en el HTML sin depender de este componente ni de JS.
 */
export function StepsVideoNav() {
  const [active, setActive] = useState<StepId>('selecciona');
  const activeStep = STEPS.find((s) => s.id === active) ?? STEPS[0];

  return (
    <div className="steps-video-nav">
      <div className="steps-video-nav__pills" role="tablist" aria-label="Pasos para comprar tu moto a crédito">
        {STEPS.map((step) => {
          const isActive = step.id === active;
          return (
            <button
              key={step.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={
                'steps-video-nav__pill' + (isActive ? ' steps-video-nav__pill--active' : '')
              }
              onClick={() => setActive(step.id)}
            >
              <span className="steps-video-nav__pill-label">{step.label}</span>
              <strong className="steps-video-nav__pill-name">{step.name}</strong>
            </button>
          );
        })}
      </div>

      <div className="steps-video-nav__player" role="tabpanel" aria-live="polite">
        <div className="steps-video-nav__play-btn" aria-hidden="true">
          ▶
        </div>
        <strong className="steps-video-nav__video-title">Video: {activeStep.videoTitle}</strong>
        <span className="small muted steps-video-nav__video-note">En producción — placeholder</span>
      </div>
    </div>
  );
}
