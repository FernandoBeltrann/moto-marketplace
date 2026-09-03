/**
 * Verifica el NIP en dos pasos (UI wizard):
 *   - `step: 'confirm'`  → un solo `/validate_nip_kiban` (botón Continuar)
 *   - `step: 'authorize'` → segundo `/validate_nip_kiban` + `/get_bc_kiban` (Autorizar)
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
  step?: 'confirm' | 'authorize';
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

  const step = body.step ?? 'authorize';

  if (!isFinvaConfigured()) {
    logApplicationPayload('buro/verify (stub)', {
      applicationId: body.serverState.applicationId,
      step,
    });
    if (step === 'confirm') {
      return stubOk({
        serverState: mergeServerState(body.serverState, {}),
        phase: 'VALIDATE_2',
      });
    }
    return stubOk({
      serverState: mergeServerState(body.serverState, { reportId: 0 }),
      reportId: 0,
      valorScore: null,
      clasificacion: null,
    });
  }

  if (!body.serverState.workflooId) return stubError('Falta workflooId — solicita NIP primero.');
  if (!body.serverState.clienteId) return stubError('Falta clienteId.');

  const workflooId = body.serverState.workflooId;
  const clienteId = body.serverState.clienteId;

  if (step === 'confirm') {
    const first = await validateNipKiban({ workflooId, nip: body.nip });
    if (!first.ok) {
      return stubError(first.error || 'NIP incorrecto', first.status || 400, {
        label: 'buro/verify validate#1',
        details: first.details,
      });
    }
    const phase = unwrapKiban(first.data).phase;
    if (phase !== 'VALIDATE_2' && phase !== 'VALIDATED') {
      return stubError('NIP incorrecto o expirado', 400, {
        label: 'buro/verify validate#1',
        details: unwrapKiban(first.data),
      });
    }
    return stubOk({
      serverState: mergeServerState(body.serverState, {}),
      phase,
    });
  }

  // authorize: segundo validate (si hace falta) y luego reporte BC.
  const auth = await validateNipKiban({ workflooId, nip: body.nip });
  if (!auth.ok) {
    return stubError(auth.error || 'No pudimos autorizar la consulta', auth.status || 400, {
      label: 'buro/verify validate#2',
      details: auth.details,
    });
  }
  const authPhase = unwrapKiban(auth.data).phase;
  if (authPhase !== 'VALIDATED') {
    return stubError('La autorización no quedó en estado VALIDATED', 422, {
      label: 'buro/verify validate#2',
      details: unwrapKiban(auth.data),
    });
  }

  const bc = await getBcKiban(clienteId, workflooId);
  if (!bc.ok) {
    return stubError(bc.error || 'No pudimos obtener el reporte de Buró', bc.status || 502, {
      label: 'buro/verify get_bc',
      details: bc.details,
    });
  }

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
