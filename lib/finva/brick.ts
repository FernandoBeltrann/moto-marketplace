/**
 * Integración con el brick de checkout de Finva (SDK `finva.js`).
 *
 * El SDK inyecta un iframe aislado que apunta a la app de Finva: los datos del
 * cliente no pasan por este servidor y el comercio se identifica solo por el
 * `origin` de la página host (no hay llaves en el navegador).
 *
 * Aquí vive lo que comparten el brick embebido (`FinvaCheckout`) y el modal
 * (`FinvaCheckoutModal`): carga del SDK, tipos, analytics del comercio y los
 * callbacks de ciclo de vida con tracking ya cableado.
 */
import type { ReactNode } from 'react';
import { track } from '@/lib/analytics';
import { fireFinanceConversion } from '@/lib/finva/conversion';

/** Origen donde vive la app de Finva: sirve el SDK y el iframe del checkout. */
export const SDK_ORIGIN =
  process.env.NEXT_PUBLIC_FINVA_SDK_ORIGIN?.trim().replace(/\/$/, '') ||
  'https://stellar-energy-production-clientes.up.railway.app';
export const SDK_SRC = `${SDK_ORIGIN}/sdk/v1/finva.js`;

/** Plazo con el que arranca la calculadora del brick (igual que PaymentCalculator). */
export const DEFAULT_MONTHS = 24;

export type FinvaFlow = 'financed' | 'cash' | 'card';

export type FinvaProduct = {
  brand: string;
  model?: string;
  year?: number;
  slug?: string;
  price: number;
  /** El SDK hace `.trim()` sobre este campo: debe ser string, nunca number. */
  finvaMotorcycleId?: string;
  downPayment?: number;
  months?: number;
};

export type FinvaBrickOptions = {
  initialization: {
    mode?: 'embedded' | 'modal';
    product?: FinvaProduct;
    flow?: FinvaFlow;
    availableFlows?: FinvaFlow[];
    prefill?: { nombre?: string; telefono?: string; email?: string };
  };
  customization?: { theme?: 'light' | 'dark'; primaryColor?: string };
  analytics?: { metaPixelId?: string; googleAdsId?: string };
  callbacks?: {
    onReady?: () => void;
    onSubmit?: (data: unknown) => void;
    onApproved?: (solicitud: unknown) => void;
    onError?: (error: unknown) => void;
  };
};

export type FinvaBrickController = {
  unmount: () => void;
  open: () => void;
  close: () => void;
  update: (options: Partial<FinvaBrickOptions>) => void;
};

export type FinvaInstance = {
  bricks: () => {
    create: (
      type: 'application',
      containerId: string,
      options: FinvaBrickOptions
    ) => FinvaBrickController;
  };
};

/** Identidad mínima de la moto que necesita el brick. */
export type FinvaMotorcycle = {
  id: string;
  brand: string;
  model: string;
  year: number;
  slug: string;
  name: string;
  finvaMotorcycleId: number | null;
};

declare global {
  interface Window {
    Finva?: new (options?: { origin?: string; host?: string; locale?: string }) => FinvaInstance;
  }
}

/** Carga el SDK una sola vez por página, aunque se monten varios bricks. */
let sdkPromise: Promise<void> | null = null;

export function loadFinvaSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Finva: sin window.'));
  if (window.Finva) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);
    const script = existing ?? document.createElement('script');
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => {
        sdkPromise = null;
        reject(new Error(`Finva: no se pudo cargar el SDK desde ${SDK_SRC}`));
      },
      { once: true }
    );
    if (!existing) {
      script.src = SDK_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return sdkPromise;
}

/** Formato aceptado por el brick: `AW-XXXXXXX` o `AW-XXXXXXX/label`. */
const GOOGLE_ADS_ID_RE = /^AW-\d+(?:\/[A-Za-z0-9_-]+)?$/;

/**
 * IDs de tracking del comercio que el brick carga *dentro* del iframe.
 * Solo viajan props no sensibles (monto, paso, folio); nunca PII.
 */
