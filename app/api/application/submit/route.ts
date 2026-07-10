/**
 * Crea la solicitud Finva con `holding_page_url=motoclick`. Reglas del ticket:
 *
 * - Si el cliente ya tiene una solicitud creada HOY para la misma motocicleta:
 *   se devuelve la existente (no se crea otra).
 * - Si la última solicitud del cliente es de OTRA motocicleta: se crea una
 *   nueva y se referencia con `parent_solicitud_id`.
 * - Después se obtiene/refresca el agente Finva (`/get_advisor_details/{id}`)
 *   para devolverlo al cliente y armar el WhatsApp en el paso 6.
 */
import { NextRequest } from 'next/server';
import {
  isFinvaConfigured,
  logApplicationPayload,
  mergeServerState,
  stubError,
  stubOk,
} from '@/lib/credit-application/server';
import { buildSolicitudEmploymentFields } from '@/lib/credit-application/employment-finva';
import {
  addSolicitud,
  advisorToAgent,
  getAdvisorDetails,
  getHolding,
  getNextFinvaUser,
  getSolicitudesByCliente,
} from '@/lib/finva/client';
import type {
  CreditApplicationServerState,
  EmploymentData,
  QuoteContext,
} from '@/types/credit-application';
import type { FinvaAddSolicitudPayload, FinvaSolicitud } from '@/lib/finva/types';

type Body = {
  serverState: CreditApplicationServerState;
  motorcycleId: string;
  motorcycleBrand: string;
  motorcycleModel: string;
  motorcycleYear: number;
  motorcyclePrice: number;
  finvaMotorcycleId: number | null;
  quote: QuoteContext;
  /** Opcional: cuando el cliente ya tiene `reportId` (rama `with_report`) no
   *  pedimos empleo porque ya pasó por todo el flujo antes. */
  employment?: EmploymentData;
};

function sameDay(a: string | undefined, b: Date): boolean {
  if (!a) return false;
  const d = new Date(a);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === b.getFullYear() &&
    d.getMonth() === b.getMonth() &&
    d.getDate() === b.getDate()
  );
}

