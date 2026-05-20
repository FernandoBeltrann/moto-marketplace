'use client';

import { useEffect } from 'react';
import { initMercadoPago, StatusScreen } from '@mercadopago/sdk-react';
import { firePurchaseConversion } from '@/lib/finva/conversion';

let mpInitialized = false;

export function MercadoPagoStatusScreen({
  paymentId,
  publicKey,
  returnUrl,
  status,
  conversionValue,
  motorcycleId,
}: {
  paymentId: string;
  publicKey: string;
  returnUrl?: string;
  /** `approved` | `in_process` | `pending` | `rejected` — viene de la URL. */
  status?: string;
  /** Monto cobrado en tarjeta (cardChargedPrice). Se manda como `value` a Google Ads. */
  conversionValue?: number;
  motorcycleId?: string;
}) {
  useEffect(() => {
    if (!publicKey || mpInitialized) return;
    initMercadoPago(publicKey, { locale: 'es-MX' });
    mpInitialized = true;
  }, [publicKey]);

  useEffect(() => {
    if (status !== 'approved') return;
    if (!paymentId || !conversionValue || conversionValue <= 0) return;
    firePurchaseConversion(conversionValue, paymentId, {
      motorcycle_id: motorcycleId,
    });
  }, [status, paymentId, conversionValue, motorcycleId]);

  if (!publicKey) {
    return (
      <p className="small muted">
        Falta <code>NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY</code> para renderizar el estado del pago.
      </p>
    );
  }

  return (
    <StatusScreen
      initialization={{ paymentId }}
      customization={{
        visual: { showExternalReference: true },
        backUrls: returnUrl ? { return: returnUrl, error: returnUrl } : undefined,
      }}
      onError={(err) => {
        console.error('[mercadopago] status-screen error:', err);
      }}
    />
  );
}
