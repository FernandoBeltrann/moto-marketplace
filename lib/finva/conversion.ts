/**
 * Disparadores de conversiones de Google Ads.
 * Llama a `gtag('event', 'conversion', { send_to, value, currency, transaction_id })`
 * y un push paralelo a `dataLayer` para que GTM pueda observar el evento.
 *
 * Idempotente por `transaction_id` (sessionStorage) — se evita doble conversión
 * cuando el componente que llama re-monta (ej. status screen tras refresh).
 */

const FIRED_KEY_PREFIX = 'gads:fired:';

function getSendTo(): string | null {
  const adsId = (process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '').trim();
  const label = (process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL || '').trim();
  if (!adsId || !label) return null;
  return `${adsId}/${label}`;
}

function alreadyFired(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(FIRED_KEY_PREFIX + key) === '1';
  } catch {
    return false;
  }
}

function markFired(key: string) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(FIRED_KEY_PREFIX + key, '1');
  } catch {
    /* quota */
  }
}

function dataLayerPush(eventName: string, payload: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...payload });
}

function fireConversion(opts: {
  eventName: string;
  value: number;
  transactionId: string;
  currency?: string;
  extra?: Record<string, unknown>;
}) {
  if (typeof window === 'undefined') return;
  const { eventName, value, transactionId, currency = 'MXN', extra = {} } = opts;
  if (!transactionId) return;
  if (alreadyFired(transactionId)) return;

  const sendTo = getSendTo();
  const payload = { value, currency, transaction_id: transactionId, ...extra };

  if (sendTo) {
    window.gtag?.('event', 'conversion', { send_to: sendTo, ...payload });
  }
  dataLayerPush(eventName, payload);
  markFired(transactionId);
}

/** Conversión cuando se crea una solicitud de financiamiento Finva. */
export function fireFinanceConversion(value: number, solicitudId: string | number, extra?: Record<string, unknown>) {
  fireConversion({
    eventName: 'solicitud_created',
    value,
    transactionId: String(solicitudId),
    extra: { type: 'financing', ...(extra || {}) },
  });
}

/** Conversión cuando un pago con tarjeta queda aprobado en Mercado Pago. */
export function firePurchaseConversion(value: number, paymentId: string | number, extra?: Record<string, unknown>) {
  fireConversion({
    eventName: 'purchase_completed',
    value,
    transactionId: String(paymentId),
    extra: { type: 'card_payment', ...(extra || {}) },
  });
}
