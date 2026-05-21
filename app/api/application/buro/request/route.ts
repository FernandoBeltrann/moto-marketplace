/**
 * Solicita el NIP de Buró vía Kiban (`/send_nip_kiban`). Si recibe el error
 * "the workfloo had already finished" descarta el workflooId previo y reintenta
 * una vez. Si llega `changePhoneTo` actualiza primero el cliente con el nuevo
 * teléfono y luego reenvía con `/resend_nip_kiban` (caso "cambiar número").
 */
import { NextRequest } from 'next/server';
import {
  isFinvaConfigured,
  logApplicationPayload,
  mergeServerState,
  stubError,
  stubOk,
} from '@/lib/credit-application/server';
import {
  resendNipKiban,
  sendNipKiban,
  unwrapKiban,
  updateCliente,
  type SendNipKibanPayload,
} from '@/lib/finva/client';
import { normalizeMxPhone } from '@/lib/credit-application/validation';
import type {
  AddressData,
  ContactData,
  CreditApplicationServerState,
  IdentityData,
} from '@/types/credit-application';

type Body = {
  serverState: CreditApplicationServerState;
  contact?: ContactData;
  identity?: IdentityData;
  address?: AddressData;
  changePhoneTo?: string;
  /**
   * Cuando es true y `serverState.workflooId` existe, llamamos
   * `/resend_nip_kiban` (no abrimos un workfloo nuevo). Kiban decide solo si
   * el reintento sale por WhatsApp o por email (3er intento → email).
   */
  resend?: boolean;
};

function buildSendNipPayload(input: {
  contact: ContactData;
  identity: IdentityData;
  address: AddressData;
}): SendNipKibanPayload {
  const { contact, identity, address } = input;
  const phone10 = normalizeMxPhone(contact.phone);
  const fullAddress = [address.street, address.exteriorNumber, address.interiorNumber]
    .filter(Boolean)
    .join(' ')
    .trim();
  return {
    first_name: identity.firstName,
    second_name: identity.middleName || undefined,
    last_name_1: identity.lastName,
    last_name_2: identity.secondLastName || undefined,
    birth_date: (identity.birthDate || '').replaceAll('/', '-'),
    postal_code: address.postalCode,
    rfc_pf: identity.rfc,
    phone: phone10,
    email: contact.email.trim().toLowerCase(),
    address: fullAddress,
    country_code: '+52',
  };
}

