'use client';

import { useState } from 'react';
import type { QuoteContext } from '@/types/credit-application';
import { CreditApplicationWizard } from './CreditApplicationWizard';

type Props = {
  motorcycleId: string;
  motorcycleSlug: string;
  motorcycleName: string;
  motorcycleBrand: string;
  motorcycleModel: string;
  motorcycleYear: number;
  motorcyclePrice: number;
  finvaMotorcycleId: number | null;
  quote: QuoteContext;
};

/**
 * Envoltura del wizard para incrustarlo en un iframe (sin el calculador).
 * Al cancelar avisamos al contenedor padre vía postMessage para que cierre
 * su modal; como fallback (cuando no hay iframe) reiniciamos el flujo.
 */
export function EmbeddedCreditApplication(props: Props) {
  const [instance, setInstance] = useState(0);

  function handleCancel() {
    if (typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage({ type: 'motoclick:credit-app:close' }, '*');
    }
    setInstance((n) => n + 1);
  }

  return <CreditApplicationWizard key={instance} {...props} onCancel={handleCancel} />;
}
