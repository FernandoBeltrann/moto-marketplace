/**
 * Recibe el payload del Payment Brick (formData + datos del comprador) y crea
 * el pago en Mercado Pago. INSERTA la fila en `motoclick_payments` antes/después
 * y, si el pago queda `approved` de forma síncrona, dispara los correos.
 *
 * Reglas de negocio (replicadas en el servidor para no confiar en el cliente):
 *  - Débito (`debit_card`)  → `installments = 1`.
 *  - Crédito (`credit_card`) → `1 <= installments <= MAX_INSTALLMENTS` (default 24).
 *  - Monto cobrado === `cardChargedPrice(moto)` (precio + comisión MP, fallback a precio).
 *  - Comprador (nombre/email/teléfono) obligatorio.
 */
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  getMaxInstallments,
  getPaymentResource,
  getStatementDescriptor,
} from '@/lib/mercadopago';
import { cardChargedPrice, getMotorcycleByPath } from '@/lib/catalog';
import { site } from '@/lib/site';
import { notifyApprovedPaymentOnce, upsertPaymentRow } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BrickFormData = {
  token?: string;
  issuer_id?: string;
  payment_method_id?: string;
  transaction_amount?: number;
  installments?: number;
  payer?: {
    email?: string;
    identification?: { type?: string; number?: string };
  };
};

type BuyerPayload = {
  fullName?: string;
  email?: string;
  phone?: string;
};

type ProcessPaymentBody = {
  formData: BrickFormData;
  selectedPaymentMethod?: string;
  motorcycle: { brand: string; slug: string };
  buyer?: BuyerPayload;
};

const ALLOWED_PAYMENT_TYPES = new Set(['credit_card', 'debit_card']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateBuyer(buyer: BuyerPayload | undefined): { ok: true; buyer: { fullName: string; email: string; phone: string } } | { ok: false; error: string } {
  const fullName = (buyer?.fullName ?? '').trim();
  const email = (buyer?.email ?? '').trim().toLowerCase();
  const phone = (buyer?.phone ?? '').trim();
  if (fullName.length < 3) return { ok: false, error: 'buyer_full_name_required' };
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'buyer_email_invalid' };
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return { ok: false, error: 'buyer_phone_invalid' };
  return { ok: true, buyer: { fullName, email, phone } };
}

