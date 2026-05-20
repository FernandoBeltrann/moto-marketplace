/**
 * Verifica el NIP. Spec Finva:
 *   1) /validate_nip_kiban → phase: VALIDATE_2 (NIP correcto)
 *   2) /validate_nip_kiban (mismo NIP) → phase: VALIDATED (autorizado)
 *   3) /get_bc_kiban/{cliente_id} → genera reporte y devuelve report_id + score
 *
 * En dev sin Finva acepta cualquier 6 dígitos y devuelve datos dummy.
 */
import { NextRequest } from 'next/server';
import { isValidNip } from '@/lib/credit-application/validation';
import {
  isFinvaConfigured,
  logApplicationPayload,
  mergeServerState,
  stubError,
  stubOk,
} from '@/lib/credit-application/server';
import { getBcKiban, unwrapKiban, validateNipKiban } from '@/lib/finva/client';
import type { CreditApplicationServerState } from '@/types/credit-application';

type Body = {
  serverState: CreditApplicationServerState;
  nip: string;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return stubError('invalid_json');
  }
  if (!body?.serverState?.applicationId) return stubError('serverState.applicationId requerido');
  if (!isValidNip(body.nip ?? '')) return stubError('NIP debe ser 6 dígitos');

  if (!isFinvaConfigured()) {
    logApplicationPayload('buro/verify (stub)', { applicationId: body.serverState.applicationId });
    return stubOk({
      serverState: mergeServerState(body.serverState, { reportId: 0 }),
      reportId: 0,
      valorScore: null,
      clasificacion: null,
    });
  }

  if (!body.serverState.workflooId) return stubError('Falta workflooId — solicita NIP primero.');
  if (!body.serverState.clienteId) return stubError('Falta clienteId.');

  // Paso 1: VALIDATE_2
  const first = await validateNipKiban({ workflooId: body.serverState.workflooId, nip: body.nip });
  if (!first.ok)
    return stubError(first.error || 'NIP incorrecto', first.status || 400, {
      label: 'buro/verify validate#1',
      details: first.details,
    });
  const firstPhase = unwrapKiban(first.data).phase;

  // Si ya viene VALIDATED, podemos saltar el segundo. Si no, autorizamos.
  if (firstPhase !== 'VALIDATED') {
    const second = await validateNipKiban({
      workflooId: body.serverState.workflooId,
      nip: body.nip,
    });
    if (!second.ok)
      return stubError(
        second.error || 'No pudimos autorizar la consulta',
        second.status || 400,
        { label: 'buro/verify validate#2', details: second.details }
      );
    const secondPhase = unwrapKiban(second.data).phase;
    if (secondPhase !== 'VALIDATED') {
      return stubError('La autorización no quedó en estado VALIDATED', 422, {
        label: 'buro/verify validate#2',
        details: unwrapKiban(second.data),
      });
    }
  }

  // Paso 2: pull BC
  const bc = await getBcKiban(body.serverState.clienteId, body.serverState.workflooId);
  if (!bc.ok)
    return stubError(bc.error || 'No pudimos obtener el reporte de Buró', bc.status || 502, {
      label: 'buro/verify get_bc',
      details: bc.details,
    });

  const nextState = mergeServerState(body.serverState, {
    reportId: bc.data.report_id ?? null,
  });

  return stubOk({
    serverState: nextState,
    reportId: bc.data.report_id,
    valorScore: bc.data.valor_score ?? null,
    clasificacion: bc.data.clasificacion ?? null,
  });
}
