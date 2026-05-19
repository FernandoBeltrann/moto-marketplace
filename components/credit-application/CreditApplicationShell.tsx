'use client';

import { useState } from 'react';
import type { QuoteContext } from '@/types/credit-application';
import { PaymentCalculator } from '@/components/PaymentCalculator';
import { CreditApplicationWizard } from './CreditApplicationWizard';
import { track } from '@/lib/analytics';

export function CreditApplicationShell({
  price,
  suggestedDownPayment,
  motorcycleId,
  motorcycleName,
  purchaseUrl,
}: {
  price: number;
  suggestedDownPayment: number;
  motorcycleId: string;
  motorcycleName: string;
  purchaseUrl?: string | null;
}) {
  const [mode, setMode] = useState<'calculator' | 'wizard'>('calculator');
  const [quote, setQuote] = useState<QuoteContext | null>(null);

  if (mode === 'wizard' && quote) {
    return (
      <CreditApplicationWizard
        motorcycleId={motorcycleId}
        motorcycleName={motorcycleName}
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
      purchaseUrl={purchaseUrl}
      onStartApplication={(nextQuote) => {
        track('credit_app_start', { motorcycleId, motorcycleName });
        setQuote(nextQuote);
        setMode('wizard');
      }}
    />
  );
}
