'use client';

import { useRef, useState } from 'react';
import type { QuoteContext } from '@/types/credit-application';
import { PaymentCalculator } from '@/components/PaymentCalculator';
import { CreditApplicationWizard } from './CreditApplicationWizard';
import { track, trackApplicationStarted } from '@/lib/analytics';
import type { Motorcycle } from '@/types/motorcycle';

export function CreditApplicationShell({
  price,
  suggestedDownPayment,
  motorcycleId,
  motorcycleSlug,
  motorcycleName,
  motorcycleBrand,
  motorcycleModel,
  motorcycleYear,
  finvaMotorcycleId,
  purchaseUrl,
  motorcycle,
}: {
  price: number;
  suggestedDownPayment: number;
  motorcycleId: string;
  motorcycleSlug: string;
  motorcycleName: string;
  motorcycleBrand: string;
  motorcycleModel: string;
  motorcycleYear: number;
  finvaMotorcycleId: number | null;
  purchaseUrl?: string | null;
  motorcycle: Pick<Motorcycle, 'slug' | 'brand' | 'model' | 'year' | 'price'>;
}) {
  const [mode, setMode] = useState<'calculator' | 'wizard'>('calculator');
  const [quote, setQuote] = useState<QuoteContext | null>(null);
  const startedTracked = useRef(false);

  if (mode === 'wizard' && quote) {
    return (
      <CreditApplicationWizard
        motorcycleId={motorcycleId}
        motorcycleSlug={motorcycleSlug}
        motorcycleName={motorcycleName}
        motorcycleBrand={motorcycleBrand}
        motorcycleModel={motorcycleModel}
        motorcycleYear={motorcycleYear}
        motorcyclePrice={price}
        finvaMotorcycleId={finvaMotorcycleId}
        quote={quote}
        onCancel={() => setMode('calculator')}
      />
    );
  }

  return (
    <PaymentCalculator
      price={price}
      suggestedDownPayment={suggestedDownPayment}
      motorcycleId={motorcycleId}
      motorcycle={motorcycle}
      purchaseUrl={purchaseUrl}
      onStartApplication={(nextQuote) => {
        if (!startedTracked.current) {
          startedTracked.current = true;
          trackApplicationStarted({
            motorcycleSlug,
            motorcycleBrand,
            motorcycleModel: `${motorcycleModel} ${motorcycleYear}`,
          });
        }
        track('credit_app_start', { motorcycleId, motorcycleName });
        setQuote(nextQuote);
        setMode('wizard');
      }}
    />
  );
}
