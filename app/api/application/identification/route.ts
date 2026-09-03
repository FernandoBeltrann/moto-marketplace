/**
 * Persiste identificación. No crea cliente Finva todavía — esperamos al paso
 * de domicilio porque /cliente requiere CP, ciudad y dirección.
 */
import { NextRequest } from 'next/server';
import {
  logApplicationPayload,
  mergeServerState,
  stubError,
  stubOk,
} from '@/lib/credit-application/server';
import type { CreditApplicationServerState, IdentityData } from '@/types/credit-application';

type Body = {
  serverState: CreditApplicationServerState;
  identity: IdentityData;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return stubError('invalid_json');
  }
  if (!body?.serverState?.applicationId) return stubError('serverState.applicationId requerido');
  if (!body?.identity?.curp) return stubError('identity.curp requerido');
  if (!body.identity.firstName?.trim() || !body.identity.lastName?.trim()) {
    return stubError('Faltan nombres y apellidos');
  }

  logApplicationPayload('identification', {
    applicationId: body.serverState.applicationId,
    curp: body.identity.curp,
  });

  return stubOk({ serverState: mergeServerState(body.serverState, {}) });
}