function missingRequiredFields(p: SendNipKibanPayload): string[] {
  const required: Array<[keyof SendNipKibanPayload, string]> = [
    ['first_name', 'nombre'],
    ['last_name_1', 'apellido paterno'],
    ['birth_date', 'fecha de nacimiento'],
    ['postal_code', 'código postal'],
    ['phone', 'WhatsApp'],
    ['email', 'correo'],
    ['address', 'domicilio'],
  ];
  return required.filter(([k]) => !String(p[k] ?? '').trim()).map(([, label]) => label);
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return stubError('invalid_json');
  }
  if (!body?.serverState?.applicationId) return stubError('serverState.applicationId requerido');

  if (!isFinvaConfigured()) {
    logApplicationPayload('buro/request (stub)', body);
    return stubOk({
      serverState: mergeServerState(body.serverState, {}),
      message: 'NIP solicitado (stub). En dev acepta cualquier 6 dígitos.',
    });
  }

  if (!body.serverState.clienteId) {
    return stubError('Aún no se ha registrado el cliente en Finva (paso de domicilio).', 409);
  }

  // Si pidieron cambiar teléfono y existe workfloo: PUT cliente + /resend_nip_kiban.
  if (body.changePhoneTo && body.serverState.workflooId) {
    // Mismo invariante: el PUT debe llevar user_id y finva_user_id para no
    // desvincular al cliente del asesor cuando le actualizamos el teléfono.
    const { userId, finvaUserId } = body.serverState;
    if (!finvaUserId || !userId) {
      return stubError(
        'Falta user_id o finva_user_id en la sesión. Vuelve al paso de domicilio para reasignar asesor.',
        409,
        {
          label: 'buro/request change_phone ensure_ids',
          details: { userId, finvaUserId, clienteId: body.serverState.clienteId },
        }
      );
    }
    const upd = await updateCliente(body.serverState.clienteId, {
      phone: `+52${body.changePhoneTo.replace(/\D/g, '').slice(-10)}`,
      user_id: userId,
      finva_user_id: finvaUserId,
    });
    if (!upd.ok) {
      return stubError(
        upd.error || 'No pudimos actualizar tu teléfono en Finva',
        upd.status || 502,
        { label: 'buro/request change_phone update_cliente', details: upd.details }
      );
    }
    const r = await resendNipKiban({
      workflooId: body.serverState.workflooId,
      countryCode: '+52',
      phoneNumber: body.changePhoneTo.replace(/\D/g, '').slice(-10),
    });
    if (!r.ok)
      return stubError(r.error || 'No se pudo reenviar el NIP', r.status || 502, {
        label: 'buro/request resend',
        details: r.details,
      });
    const phaseData = unwrapKiban(r.data);
    return stubOk({
      serverState: mergeServerState(body.serverState, {}),
      message: 'Reenviamos tu NIP al nuevo número.',
      nipType: phaseData.nipType,
    });
  }

  // Reenvío simple (mismo teléfono): si ya hay workfloo abierto, NO creamos
  // uno nuevo, llamamos `/resend_nip_kiban`. Esto preserva el contador de
  // intentos de Kiban (3er intento ⇒ NIP por email). Si el workfloo expiró,
  // hacemos fallback abriendo uno nuevo con `/send_nip_kiban`.
  if (body.resend && body.serverState.workflooId) {
    const r = await resendNipKiban({
      workflooId: body.serverState.workflooId,
      countryCode: '+52',
      phoneNumber: normalizeMxPhone(body.contact?.phone ?? ''),
    });
    if (r.ok) {
      const phaseData = unwrapKiban(r.data);
      return stubOk({
        serverState: mergeServerState(body.serverState, {}),
        message:
          phaseData.nipType === 'email'
            ? 'Te enviamos el NIP por correo electrónico.'
            : 'Hemos reenviado un código de 6 dígitos a tu WhatsApp.',
        nipType: phaseData.nipType,
      });
    }
    // Workfloo expirado o cerrado → caemos al flujo normal (sendNipKiban abre
    // uno nuevo). Para cualquier otro error devolvemos el detalle al cliente.
    if (!/workfloo had already finished/i.test(r.error || '')) {
      return stubError(r.error || 'No se pudo reenviar el NIP', r.status || 502, {
        label: 'buro/request resend',
        details: r.details,
      });
    }
  }

  if (!body.contact || !body.identity || !body.address) {
    return stubError(
      'Faltan datos de contacto, identidad o domicilio para solicitar NIP.',
      400,
      { label: 'buro/request payload' }
    );
  }

  const reqPayload = buildSendNipPayload({
    contact: body.contact,
    identity: body.identity,
    address: body.address,
  });

  const missing = missingRequiredFields(reqPayload);
  if (missing.length) {
    return stubError(
      `Faltan datos para solicitar tu NIP: ${missing.join(', ')}.`,
      400,
      { label: 'buro/request payload', details: { missing } }
    );
  }

  let res = await sendNipKiban(reqPayload);
  let kiban = res.ok ? unwrapKiban(res.data) : null;

  if (!res.ok && /workfloo had already finished/i.test(res.error || '')) {
    // Reintenta sin workflooId previo.
    res = await sendNipKiban(reqPayload);
    kiban = res.ok ? unwrapKiban(res.data) : null;
  }

  if (!res.ok || !kiban) {
    return stubError(
      res.ok ? 'Respuesta inválida de Buró' : res.error,
      res.ok ? 502 : res.status || 502,
      { label: 'buro/request send', details: res.ok ? res.data : res.details }
    );
  }

  const nextState = mergeServerState(body.serverState, {
    workflooId: kiban.workflooId ?? body.serverState.workflooId ?? null,
  });

  return stubOk({
    serverState: nextState,
    message:
      kiban.status === 'COMPLETED'
        ? 'Identidad ya verificada. Continuamos con la consulta.'
        : 'Hemos enviado un código de 6 dígitos a tu WhatsApp.',
    nipType: kiban.nipType,
  });
}
