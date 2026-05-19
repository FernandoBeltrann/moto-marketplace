/**
 * Acceso al snapshot de pagos en Supabase y envío de correos transaccionales.
 *
 * - `upsertPaymentRow`           → llama /api/payments/process al CREAR el pago
 *   (incluye buyer + datos básicos), de forma que la fila exista aunque el
 *   webhook todavía no haya llegado.
 * - `updatePaymentStatusFromWebhook` → llama /api/payments/webhook; sólo toca
 *   columnas de estado para no sobreescribir los datos del comprador.
 * - `notifyApprovedPaymentOnce`  → idempotente, envía los 2 correos y marca
 *   `notifications_sent_at` para que el segundo origen (process o webhook)
 *   no duplique el envío.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import {
  sendPurchaseClientEmail,
  sendPurchaseInternalEmail,
  type PurchaseEmailPayload,
} from '@/lib/email';
import { site } from '@/lib/site';

export type BuyerInput = {
  fullName: string;
  email: string;
  phone: string;
};

function paymentsTable(): string {
  return process.env.SUPABASE_PAYMENTS_TABLE || 'motoclick_payments';
}

export function getServiceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type UpsertInput = {
  id: string;
  status?: string | null;
  status_detail?: string | null;
  payment_type_id?: string | null;
  payment_method_id?: string | null;
  installments?: number | null;
  transaction_amount?: number | null;
  external_reference?: string | null;
  buyer?: BuyerInput;
  payer_email?: string | null;
  motorcycle_id?: string | null;
  motorcycle_name?: string | null;
  metadata?: Record<string, unknown> | null;
  live_mode?: boolean | null;
  raw?: Record<string, unknown> | null;
};

/** Crea/actualiza la fila al momento de crear el pago en Mercado Pago. */
export async function upsertPaymentRow(input: UpsertInput): Promise<void> {
  const supabase = getServiceSupabase();
  if (!supabase) {
    console.warn('[payments] Supabase no configurado; saltando persistencia.', {
      id: input.id,
    });
    return;
  }
  const row: Record<string, unknown> = {
    id: input.id,
    status: input.status ?? null,
    status_detail: input.status_detail ?? null,
    payment_type_id: input.payment_type_id ?? null,
    payment_method_id: input.payment_method_id ?? null,
    installments: input.installments ?? null,
    transaction_amount: input.transaction_amount ?? null,
    external_reference: input.external_reference ?? null,
    payer_email: input.payer_email ?? input.buyer?.email ?? null,
    motorcycle_id: input.motorcycle_id ?? null,
    motorcycle_name: input.motorcycle_name ?? null,
    metadata: input.metadata ?? null,
    live_mode: input.live_mode ?? null,
    raw: input.raw ?? null,
    updated_at: new Date().toISOString(),
  };
  if (input.buyer) {
    row.buyer_full_name = input.buyer.fullName;
    row.buyer_email = input.buyer.email;
    row.buyer_phone = input.buyer.phone;
  }
  const { error } = await supabase.from(paymentsTable()).upsert(row, { onConflict: 'id' });
  if (error) console.error('[payments] upsert failed:', error);
}

/** Sólo actualiza los campos de estado; nunca toca buyer_* ni motorcycle_*. */
export async function updatePaymentStatusFromWebhook(
  paymentId: string,
  snapshot: Record<string, unknown>
): Promise<void> {
  const supabase = getServiceSupabase();
  if (!supabase) return;
  const row: Record<string, unknown> = {
    id: paymentId,
    status: snapshot.status ?? null,
    status_detail: snapshot.status_detail ?? null,
    payment_type_id: snapshot.payment_type_id ?? null,
    payment_method_id: snapshot.payment_method_id ?? null,
    installments: snapshot.installments ?? null,
    transaction_amount: snapshot.transaction_amount ?? null,
    external_reference: snapshot.external_reference ?? null,
    payer_email:
      (snapshot.payer as { email?: string } | undefined)?.email ?? null,
    metadata: snapshot.metadata ?? null,
    live_mode: snapshot.live_mode ?? null,
    raw: snapshot,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from(paymentsTable()).upsert(row, { onConflict: 'id' });
  if (error) console.error('[payments] webhook upsert failed:', error);
}

function buildWhatsAppUrl(buyer: BuyerInput, motorcycleName?: string | null): string {
  const text = encodeURIComponent(
    `Hola, soy ${buyer.fullName}. Pagué mi ${motorcycleName ?? 'moto'} en ${site.name} y quiero coordinar la entrega.`
  );
  return `https://wa.me/${site.whatsapp}?text=${text}`;
}

/**
 * Envía los dos correos UNA SOLA VEZ por payment id. Idempotente: la columna
 * `notifications_sent_at` evita que tanto /process como /webhook disparen
 * correos duplicados si MP confirma el pago de forma síncrona.
 */
export async function notifyApprovedPaymentOnce(paymentId: string): Promise<void> {
  const supabase = getServiceSupabase();
  if (!supabase) {
    console.warn('[payments] Supabase no configurado; no se pueden enviar correos.');
    return;
  }

  const { data, error } = await supabase
    .from(paymentsTable())
    .select(
      'id, status, transaction_amount, installments, payment_method_id, payment_type_id, external_reference, buyer_full_name, buyer_email, buyer_phone, motorcycle_id, motorcycle_name, notifications_sent_at'
    )
    .eq('id', paymentId)
    .maybeSingle();

  if (error) {
    console.error('[payments] notify select failed:', error);
    return;
  }
  if (!data) return;
  if (data.status !== 'approved') return;
  if (data.notifications_sent_at) return;
  if (!data.buyer_email || !data.buyer_full_name) {
    console.warn('[payments] approved payment without buyer info; skipping email.', {
      paymentId,
    });
    return;
  }

  const buyer: BuyerInput = {
    fullName: String(data.buyer_full_name),
    email: String(data.buyer_email),
    phone: String(data.buyer_phone ?? ''),
  };
  const payload: PurchaseEmailPayload = {
    paymentId: String(data.id),
    amount: Number(data.transaction_amount ?? 0),
    installments: data.installments == null ? null : Number(data.installments),
    paymentMethod:
      [data.payment_method_id, data.payment_type_id].filter(Boolean).join(' · ') || null,
    motorcycleName: data.motorcycle_name ?? null,
    motorcycleId: data.motorcycle_id ?? null,
    externalReference: data.external_reference ?? null,
    buyerFullName: buyer.fullName,
    buyerEmail: buyer.email,
    buyerPhone: buyer.phone,
    whatsappUrl: buildWhatsAppUrl(buyer, data.motorcycle_name ?? null),
    whatsappDisplay: site.whatsappDisplay,
  };

  /** Marcamos primero la fila para evitar carrera entre process y webhook. */
  const sentAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from(paymentsTable())
    .update({ notifications_sent_at: sentAt })
    .eq('id', paymentId)
    .is('notifications_sent_at', null)
    .select('id')
    .maybeSingle();
  if (claimError) {
    console.error('[payments] claim notifications failed:', claimError);
    return;
  }
  if (!claimed) return;

  await Promise.allSettled([
    sendPurchaseInternalEmail(payload),
    sendPurchaseClientEmail(payload),
  ]);
}
