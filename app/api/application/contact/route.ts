/**
 * Persiste contacto. Si ya hay `clienteId`, hace PUT /cliente/{id} con phone+email.
 * Si todavía no existe el cliente (caso normal — el cliente se crea en el paso
 * de identificación), sólo guarda en serverState para usarlo más adelante.
 */
import { NextRequest } from 'next/server';
import {
  isFinvaConfigured,
  logApplicationPayload,
  mergeServerState,
  stubError,
  stubOk,
} from '@/lib/credit-application/server';
import { updateCliente } from '@/lib/finva/client';
import { isValidEmail, isValidMxPhone, normalizeMxPhone } from '@/lib/credit-application/validation';
import type { CreditApplicationServerState } from '@/types/credit-application';

type Body = {
  serverState: CreditApplicationServerState;
  contact: { email: string; phone: string };
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return stubError('invalid_json');
  }
  if (!body?.serverState?.applicationId) return stubError('serverState.applicationId requerido');
  if (!isValidEmail(body.contact?.email ?? '')) return stubError('email inválido');
  if (!isValidMxPhone(body.contact?.phone ?? '')) return stubError('phone inválido');

  const phone = normalizeMxPhone(body.contact.phone);
  const email = body.contact.email.trim().toLowerCase();

  if (isFinvaConfigured() && body.serverState.clienteId) {
    // Mismo invariante que en address/employment: si vamos a tocar /cliente,
    // los IDs de asesor DEBEN viajar en el body. Si faltan, devolvemos un
    // 409 accionable en vez de "actualizar" un cliente sin vinculación.
    const { userId, finvaUserId, clienteId } = body.serverState;
    if (!finvaUserId || !userId) {
      return stubError(
        'Falta user_id o finva_user_id en la sesión. Vuelve al paso de domicilio para reasignar asesor.',
        409,
        { label: 'contact ensure_ids', details: { userId, finvaUserId, clienteId } }
      );
    }
    const upd = await updateCliente(clienteId, {
      phone: `+52${phone}`,
      email,
      user_id: userId,
      finva_user_id: finvaUserId,
    });
    if (!upd.ok) {
      return stubError(
        upd.error || 'No pudimos actualizar tu contacto en Finva',
        upd.status || 502,
        { label: 'contact update_cliente', details: upd.details }
      );
    }
  } else {
    logApplicationPayload('contact (cliente todavía no creado)', { phone, email });
  }

  return stubOk({ serverState: mergeServerState(body.serverState, {}) });
}