export function merchantAnalytics(): FinvaBrickOptions['analytics'] {
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || undefined;
  const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() || '';
  const label = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL?.trim() || '';
  const candidate = adsId && label ? `${adsId}/${label}` : adsId;
  const googleAdsId = GOOGLE_ADS_ID_RE.test(candidate) ? candidate : undefined;

  if (!metaPixelId && !googleAdsId) return undefined;
  return { metaPixelId, googleAdsId };
}

/** El folio llega como string o como objeto según el flujo; lo normalizamos. */
function solicitudId(solicitud: unknown): string {
  if (typeof solicitud === 'string' || typeof solicitud === 'number') return String(solicitud);
  if (solicitud && typeof solicitud === 'object') {
    const raw = solicitud as Record<string, unknown>;
    const id = raw.id ?? raw.folio ?? raw.solicitudId;
    if (typeof id === 'string' || typeof id === 'number') return String(id);
  }
  return '';
}

/**
 * Construye el `product` que recibe el brick a partir de la moto + precio.
 * `finvaMotorcycleId` se convierte a string (el SDK hace `.trim()` sobre él).
 */
export function buildFinvaProduct(
  motorcycle: FinvaMotorcycle,
  price: number,
  suggestedDownPayment: number,
  months: number
): FinvaProduct {
  return {
    brand: motorcycle.brand,
    model: motorcycle.model,
    year: motorcycle.year,
    slug: motorcycle.slug,
    price,
    finvaMotorcycleId:
      motorcycle.finvaMotorcycleId != null ? String(motorcycle.finvaMotorcycleId) : undefined,
    downPayment: suggestedDownPayment,
    months,
  };
}

/**
 * Callbacks de ciclo de vida del brick con el tracking del marketplace cableado.
 * `onReady`/`onSubmit`/`onApproved` disparan eventos PostHog/Pixel/Ads; el
 * `onError` solo loggea. `onReadyExtra` permite que el componente reaccione
 * (ej. ocultar el spinner del embebido) sin reescribir los callbacks.
 */
export function buildFinvaCallbacks(
  motorcycle: FinvaMotorcycle,
  price: number,
  onReadyExtra?: () => void
): NonNullable<FinvaBrickOptions['callbacks']> {
  return {
    onReady: () => onReadyExtra?.(),
    onSubmit: () => {
      track('start_financing', {
        motorcycleId: motorcycle.id,
        provider: 'finva',
        method: 'brick',
      });
    },
    onApproved: (solicitud) => {
      const id = solicitudId(solicitud);
      track('credit_app_solicitud_created', {
        motorcycleId: motorcycle.id,
        provider: 'finva',
        solicitudId: id,
      });
      if (id) {
        fireFinanceConversion(price, id, {
          motorcycle_slug: motorcycle.slug,
          source: 'finva_brick',
        });
      }
    },
    onError: (error) => {
      console.error('[Finva] error del brick', error);
    },
  };
}

/** Crea una instancia de Finva una vez cargado el SDK. */
export async function createFinvaInstance(): Promise<FinvaInstance> {
  await loadFinvaSdk();
  const Finva = window.Finva;
  if (!Finva) throw new Error('Finva: el SDK cargó pero no expuso `window.Finva`.');
  return new Finva({ origin: SDK_ORIGIN, locale: 'es-MX' });
}

/** `useId()` trae `:` en los extremos; el SDK busca el contenedor por id. */
export function safeContainerId(prefix: string, reactId: string): string {
  return `${prefix}-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

/** Props comunes al brick embebido y al modal. */
export type FinvaBrickCommonProps = {
  /** Precio de contado (ya con promo aplicada). */
  price: number;
  suggestedDownPayment: number;
  months?: number;
  motorcycle: FinvaMotorcycle;
  /** CTA de respaldo si el SDK no carga (portal Finva / agente). */
  purchaseUrl?: string | null;
};

/** Tipo utilidad para slots de botones/etiquetas. */
export type Children = ReactNode;