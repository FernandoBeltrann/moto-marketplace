'use client';

import { site } from '@/lib/site';
import { formatMXN } from '@/lib/catalog-format';
import type { QuoteContext } from '@/types/credit-application';
import { track } from '@/lib/analytics';

export function StepOffer({
  motorcycleName,
  applicationId,
  quote,
}: {
  motorcycleName: string;
  applicationId: string;
  quote: QuoteContext;
}) {
  const text = encodeURIComponent(
    `Hola, quiero continuar mi solicitud de crédito para ${motorcycleName}. ` +
      `Enganche ${formatMXN(quote.downPayment)}, plazo ${quote.months} meses, pago estimado ${formatMXN(quote.monthly)}/mes. ` +
      `Folio: ${applicationId}`
  );
  const href = `https://wa.me/${site.whatsapp}?text=${text}`;

  return (
    <div className="wizard-offer">
      
      <div className="offer-card">
        <span className="offer-card__badge">Proceso asistido con IA</span>
        <h4 className="offer-card__title">Continúa con Finva por WhatsApp</h4>
        <p className="offer-card__text small">
          Tu asesorte dara a conocer la mejor opción de financiamiento.
        </p>
        <p className="offer-card__phone small">{site.whatsappDisplay}</p>
        <a
          className="btn offer-card__cta"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('click_whatsapp', { source: 'credit_app_step6', motorcycleName, applicationId })}
        >
          Continuar por WhatsApp
        </a>
      </div>
    </div>
  );
}
