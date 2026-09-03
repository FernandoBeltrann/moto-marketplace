'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { site } from '@/lib/site';
import {
  buildFinvaCallbacks,
  buildFinvaProduct,
  createFinvaInstance,
  DEFAULT_MONTHS,
  merchantAnalytics,
  safeContainerId,
  type FinvaBrickController,
  type FinvaBrickCommonProps,
} from '@/lib/finva/brick';

/**
 * Botón que abre el checkout de Finva en una ventana modal (overlay que el SDK
 * inyecta en `body`). Pensado para tarjetas de catálogo: el brick se crea perezosamente
 * en el primer click y se reutiliza en los siguientes (no se re-crea cada vez).
 *
 * El contenedor `#finva-modal-mount-…` es un div oculto que el SDK requiere como
 * destino; el overlay visible lo appendea el SDK en `document.body`.
 */
export function FinvaCheckoutModal({
  price,
  suggestedDownPayment,
  months = DEFAULT_MONTHS,
  motorcycle,
  purchaseUrl,
  className = 'btn green full',
  children = 'Consíguela ya',
}: FinvaBrickCommonProps & {
  /** Clases del botón disparador. */
  className?: string;
  /** Etiqueta del botón disparador. */
  children?: ReactNode;
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const containerId = safeContainerId('finva-modal-mount', useId());

  // El brick se crea una sola vez y se reutiliza en los siguientes clicks.
  const controllerRef = useRef<FinvaBrickController | null>(null);

  // Limpia el overlay del body si la tarjeta se desmonta con el modal abierto.
  useEffect(() => {
    return () => {
      controllerRef.current?.unmount();
      controllerRef.current = null;
    };
  }, []);

  function open() {
    // Si ya está creado, solo lo abrimos (reutilización).
    if (controllerRef.current) {
      controllerRef.current.open();
      return;
    }

    setStatus('loading');
    createFinvaInstance()
      .then((finva) => {
        const controller = finva.bricks().create('application', containerId, {
          initialization: {
            mode: 'modal',
            product: buildFinvaProduct(motorcycle, price, suggestedDownPayment, months),
          },
          customization: { theme: 'light', primaryColor: '#37b24d' },
          analytics: merchantAnalytics(),
          callbacks: buildFinvaCallbacks(motorcycle, price),
        });
        controllerRef.current = controller;
        controller.open();
        setStatus('idle');
      })
      .catch((error) => {
        console.error('[FinvaCheckoutModal]', error);
        setStatus('error');
        // Fallback: mandamos al cliente al portal / agente si lo hay.
        if (purchaseUrl) window.open(purchaseUrl, '_blank', 'noopener,noreferrer');
      });
  }

  if (status === 'error') {
    const whatsappHref = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
      `Hola, quiero comprar la ${motorcycle.name}.`
    )}`;
    return (
      <div className="finva-modal-fallback">
        <a className="btn green full" href={whatsappHref} target="_blank" rel="noopener noreferrer">
          Escríbanos por WhatsApp
        </a>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={open}
        disabled={status === 'loading'}
        aria-busy={status === 'loading'}
      >
        {status === 'loading' ? 'Cargando…' : children}
      </button>
      {/* Contenedor destino del brick (oculto; el overlay lo inyecta el SDK en body). */}
      <div id={containerId} aria-hidden="true" style={{ display: 'none' }} />
    </>
  );
}