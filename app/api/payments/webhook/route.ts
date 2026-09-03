/**
 * Webhook de notificaciones de Mercado Pago (tópico `payment`).
 *
 *   Panel: https://www.mercadopago.com.mx/developers/panel/app → Webhooks
 *   Docs:  https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks
 *
 *   1. Valida la firma `x-signature` con `MERCADOPAGO_WEBHOOK_SECRET`.
 *   2. Hace `Payment.get({id})` para obtener el estado autoritativo.
 *   3. Actualiza SÓLO columnas de estado (no toca datos del comprador).
 *   4. Si el pago quedó `approved`, dispara los correos UNA SOLA VEZ (la marca
 *      `notifications_sent_at` evita duplicados con /api/payments/process).
 *
 * Regla de oro: responder 2xx RÁPIDO en eventos válidos para evitar reintentos
 * innecesarios; devolver 5xx en errores transitorios para que MP reintente.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  getPaymentResource,
  verifyMercadoPagoWebhookSignature,
} from '@/lib/mercadopago';
import { getPostHogClient, shutdownPostHog } from '@/lib/posthog-server';
import { notifyApprovedPaymentOnce, updatePaymentStatusFromWebhook } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type WebhookBody = {
  action?: string;
  api_version?: string;
  type?: string;
  /** Legacy IPN field. */
  topic?: string;
  data?: { id?: string | number };
  /** Legacy IPN field. */
  resource?: string;
  date_created?: string;
  user_id?: string | number;
  live_mode?: boolean;
};

function extractDataId(req: NextRequest, body: WebhookBody): string | null {
  const fromQuery = req.nextUrl.searchParams.get('data.id') ?? req.nextUrl.searchParams.get('id');
  if (fromQuery) return fromQuery;
  const fromBody = body?.data?.id;
  if (fromBody != null) return String(fromBody);
  if (body?.resource) {
    const parts = String(body.resource).split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : null;
  }
  return null;
}

function topicFrom(req: NextRequest, body: WebhookBody): string {
  return (
    req.nextUrl.searchParams.get('type') ||
    req.nextUrl.searchParams.get('topic') ||
    body?.type ||
    body?.topic ||
    ''
  ).toLowerCase();
}

export async function POST(req: NextRequest) {
  let body: WebhookBody = {};
  try {
    body = (await req.json()) as WebhookBody;
  } catch {
    /** Algunos eventos legacy llegan sin body JSON; no rompe la verificación. */
  }

  const dataId = extractDataId(req, body);
  const topic = topicFrom(req, body);

  const sig = verifyMercadoPagoWebhookSignature({
    xSignature: req.headers.get('x-signature'),
    xRequestId: req.headers.get('x-request-id'),
    dataId,
  });
  if (!sig.ok) {
    console.warn('[mercadopago] webhook signature rejected:', sig.reason, {
      topic,
      dataId,
    });
    return NextResponse.json({ ok: false, error: sig.reason }, { status: 401 });
  }

  if (!dataId || !topic) {
    /** ACK silencioso: MP envía pings vacíos al configurar la URL. */
    return NextResponse.json({ ok: true, ignored: 'missing_id_or_topic' });
  }

  if (topic !== 'payment') {
    /** Sólo procesamos pagos por ahora; otros tópicos los aceptamos sin acción. */
    return NextResponse.json({ ok: true, ignored: topic });
  }

  try {
    const payment = await getPaymentResource().get({ id: dataId });
    const snapshot = payment as unknown as Record<string, unknown>;

    await updatePaymentStatusFromWebhook(String(snapshot.id ?? dataId), snapshot);

    if ((snapshot.status as string | undefined) === 'approved') {
      await notifyApprovedPaymentOnce(String(snapshot.id ?? dataId));
    }

    const posthog = getPostHogClient();
    if (posthog) {
      const metadata = (snapshot.metadata ?? {}) as Record<string, unknown>;
      const distinctId =
        ((snapshot.payer as { email?: string } | undefined)?.email) ||
        (snapshot.external_reference as string | undefined) ||
        String(snapshot.id ?? 'anonymous');
      posthog.capture({
        distinctId,
        event: 'payment_status_updated',
        properties: {
          provider: 'mercadopago',
          payment_id: snapshot.id,
          status: snapshot.status,
          status_detail: snapshot.status_detail,
          payment_type_id: snapshot.payment_type_id,
          payment_method_id: snapshot.payment_method_id,
          installments: snapshot.installments,
          transaction_amount: snapshot.transaction_amount,
          external_reference: snapshot.external_reference,
          motorcycle_id: metadata.motorcycle_id,
          live_mode: snapshot.live_mode,
        },
      });
      await shutdownPostHog();
    }

    return NextResponse.json({ ok: true, id: snapshot.id, status: snapshot.status });
  } catch (error: unknown) {
    console.error('[mercadopago] webhook processing failed:', error);
    /**
     * Devolvemos 500 a propósito para que Mercado Pago reintente.
     * (No usamos 2xx ante errores transitorios para no perder el evento.)
     */
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'webhook_failed' },
      { status: 500 }
    );
  }
}

/**
 * Mercado Pago a veces hace un GET de verificación al configurar la URL en el panel.
 * Aceptamos 200 OK aunque no haya body.
 */
export async function GET() {
  return NextResponse.json({ ok: true, service: 'mercadopago-webhook' });
}
