'use client';

import { useEffect } from 'react';
import { initMercadoPago, StatusScreen } from '@mercadopago/sdk-react';

let mpInitialized = false;

export function MercadoPagoStatusScreen({
  paymentId,
  publicKey,
  returnUrl,
}: {
  paymentId: string;
  publicKey: string;
  returnUrl?: string;
}) {
  useEffect(() => {
    if (!publicKey || mpInitialized) return;
    initMercadoPago(publicKey, { locale: 'es-MX' });
    mpInitialized = true;
  }, [publicKey]);

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
