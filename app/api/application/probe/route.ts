/**
 * Probe inicial después de StepContact. Decide qué rama del wizard recorrer:
 *
 *   - `unregistered`  → cliente nuevo. Hidratamos sólo el contacto y arrancamos
 *                       el flujo completo (CURP → domicilio → empleo → buró →
 *                       solicitud). También se llama `unknown-client` para
 *                       capturar el lead aunque no avance.
 *   - `incomplete`    → cliente existe pero sin CURP. Hidratamos lo que haya y
 *                       seguimos por el flujo completo (los pasos arrancan
 *                       prellenados con los datos disponibles).
 *   - `no_report`     → cliente con datos completos pero sin BC vigente. Va
 *                       directo al paso de NIP/buró tras confirmar/actualizar.
 *   - `with_report`   → cliente + reporte vigente. Skip NIP/buró y se va al
 *                       paso de "confirmar y crear solicitud" usando el
 *                       `report_id` existente.
 *   - `mismatch`      → uno de los campos no coincide con el cliente. Devolvemos
 *                       el clue enmascarado para que la UI pida verificar.
 *
 * Además garantiza un `finvaUserId` (asesor) asignado.
 */
import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  isFinvaConfigured,
  logApplicationPayload,
  mergeServerState,
  stubError,
  stubOk,
} from '@/lib/credit-application/server';
import {
  advisorToAgent,
  getHolding,
  getNextFinvaUser,
  unknownClient,
  validateClient,
  validatePhone,
} from '@/lib/finva/client';
import { normalizeHydratedAddress } from '@/lib/credit-application/address';
import {
  isValidEmail,
  isValidMxPhone,
  normalizeMxPhone,
} from '@/lib/credit-application/validation';
import type {
  AddressData,
  ClientSnapshot,
  CreditApplicationServerState,
  EntryResolutionKind,
  IdentityData,
} from '@/types/credit-application';
import type { FinvaCliente } from '@/lib/finva/types';

type ProbeBody = {
  /** Generado por el cliente cuando aún no existe `serverState.applicationId`. */
  serverState?: Partial<CreditApplicationServerState> | null;
  contact: { email: string; phone: string };
  motorcycleId: string;
  motorcycleName: string;
  motorcycleBrand: string;
  motorcyclePrice: number;
  finvaMotorcycleId: number | null;
  quote: { price: number; downPayment: number; months: number; monthly: number };
  holdingPageUrl?: string;
  utm?: Record<string, string | undefined>;
};

type ProbeResponse = {
  resolution: EntryResolutionKind;
  /** Hint enmascarado cuando `resolution === 'mismatch'`. */
  mismatch?: { wrongField: 'email' | 'phone'; clue: string };
  /** Hidratación del formulario cuando hay cliente existente. */
  hydratedIdentity?: Partial<IdentityData>;
  hydratedAddress?: Partial<AddressData>;
  /** Lista de colonias (si la podemos derivar localmente). */
  neighborhoodOptions?: string[];
  serverState: CreditApplicationServerState;
};

function snapshotFromClient(client: FinvaCliente): ClientSnapshot {
  return {
    curp: client.curp ?? undefined,
    rfc: client.rfc ?? undefined,
    name: client.name ?? undefined,
    second_name: client.second_name ?? undefined,
    first_last_name: client.first_last_name ?? undefined,
    second_last_name: client.second_last_name ?? undefined,
    birth_date: client.birth_date ?? undefined,
    phone: client.phone ?? undefined,
    email: client.email ?? undefined,
    zip_code: client.zip_code ?? undefined,
    ciudad: client.ciudad ?? undefined,
    estado: client.estado ?? undefined,
    suburb_colonia: client.suburb_colonia ?? undefined,
    street_address: client.street_address ?? undefined,
    interior_number: client.interior_number ?? undefined,
  };
}

function hydrateIdentity(client: FinvaCliente): Partial<IdentityData> {
  return {
    curp: client.curp ?? '',
    firstName: client.name ?? '',
    middleName: client.second_name ?? '',
    lastName: client.first_last_name ?? '',
    secondLastName: client.second_last_name ?? '',
    // Finva guarda `YYYY/MM/DD`; los inputs `type="date"` esperan ISO.
    birthDate: (client.birth_date ?? '').replaceAll('/', '-'),
    rfc: client.rfc,
  };
}

function hydrateAddress(client: FinvaCliente): Partial<AddressData> {
  return normalizeHydratedAddress({
    street: client.street_address ?? '',
    exteriorNumber: '',
    interiorNumber: client.interior_number ?? '',
    postalCode: client.zip_code ?? '',
    neighborhood: client.suburb_colonia ?? '',
    ciudad: client.ciudad ?? '',
    estado: client.estado ?? '',
  })!;
}