export async function POST(req: NextRequest) {
  let body: ProcessPaymentBody;
  try {
    body = (await req.json()) as ProcessPaymentBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const { formData, selectedPaymentMethod, motorcycle } = body ?? {};

  if (!selectedPaymentMethod || !ALLOWED_PAYMENT_TYPES.has(selectedPaymentMethod)) {
    return NextResponse.json(
      { ok: false, error: 'payment_method_not_allowed' },
      { status: 400 }
    );
  }
  if (!formData?.token || !formData.payment_method_id) {
    return NextResponse.json({ ok: false, error: 'missing_card_token' }, { status: 400 });
  }
  if (!motorcycle?.brand || !motorcycle?.slug) {
    return NextResponse.json({ ok: false, error: 'missing_motorcycle' }, { status: 400 });
  }

  const buyerCheck = validateBuyer(body.buyer);
  if (!buyerCheck.ok) {
    return NextResponse.json({ ok: false, error: buyerCheck.error }, { status: 400 });
  }
  const buyer = buyerCheck.buyer;

  const moto = await getMotorcycleByPath(motorcycle.brand, motorcycle.slug);
  if (!moto) {
    return NextResponse.json({ ok: false, error: 'motorcycle_not_found' }, { status: 404 });
  }

  // El monto cobrado en tarjeta usa `card_price` (precio + comisión MP). Si la
  // columna está vacía hace fallback a `cashPrice`.
  const expectedAmount = cardChargedPrice(moto);
  const clientAmount = Number(formData.transaction_amount);
  if (!Number.isFinite(clientAmount) || Math.round(clientAmount) !== Math.round(expectedAmount)) {
    return NextResponse.json(
      { ok: false, error: 'amount_mismatch', expected: expectedAmount },
      { status: 400 }
    );
  }

  const maxInstallments = getMaxInstallments();
  let installments = Number(formData.installments);
  if (selectedPaymentMethod === 'debit_card') {
    installments = 1;
  } else if (
    !Number.isFinite(installments) ||
    installments < 1 ||
    installments > maxInstallments
  ) {
    return NextResponse.json(
      { ok: false, error: 'installments_out_of_range', max: maxInstallments },
      { status: 400 }
    );
  }

  const motorcycleName = `${moto.brand} ${moto.model} ${moto.year}`.trim();
  const externalReference = `moto_${moto.id}_${Date.now()}`;

  try {
    const payment = getPaymentResource();
    const idempotencyKey = randomUUID();
    const statementDescriptor = getStatementDescriptor();

    const result = await payment.create({
      body: {
        transaction_amount: expectedAmount,
        token: formData.token,
        description: motorcycleName,
        installments,
        payment_method_id: formData.payment_method_id,
        issuer_id: formData.issuer_id ? Number(formData.issuer_id) : undefined,
        payer: {
          email: buyer.email || formData.payer?.email,
          first_name: buyer.fullName.split(' ')[0],
          last_name: buyer.fullName.split(' ').slice(1).join(' ') || undefined,
          identification: formData.payer?.identification?.type
            ? {
                type: formData.payer.identification.type,
                number: formData.payer.identification.number ?? '',
              }
            : undefined,
        },
        external_reference: externalReference,
        statement_descriptor: statementDescriptor,
        notification_url: process.env.MERCADOPAGO_WEBHOOK_URL || undefined,
        metadata: {
          motorcycle_id: moto.id,
          motorcycle_brand: moto.brand,
          motorcycle_model: moto.model,
          motorcycle_year: moto.year,
          buyer_full_name: buyer.fullName,
          buyer_phone: buyer.phone,
          site_url: site.url,
        },
        additional_info: {
          items: [
            {
              id: moto.id,
              title: motorcycleName,
              description: moto.shortDescription?.slice(0, 250),
              quantity: 1,
              unit_price: expectedAmount,
              category_id: 'vehicles',
            },
          ],
          payer: {
            first_name: buyer.fullName.split(' ')[0],
            last_name: buyer.fullName.split(' ').slice(1).join(' ') || undefined,
            phone: { area_code: '52', number: buyer.phone.replace(/\D/g, '').slice(-10) },
          },
        },
      },
      requestOptions: { idempotencyKey },
    });

    const paymentId = String(result.id);
    const snapshot = result as unknown as Record<string, unknown>;

    await upsertPaymentRow({
      id: paymentId,
      status: (snapshot.status as string | undefined) ?? null,
      status_detail: (snapshot.status_detail as string | undefined) ?? null,
      payment_type_id: (snapshot.payment_type_id as string | undefined) ?? null,
      payment_method_id:
        (snapshot.payment_method_id as string | undefined) ?? formData.payment_method_id ?? null,
      installments,
      transaction_amount: expectedAmount,
      external_reference: externalReference,
      buyer,
      motorcycle_id: moto.id,
      motorcycle_name: motorcycleName,
      metadata: (snapshot.metadata as Record<string, unknown> | undefined) ?? null,
      live_mode: (snapshot.live_mode as boolean | undefined) ?? null,
      raw: snapshot,
    });

    if ((snapshot.status as string | undefined) === 'approved') {
      /** Idempotente: marca `notifications_sent_at` antes de enviar. */
      await notifyApprovedPaymentOnce(paymentId);
    }

    return NextResponse.json({
      ok: true,
      id: result.id,
      status: result.status,
      status_detail: result.status_detail,
      external_reference: externalReference,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'payment_failed';
    console.error('[mercadopago] payment.create failed:', error);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
