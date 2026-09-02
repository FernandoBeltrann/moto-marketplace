'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { site } from '@/lib/site';
import {
  buildFinvaCallbacks,
  buildFinvaProduct,
  createFinvaInstance,
  DEFAULT_MONTHS,
  merchantAnalytics,
  safeContainerId,
  type FinvaBrickCommonProps,
  type FinvaBrickController,
} from '@/lib/finva/brick';

/**
 * Checkout brick de Finva (crédito con buró, contado y tarjeta) montado dentro
 * de la página de producto. El SDK inyecta un iframe aislado apuntando a la app
 * de Finva: los datos del cliente no pasan por este servidor y el comercio se
 * identifica solo por el `origin` de esta página (no hay llaves en el browser).
 */
export function FinvaCheckout({
  price,
  suggestedDownPayment,
  months = DEFAULT_MONTHS,
  motorcycle,
  purchaseUrl,
}: FinvaBrickCommonProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const containerId = safeContainerId('finva-checkout', useId());

  // Los callbacks leen siempre los props actuales sin re-montar el brick.
  const propsRef = useRef({ price, motorcycle });
  propsRef.current = { price, motorcycle };

  useEffect(() => {
    let cancelled = false;
    let controller: FinvaBrickController | null = null;

    createFinvaInstance()
      .then((finva) => {
        if (cancelled) return;
        controller = finva.bricks().create('application', containerId, {
          initialization: {
            mode: 'embedded',
            product: buildFinvaProduct(motorcycle, price, suggestedDownPayment, months),
          },
          customization: { theme: 'light', primaryColor: '#37b24d' },
          analytics: merchantAnalytics(),
          callbacks: buildFinvaCallbacks(motorcycle, price, () => {
            if (cancelled) return;
            setStatus('ready');
            track('view_product', { motorcycleId: motorcycle.id, tab: 'finva_brick' });
          }),
        });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('[FinvaCheckout]', error);
        setStatus('error');
      });

    return () => {
      cancelled = true;
      controller?.unmount();
      controller = null;
    };
  }, [
    containerId,
    price,
    suggestedDownPayment,
    months,
    motorcycle,
  ]);

  const whatsappHref = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
    `Hola, quiero comprar la ${motorcycle.name}.`
  )}`;

  return (
    <section className="finva-checkout" aria-label="Compra tu moto">
      {status === 'error' ? (
        <div className="finva-checkout__fallback">
          <p>
            No pudimos cargar el formulario de compra. Vuelve a intentarlo o escríbenos y lo
            hacemos contigo.
          </p>
          <div className="finva-checkout__fallback-actions">
            {purchaseUrl ? (
              <a className="btn green" href={purchaseUrl} target="_blank" rel="noopener noreferrer">
                Iniciar compra con un agente
              </a>
            ) : null}
            <a className="btn light" href={whatsappHref} target="_blank" rel="noopener noreferrer">
              Escribir por WhatsApp
            </a>
          </div>
        </div>
      ) : (
        <>
          <div id={containerId} className="finva-checkout__mount" />
          {status === 'loading' ? (
            <div className="finva-checkout__loading" role="status">
              <span className="finva-checkout__spinner" aria-hidden />
              <p className="small muted">Cargando opciones de compra…</p>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}