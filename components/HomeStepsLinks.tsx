'use client';

import Link from 'next/link';
import { trackHomeStepClick } from '@/lib/analytics';

/** Página "Así funciona"; cada paso abre su pestaña con el hash (#selecciona, #aplica…, ver StepsTabs). */
const ASI_FUNCIONA_PATH = '/asi-funciona-comprar-tu-moto-a-credito-con-motoclick';

const STEPS = [
  { id: 'selecciona', label: 'Selecciona tu moto' },
  { id: 'aplica', label: 'Aplica' },
  { id: 'aprueba', label: 'Aprueba' },
  { id: 'estrena', label: 'Estrena' },
] as const;

/** Los 4 pasos bajo la foto del hero del home; cada uno lleva a su paso en "Así funciona". */
export function HomeStepsLinks() {
  return (
    <ol className="kpi-strip" aria-label="Cómo comprar tu moto en 4 pasos">
      {STEPS.map((step, i) => (
        <li className="kpi kpi--link" key={step.id}>
          <Link
            href={`${ASI_FUNCIONA_PATH}#${step.id}`}
            className="kpi__link"
            onClick={() => trackHomeStepClick({ step: step.id, position: i + 1 })}
          >
            <strong>{i + 1}</strong>
            <span className="small muted">{step.label}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