export async function POST(req: NextRequest) {
  let body: ProbeBody;
  try {
    body = (await req.json()) as ProbeBody;
  } catch {
    return stubError('invalid_json');
  }
  if (!isValidEmail(body.contact?.email ?? '')) return stubError('email inválido');
  if (!isValidMxPhone(body.contact?.phone ?? '')) return stubError('phone inválido');
  if (!body.motorcycleId || !body.quote) {
    return stubError('motorcycleId y quote son requeridos');
  }

  const email = body.contact.email.trim().toLowerCase();
  const phoneLocal = normalizeMxPhone(body.contact.phone);
  const phoneE164 = `+52${phoneLocal}`;

  // Aseguramos un applicationId estable para esta sesión.
  const applicationId = body.serverState?.applicationId ?? randomUUID();
  let serverState: CreditApplicationServerState = mergeServerState(
    body.serverState ?? null,
    { applicationId }
  );

  if (!isFinvaConfigured()) {
    logApplicationPayload('probe (stub)', { email, phoneLocal });
    const response: ProbeResponse = {
      resolution: 'unregistered',
      serverState: mergeServerState(serverState, { resolution: 'unregistered' }),
    };
    return stubOk(response);
  }

  // 1) /validate_phone — decide entre unregistered / mismatch / validated.
  const probe = await validatePhone({ email, phone: phoneE164 });

  // Aseguramos un finva user asignado (siempre, lo necesitamos en todas las ramas).
  let finvaUserId = serverState.finvaUserId ?? null;
  if (!finvaUserId) {
    const advisor = await getNextFinvaUser({ holdingStore: getHolding() });
    if (advisor.ok && advisor.data?.id) {
      finvaUserId = advisor.data.id;
      const agent = advisorToAgent(advisor.data);
      serverState = mergeServerState(serverState, {
        agentName: agent.agentName,
        agentPhone: agent.agentPhone,
      });
    }
  }
  serverState = mergeServerState(serverState, { finvaUserId });

  // === Rama A: NO REGISTRADO (HTTP 404) =====================================
  if (!probe.ok && probe.status === 404) {
    // Capturamos el lead aunque sea sólo email/teléfono.
    await unknownClient({
      phone: phoneE164,
      email,
      flow_process: 'onCreditWeb',
      user_id: null,
      finva_user_id: finvaUserId,
      motorcycle_id: body.finvaMotorcycleId ?? null,
      motorcycle_data: {
        brand: body.motorcycleBrand,
        name: body.motorcycleName,
        price: body.motorcyclePrice,
      },
      holding_page_url: getHolding(),
      utm_source: body.utm?.utm_source,
      utm_medium: body.utm?.utm_medium,
      utm_campaign: body.utm?.utm_campaign,
      utm_content: body.utm?.utm_content,
      utm_term: body.utm?.utm_term,
      other_url_params: body.holdingPageUrl,
    });

    const response: ProbeResponse = {
      resolution: 'unregistered',
      serverState: mergeServerState(serverState, { resolution: 'unregistered' }),
    };
    return stubOk(response);
  }

  if (!probe.ok) {
    return stubError(probe.error || 'No pudimos validar tu contacto', probe.status || 502, {
      label: 'probe validate_phone',
      details: probe.details,
    });
  }

  // === Rama B: MISMATCH (status: "invalid") =================================
  if (probe.data.status === 'invalid') {
    const response: ProbeResponse = {
      resolution: 'mismatch',
      mismatch: { wrongField: probe.data.type, clue: probe.data.clue },
      serverState: mergeServerState(serverState, { resolution: 'mismatch' }),
    };
    return stubOk(response);
  }

  // === Rama C/D/E: VALIDATED → cargar cliente completo ======================
  const full = await validateClient({ email, phone: phoneE164 });
  if (!full.ok) {
    return stubError(full.error || 'No pudimos cargar tu cliente', full.status || 502, {
      label: 'probe validate_client',
      details: full.details,
    });
  }

  const client = full.data.client;
  const reportId = full.data.report ?? null;

  // Determinamos el kind:
  //   - sin CURP → incomplete (faltan datos)
  //   - sin report → no_report
  //   - con report → with_report
  let resolution: EntryResolutionKind;
  if (!client.curp) {
    resolution = 'incomplete';
  } else if (!reportId) {
    resolution = 'no_report';
  } else {
    resolution = 'with_report';
  }

  const nextServerState = mergeServerState(serverState, {
    resolution,
    clienteId: client.id ?? null,
    reportId,
    clientSnapshot: snapshotFromClient(client),
  });

  const response: ProbeResponse = {
    resolution,
    hydratedIdentity: hydrateIdentity(client),
    hydratedAddress: hydrateAddress(client),
    serverState: nextServerState,
  };
  return stubOk(response);
}