function extractSolicitud(data: unknown): FinvaSolicitud | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.solicitud && typeof d.solicitud === 'object') {
    return d.solicitud as FinvaSolicitud;
  }
  if (typeof d.id === 'number') return d as unknown as FinvaSolicitud;
  return null;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return stubError('invalid_json');
  }
  if (!body?.serverState?.applicationId) return stubError('serverState.applicationId requerido');
  // El empleo sólo es obligatorio cuando NO traemos un reportId existente
  // (rama `with_report` puede crear solicitud sin pasar por empleo / NIP).
  const hasExistingReport = Boolean(body.serverState.reportId);
  if (!hasExistingReport && !body.employment?.monthlyIncome) {
    return stubError('Faltan datos de empleo / preguntas clave');
  }

  if (!isFinvaConfigured()) {
    logApplicationPayload('submit (stub)', body);
    const fakeId = Date.now();
    return stubOk({
      serverState: mergeServerState(body.serverState, {
        solicitudId: fakeId,
        agentName: null,
        agentPhone: null,
      }),
      solicitudId: fakeId,
      agentName: null,
      agentPhone: null,
      alreadyExisted: false,
    });
  }

  if (!body.serverState.clienteId) {
    return stubError('Aún no tenemos un cliente Finva creado.', 409);
  }

  const holding = getHolding();
  const clienteId = body.serverState.clienteId;

  // ── Dedup: ¿ya hay una solicitud de hoy para la misma moto?
  let parentSolicitudId: number | null = null;
  const previous = await getSolicitudesByCliente(clienteId);
  if (previous.ok && Array.isArray(previous.data)) {
    const today = new Date();
    const sameMotoToday = previous.data.find(
      (s) =>
        s.id_motorcycle != null &&
        body.finvaMotorcycleId != null &&
        Number(s.id_motorcycle) === body.finvaMotorcycleId &&
        sameDay(s.created_at, today)
    );
    if (sameMotoToday) {
      // Recuperamos al asesor Finva existente (si lo hay) y devolvemos el ID.
      const advisor =
        sameMotoToday.finva_user_id && sameMotoToday.finva_user_id > 0
          ? await getAdvisorDetails(sameMotoToday.finva_user_id)
          : null;
      const detail = advisorToAgent(advisor?.ok ? advisor.data : undefined);
      // Preferimos lo que devuelva el detalle, pero caemos al asesor capturado
      // en la asignación (start/probe/address) para no perder el teléfono.
      const agent = {
        agentName: detail.agentName ?? body.serverState.agentName ?? null,
        agentPhone: detail.agentPhone ?? body.serverState.agentPhone ?? null,
      };
      return stubOk({
        serverState: mergeServerState(body.serverState, {
          solicitudId: sameMotoToday.id,
          agentName: agent.agentName,
          agentPhone: agent.agentPhone,
        }),
        solicitudId: sameMotoToday.id,
        ...agent,
        alreadyExisted: true,
      });
    }
    // Última solicitud previa (cualquier moto) → enlace como parent.
    const sortedDesc = [...previous.data].sort((a, b) => {
      const da = new Date(a.created_at ?? 0).getTime();
      const db = new Date(b.created_at ?? 0).getTime();
      return db - da;
    });
    if (sortedDesc[0]?.id) parentSolicitudId = sortedDesc[0].id;
  }

  // ── Asegurar finvaUserId vigente (si no lo tenemos en serverState).
  // Semilla del asesor: lo capturado en la asignación previa (start/probe/address).
  const agentSeed = {
    agentName: body.serverState.agentName ?? null,
    agentPhone: body.serverState.agentPhone ?? null,
  };
  let finvaUserId = body.serverState.finvaUserId ?? null;
  if (!finvaUserId) {
    const nextFinva = await getNextFinvaUser({ client_id: clienteId, holdingStore: holding });
    if (nextFinva.ok && nextFinva.data?.id) {
      finvaUserId = nextFinva.data.id;
      const a = advisorToAgent(nextFinva.data);
      agentSeed.agentName = a.agentName ?? agentSeed.agentName;
      agentSeed.agentPhone = a.agentPhone ?? agentSeed.agentPhone;
    }
  }

  const downPaymentPct =
    body.quote.price > 0 ? Math.round((body.quote.downPayment / body.quote.price) * 10000) / 10000 : 0;

  const payload: FinvaAddSolicitudPayload = {
    cliente_id: clienteId,
    report_id: body.serverState.reportId ?? null,
    user_id: body.serverState.userId ?? null,
    finva_user_id: finvaUserId,
    brand_motorcycle: body.motorcycleBrand,
    model_motorcycle: body.motorcycleModel,
    year_motorcycle: String(body.motorcycleYear),
    invoice_motorcycle_value: body.motorcyclePrice,
    percentage_down_payment: downPaymentPct,
    payment_method: 'loan',
    registration_process: 'onCreditWeb',
    flow_process: 'onCreditWeb',
    finance_term_months: `${Number(body.quote.months)} meses`,
    preferred_store_id: body.serverState.storeId ?? null,
    holding_page_url: holding,
    parent_solicitud_id: parentSolicitudId,
    ...(body.employment ? buildSolicitudEmploymentFields(body.employment) : {}),
  };

  const created = await addSolicitud(payload);
  if (!created.ok) {
    return stubError(
      created.error || 'No pudimos registrar tu solicitud',
      created.status || 502,
      { label: 'submit add_solicitud', details: created.details }
    );
  }

  const solicitud = extractSolicitud(created.data);
  if (!solicitud?.id) {
    return stubError('Finva no devolvió un id de solicitud válido', 502, {
      label: 'submit add_solicitud',
      details: created.data,
    });
  }

  // ── Asesor para el WhatsApp. Refrescamos con get_advisor_details, pero
  // conservamos como fallback el asesor capturado en la asignación (agentSeed)
  // para que el paso 6 siempre tenga nombre/teléfono reales del asesor Finva.
  let agent = { ...agentSeed };
  if (finvaUserId) {
    const advisor = await getAdvisorDetails(finvaUserId);
    if (advisor.ok) {
      const detail = advisorToAgent(advisor.data);
      agent = {
        agentName: detail.agentName ?? agent.agentName,
        agentPhone: detail.agentPhone ?? agent.agentPhone,
      };
    }
  }

  const nextState = mergeServerState(body.serverState, {
    solicitudId: solicitud.id,
    finvaUserId,
    agentName: agent.agentName,
    agentPhone: agent.agentPhone,
  });

  return stubOk({
    serverState: nextState,
    solicitudId: solicitud.id,
    agentName: agent.agentName,
    agentPhone: agent.agentPhone,
    alreadyExisted: false,
  });
}
