/**
 * Cliente Mercado Pago para uso exclusivo en el servidor (Route Handlers, RSC, scripts).
 *
 * En LOCAL se inyecta un `MERCADOPAGO_ACCESS_TOKEN` con prefijo `TEST-…` (sandbox),
 * y en PRODUCCIÓN un token `APP_USR-…`. Los nombres de variables son los mismos:
 * la única diferencia entre entornos es el VALOR.
 *
 * Docs:
 *   - Bricks overview: https://www.mercadopago.com.mx/developers/es/docs/checkout-bricks/overview
 *   - Payments API:    https://www.mercadopago.com.mx/developers/es/reference/payments/_payments/post
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

let cachedClient: MercadoPagoConfig | null = null;

export function getMercadoPagoAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error(
      'Falta MERCADOPAGO_ACCESS_TOKEN. Define una credencial TEST-… en .env.local o APP_USR-… en producción.'
    );
  }
  return token;
}

export function getMercadoPagoPublicKey(): string {
  return process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.trim() ?? '';
}

export function getMercadoPagoClient(): MercadoPagoConfig {
  if (cachedClient) return cachedClient;
  cachedClient = new MercadoPagoConfig({
    accessToken: getMercadoPagoAccessToken(),
    options: {
      /** Permite reintentos seguros desde el cliente (Brick puede reenviar onSubmit). */
      timeout: 10_000,
    },
  });
  return cachedClient;
}

export function getPaymentResource() {
  return new Payment(getMercadoPagoClient());
}

export function getPreferenceResource() {
  return new Preference(getMercadoPagoClient());
}

/**
 * Topes de mensualidades configurables por entorno.
 * Débito → siempre 1 pago.
 * Crédito → hasta `NEXT_PUBLIC_MERCADOPAGO_MAX_INSTALLMENTS` (default 24), con intereses del emisor.
 */
export function getMaxInstallments(): number {
  const raw = process.env.NEXT_PUBLIC_MERCADOPAGO_MAX_INSTALLMENTS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 24;
  return Math.min(Math.max(Math.floor(n), 1), 24);
}

/** Statement descriptor (≤22 chars) que verá el comprador en su estado de cuenta. */
export function getStatementDescriptor(): string | undefined {
  const raw = process.env.MERCADOPAGO_STATEMENT_DESCRIPTOR?.trim();
  if (!raw) return undefined;
  return raw.slice(0, 22);
}

/** Clave secreta para validar firma de Webhooks (panel: Webhooks → Clave secreta). */
export function getMercadoPagoWebhookSecret(): string {
  return process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() ?? '';
}

/**
 * Verifica la cabecera `x-signature` que Mercado Pago envía en cada webhook.
 *
 * Template oficial (https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks#editor_1):
 *   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 *
 *   - `data.id`        → valor del query string `?data.id=…` (en minúsculas)
 *   - `x-request-id`   → cabecera HTTP del mismo request
 *   - `ts`             → fragmento `ts=` dentro de `x-signature: ts=…,v1=…`
 *   - El hash esperado (`v1`) es HMAC-SHA256 del template, llave = webhook secret.
 *
 * Devuelve `true` si la firma es válida o si no hay secreto configurado en
 * desarrollo (NODE_ENV !== 'production'); siempre falla en producción sin secreto.
 */
export function verifyMercadoPagoWebhookSignature(input: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): { ok: boolean; reason?: string } {
  const secret = getMercadoPagoWebhookSecret();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, reason: 'missing_secret' };
    }
    console.warn(
      '[mercadopago] MERCADOPAGO_WEBHOOK_SECRET no configurado; saltando validación en dev.'
    );
    return { ok: true };
  }

  if (!input.xSignature) return { ok: false, reason: 'missing_signature_header' };

  const parts = input.xSignature.split(',').reduce<Record<string, string>>((acc, kv) => {
    const [k, v] = kv.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return { ok: false, reason: 'malformed_signature_header' };

  const dataId = (input.dataId ?? '').toLowerCase();
  const requestId = input.xRequestId ?? '';
  const template = `id:${dataId};request-id:${requestId};ts:${ts};`;

  const expected = createHmac('sha256', secret).update(template).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(v1, 'utf8');
  if (a.length !== b.length) return { ok: false, reason: 'signature_mismatch' };
  const ok = timingSafeEqual(a, b);
  return ok ? { ok: true } : { ok: false, reason: 'signature_mismatch' };
}
