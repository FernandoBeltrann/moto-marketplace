'use client';

import { useEffect } from 'react';
import { site } from '@/lib/site';
import { formatMXN } from '@/lib/catalog-format';
import type { QuoteContext } from '@/types/credit-application';
import { track } from '@/lib/analytics';
import { fireFinanceConversion } from '@/lib/finva/conversion';

function buildWaNumber(phone?: string | null): string {
  if (!phone) return site.whatsapp;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return `521${digits}`;
  if (digits.length === 12 && digits.startsWith('52')) return `521${digits.slice(2)}`;
  if (digits.length === 13 && digits.startsWith('521')) return digits;
  return digits || site.whatsapp;
}

function buildAgentDisplay(phone?: string | null): string {
  if (!phone) return site.whatsappDisplay;
  const digits = String(phone).replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return phone;
  return `+52 ${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
}

export function StepOffer({
  motorcycleId,
  motorcycleName,
  motorcyclePrice,
  solicitudId,
  agentName,
  agentPhone,
  quote,
}: {
  motorcycleId: string;
  motorcycleName: string;
  motorcyclePrice: number;
  solicitudId: number | string;
  agentName?: string | null;
  agentPhone?: string | null;
  quote: QuoteContext;
}) {
  useEffect(() => {
    fireFinanceConversion(motorcyclePrice, solicitudId, {
      motorcycle_id: motorcycleId,
      motorcycle_name: motorcycleName,
    });
  }, [motorcyclePrice, solicitudId, motorcycleId, motorcycleName]);

  const text = encodeURIComponent(
    `Hola${agentName ? ` ${agentName}` : ''}, quiero continuar mi solicitud de crédito para ${motorcycleName}. ` +
      `Enganche ${formatMXN(quote.downPayment)}, plazo ${quote.months} meses, pago estimado ${formatMXN(
        quote.monthly
      )}/mes. ` +
      `Solicitud Finva #${solicitudId}.`
  );
  const waNumber = buildWaNumber(agentPhone);
  const href = `https://wa.me/${waNumber}?text=${text}`;
  const display = buildAgentDisplay(agentPhone);

  return (
    <div className="wizard-offer">
      <div className="offer-card">
        <span className="offer-card__badge">Proceso asistido con IA</span>
        <h4 className="offer-card__title">
          {agentName ? `${agentName} te está esperando en WhatsApp` : 'Continúa con tu Agente Finva por WhatsApp'}
        </h4>
        <p className="offer-card__text small">
          Tu asesor te dará a conocer la mejor opción de financiamiento.
        </p>
        <p className="offer-card__phone small">{display}</p>
        <p className="small muted">
          Solicitud <strong>#{solicitudId}</strong>
        </p>
        <a
          className="btn offer-card__cta"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            track('click_whatsapp', {
              source: 'credit_app_step6',
              motorcycleName,
              motorcycleId,
              solicitudId,
            })
          }
        >
          Continuar por WhatsApp
        </a>
      </div>
    </div>
  );
}
