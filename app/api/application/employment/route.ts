/**
 * Empleo + 5 preguntas clave. Si ya hay clienteId hace PUT /cliente/{id} sólo
 * con `profesion` (= role). Las 5 preguntas se envían en /submit vía
 * `/add_solicitud` (no son campos del cliente en Finva).
 */
import { NextRequest } from 'next/server';
import {
  isFinvaConfigured,
  logApplicationPayload,
  mergeServerState,
  stubError,
  stubOk,
} from '@/lib/credit-application/server';
import { buildClienteEmploymentPatch } from '@/lib/credit-application/employment-finva';
import { updateCliente } from '@/lib/finva/client';
import type { CreditApplicationServerState, EmploymentData } from '@/types/credit-application';

type Body = {
  serverState: CreditApplicationServerState;
  employment: EmploymentData;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return stubError('invalid_json');
  }
  if (!body?.serverState?.applicationId) return stubError('serverState.applicationId requerido');
  const e = body.employment;
  if (!e?.company?.trim() || !e?.role?.trim() || !e?.tenureMonths) {
    return stubError('Faltan datos de empleo');
  }
  if (!e.incomeSourceType || !e.incomeProof || !e.creditHistory || !e.possibleGuarantor) {
    return stubError('Faltan respuestas de las preguntas clave');
  }
  if (!e.monthlyIncome || e.monthlyIncome <= 0) {
    return stubError('Ingreso mensual inválido');
  }

  if (isFinvaConfigured() && body.serverState.clienteId) {
    // CRÍTICO: user_id y finva_user_id DEBEN viajar en cada PUT /cliente para
    // mantener la vinculación con la sucursal/asesor de Motoclick. Si por
    // alguna razón se perdieron del serverState (sesión corrupta, navegación
    // rara entre pestañas) abortamos en vez de "actualizar" silenciosamente
    // un cliente sin asesor — luego /add_solicitud lo rebota.
    const { userId, finvaUserId, clienteId } = body.serverState;
    if (!finvaUserId) {
      return stubError(
        'Falta finva_user_id en la sesión. Vuelve al paso de domicilio para reasignar asesor.',
        409,
        { label: 'employment ensure_ids', details: { userId, finvaUserId, clienteId } }
      );
    }
    if (!userId) {
      return stubError(
        'Falta user_id en la sesión. Vuelve al paso de domicilio para reasignar asesor.',
        409,
        { label: 'employment ensure_ids', details: { userId, finvaUserId, clienteId } }
      );
    }

    const upd = await updateCliente(
      clienteId,
      buildClienteEmploymentPatch(e, { userId, finvaUserId })
    );
    if (!upd.ok) {
      return stubError(
        upd.error || 'No pudimos guardar tu información laboral en Finva',
        upd.status || 502,
        { label: 'employment update_cliente', details: upd.details }
      );
    }
  } else {
    logApplicationPayload('employment (stub o sin clienteId)', e);
  }

  return stubOk({ serverState: mergeServerState(body.serverState, {}) });
}
