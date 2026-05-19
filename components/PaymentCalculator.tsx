'use client';

import { useMemo, useState } from 'react';
import { estimateMonthlyPayment, TERMS } from '@/lib/finance';
import { formatMXN } from '@/lib/catalog-format';
import { trackCalculatorInteraction } from '@/lib/gtm';
import { track } from '@/lib/analytics';
import { PurchaseUrlCta } from '@/components/PurchaseUrlCta';
import { normalizeOutboundUrl } from '@/lib/purchase-url';
import type { Motorcycle } from '@/types/motorcycle';

export function PaymentCalculator({
  price,
  suggestedDownPayment,
  motorcycleId,
  motorcycle,
  purchaseUrl,
}: {
  price: number;
  suggestedDownPayment: number;
  motorcycleId: string;
  motorcycle?: Pick<Motorcycle, 'slug' | 'brand' | 'model' | 'price' | 'promoPrice'>;
  purchaseUrl?: string | null;
}) {
  const [downPayment, setDownPayment] = useState(suggestedDownPayment);
  const [months, setMonths] = useState(24);
  const monthly = useMemo(() => estimateMonthlyPayment(price, downPayment, months), [price, downPayment, months]);
  const agentHref = normalizeOutboundUrl(purchaseUrl);

  function pushCalculatorGTM(nextDown: number, nextMonths: number) {
    if (!motorcycle) return;
    trackCalculatorInteraction({
      motorcycle,
      downPayment: nextDown,
      termMonths: nextMonths,
      estimatedMonthlyPayment: estimateMonthlyPayment(price, nextDown, nextMonths),
    });
  }

  return (
    <div className="calculator">
      <h3>Calcula tu mensualidad</h3>
      <p className="small">Estimación rápida para empezar tu proceso de compra. Sujeto a aprobación, disponibilidad y precio final.</p>
      <div className="range-row">
        <label className="small muted">Enganche: <strong>{formatMXN(downPayment)}</strong></label>
        <input
          type="range"
          min={Math.round(price * 0.1)}
          max={Math.round(price * 0.6)}
          step={1000}
          value={downPayment}
          onChange={(e) => {
            setDownPayment(Number(e.target.value));
            track('use_calculator', { motorcycleId });
          }}
          onMouseUp={(e) => pushCalculatorGTM(Number(e.currentTarget.value), months)}
          onTouchEnd={(e) => pushCalculatorGTM(Number(e.currentTarget.value), months)}
        />
      </div>
      <div className="range-row">
        <label className="small muted">Plazo</label>
        <select
          className="select"
          value={months}
          onChange={(e) => {
            const nextMonths = Number(e.target.value);
            setMonths(nextMonths);
            track('use_calculator', { motorcycleId });
            pushCalculatorGTM(downPayment, nextMonths);
          }}
        >
          {TERMS.map((term) => (
            <option value={term} key={term}>
              {term} meses
            </option>
          ))}
        </select>
      </div>
      <div className="stat">
        <span className="small muted">Pago estimado</span>
        <strong>
          {formatMXN(monthly)}
          <span className="price-suffix">/mes</span>
        </strong>
      </div>
      {agentHref ? (
        <div className="calculator-cta">
          <PurchaseUrlCta href={agentHref} motorcycleId={motorcycleId} variant="green">
            Cotizar crédito con Finva
          </PurchaseUrlCta>
        </div>
      ) : (
        <p className="small muted calculator-cta-missing">
          Enlace de compra no disponible para este modelo.
        </p>
      )}
    </div>
  );
}
