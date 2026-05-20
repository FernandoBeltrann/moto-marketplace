/**
 * Captura el lead inicial. Llama a Finva:
 *   1) GET /get_next_finva_user (asigna asesor)
 *   2) POST /unknown-client (crea/actualiza el lead unknown con holding=motoclick)
 *
 * Devuelve un `serverState` con `applicationId` (UUID local), `finvaUserId`.
 * Si Finva no está configurado en .env, hace fallback a stub local para que el
 * flujo de UI siga funcionando en dev.
 */
import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  isFinvaConfigured,
  logApplicationPayload,
  stubError,
  stubOk,
} from '@/lib/credit-application/server';
import { getHolding, getNextFinvaUser, unknownClient } from '@/lib/finva/client';
import type { CreditApplicationServerState } from '@/types/credit-application';

type StartBody = {
  motorcycleId: string;
  motorcycleName: string;
  motorcycleBrand: string;
  motorcyclePrice: number;
  finvaMotorcycleId: number | null;
  quote: { price: number; downPayment: number; months: number; monthly: number };
  holdingPageUrl?: string;
  utm?: Record<string, string | undefined>;
};

export async function POST(req: NextRequest) {
  let body: StartBody;
  try {
    body = (await req.json()) as StartBody;
  } catch {
    return stubError('invalid_json');
  }
  if (!body?.motorcycleId || !body?.quote) {
    return stubError('motorcycleId y quote son requeridos');
  }

  const applicationId = randomUUID();
  const holding = getHolding();
  let finvaUserId: number | null = null;

  if (isFinvaConfigured()) {
    const advisor = await getNextFinvaUser({ holdingStore: holding });
    if (advisor.ok && advisor.data?.id) finvaUserId = advisor.data.id;

    await unknownClient({
      phone: '',
      email: '',
      flow_process: 'onCreditWeb',
      user_id: null,
      finva_user_id: finvaUserId,
      motorcycle_id: body.finvaMotorcycleId ?? null,
      motorcycle_data: {
        brand: body.motorcycleBrand,
        name: body.motorcycleName,
        price: body.motorcyclePrice,
      },
      holding_page_url: holding,
      utm_source: body.utm?.utm_source,
      utm_medium: body.utm?.utm_medium,
      utm_campaign: body.utm?.utm_campaign,
      utm_content: body.utm?.utm_content,
      utm_term: body.utm?.utm_term,
      other_url_params: body.holdingPageUrl,
    });
  } else {
    logApplicationPayload('start (stub: Finva no configurado)', { applicationId, ...body });
  }

  const serverState: CreditApplicationServerState = {
    applicationId,
    finvaUserId,
  };
  return stubOk({ applicationId, serverState });
}
