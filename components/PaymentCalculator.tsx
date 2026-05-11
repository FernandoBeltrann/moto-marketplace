'use client';

import { useMemo, useState } from 'react';
import { estimateMonthlyPayment, TERMS } from '@/lib/finance';
import { formatMXN } from '@/lib/catalog';
import { track } from '@/lib/analytics';

export function PaymentCalculator({ price, suggestedDownPayment, motorcycleId }: { price: number; suggestedDownPayment: number; motorcycleId: string }) {
  const [downPayment, setDownPayment] = useState(suggestedDownPayment);
  const [months, setMonths] = useState(24);
  const monthly = useMemo(() => estimateMonthlyPayment(price, downPayment, months), [price, downPayment, months]);

  return (
    <div className="calculator">
      <h3>Calcula tu mensualidad</h3>
      <p className="small">Estimación rápida para ayudar al usuario a avanzar. Ajusta tasa/plazos en <code>lib/finance.ts</code>.</p>
      <div className="range-row">
        <label className="small muted">Enganche: <strong>{formatMXN(downPayment)}</strong></label>
        <input type="range" min={Math.round(price * 0.1)} max={Math.round(price * 0.6)} step={1000} value={downPayment} onChange={(e) => { setDownPayment(Number(e.target.value)); track('use_calculator', { motorcycleId }); }} />
      </div>
      <div className="range-row">
        <label className="small muted">Plazo</label>
        <select className="select" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
          {TERMS.map((term) => <option value={term} key={term}>{term} meses</option>)}
        </select>
      </div>
      <div className="stat">
        <span className="small muted">Pago estimado</span>
        <strong>
          {formatMXN(monthly)}
          <span className="price-suffix">/mes</span>
        </strong>
      </div>
      <p className="small muted">Sujeto a aprobación, condiciones de financiera, disponibilidad, precio final y perfil crediticio.</p>
    </div>
  );
}
