/**
 * Paso de domicilio. Hace TODO el trabajo "pesado":
 *   1) /validate_zip_code → ciudad/estado
 *   2) /get_neighborhoods/{cp} → lista de colonias para el dropdown
 *   3) Geocode CP → lat/lng
 *   4) /get_stores?marca=&holding=motoclick → elige sucursal más cercana
 *   5) /get_next_user?store_id=&client_email=&client_phone= → asesor de tienda
 *   6) POST /cliente (si aún no existe) o PUT /cliente/{id} con la dirección
 *
 * Devuelve `serverState` con clienteId, storeId, userId persistidos.
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
  createCliente,
  getHolding,
  getNeighborhoods,
  getNextFinvaUser,
  getNextUser,
  unwrapNeighborhoods,
  updateCliente,
  validateZipCode,
} from '@/lib/finva/client';
import { pickNearestStore } from '@/lib/finva/store-picker';
import { geocodeMxZip } from '@/lib/geocoding';
import {
  isValidEmail,
  isValidMxPhone,
  isValidPostalCode,
  normalizeMxPhone,
} from '@/lib/credit-application/validation';
import type {
  AddressData,
  ContactData,
  CreditApplicationServerState,
  IdentityData,
} from '@/types/credit-application';
import type { FinvaCliente } from '@/lib/finva/types';

type Body = {
  serverState: CreditApplicationServerState;
  address: AddressData;
  contact: ContactData;
  identity: IdentityData;
  motorcycleBrand: string;
};

function buildClientePayload(input: {
  contact: ContactData;
  identity: IdentityData;
  address: AddressData;
  ciudad?: string;
  estado?: string;
  /** Ambos ID son obligatorios — el caller debe garantizarlos antes de llamar. */
  userId: number;
  finvaUserId: number;
}): FinvaCliente {
  const { contact, identity, address, ciudad, estado, userId, finvaUserId } = input;
  const phone = normalizeMxPhone(contact.phone);
  const fullAddress = [address.street, address.exteriorNumber, address.interiorNumber]
    .filter(Boolean)
    .join(' ');

  return {
    name: identity.firstName,
    second_name: identity.middleName || undefined,
    first_last_name: identity.lastName,
    second_last_name: identity.secondLastName || undefined,
    phone: `+52${phone}`,
    email: contact.email.trim().toLowerCase(),
    curp: identity.curp,
    rfc: identity.rfc,
    // Finva espera ISO `YYYY-MM-DD`. El `<input type="date">` ya produce ese
    // formato; el replace defensivo cubre el caso de que llegue con `/`.
    birth_date: (identity.birthDate || '').replaceAll('/', '-'),
    zip_code: address.postalCode,
    // Prioridad: lo que el usuario confirmó en el form (address.ciudad/estado),
    // luego lo que devolvió Finva en este request.
    ciudad: address.ciudad || ciudad,
    estado: address.estado || estado,
    suburb_colonia: address.neighborhood,
    street_address: fullAddress.trim(),
    interior_number: address.interiorNumber || undefined,
    // CRÍTICO: estos dos IDs vinculan al cliente con la sucursal/asesor de
    // Motoclick en Finva. Sin ellos las solicitudes quedan huérfanas y no
    // entran al pipeline del asesor. Los validamos antes de armar el payload.
    user_id: userId,
    finva_user_id: finvaUserId,
    flow_process: 'onCreditWeb',
  };
}

function extractClienteId(data: unknown): number | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (typeof d.cliente_id === 'number') return d.cliente_id;
  if (typeof d.id === 'number') return d.id;
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
  if (!body?.address?.street?.trim()) return stubError('Falta calle');
  if (!isValidPostalCode(body.address.postalCode)) return stubError('Código postal inválido');
  if (!body.address.neighborhood?.trim()) return stubError('Falta colonia');
  if (!isValidEmail(body.contact?.email ?? '')) return stubError('email inválido');
  if (!isValidMxPhone(body.contact?.phone ?? '')) return stubError('phone inválido');
  if (!body.identity?.curp || !body.identity.firstName || !body.identity.lastName) {
    return stubError('Faltan datos de identidad');
  }

  // Si la UI ya hizo el live-lookup (StepAddress) la respuesta incluye
  // `ciudad`/`estado`; aquí los usamos como verdad por defecto. Sólo si vienen
  // vacíos pedimos a Finva (fallback para clientes con JS deshabilitado o que
  // tuvieron error de red en el lookup en vivo y los completaron a mano).
  let ciudad: string | undefined = body.address.ciudad?.trim() || undefined;
  let estado: string | undefined = body.address.estado?.trim() || undefined;
  let neighborhoods: string[] | undefined;
  let storeId: number | null = body.serverState.storeId ?? null;
  let userId: number | null = body.serverState.userId ?? null;
  let clienteId: number | null = body.serverState.clienteId ?? null;

  if (isFinvaConfigured()) {
    const needsServerSideZipLookup = !ciudad || !estado;
    const [hoodsRes, coords, zipRes] = await Promise.all([
      getNeighborhoods(body.address.postalCode),
      geocodeMxZip(body.address.postalCode),
      needsServerSideZipLookup
        ? validateZipCode(body.address.postalCode)
        : Promise.resolve(null),
    ]);
    if (hoodsRes.ok) {
      const normalized = unwrapNeighborhoods(hoodsRes.data);
      neighborhoods = normalized.neighborhoods;
      if (!ciudad) ciudad = normalized.city;
      if (!estado) estado = normalized.state;
    }
    if (zipRes && zipRes.ok) {
      if (!ciudad) ciudad = zipRes.data?.ciudad;
      if (!estado) estado = zipRes.data?.estado;
    }

    // Sucursal más cercana
    const pick = await pickNearestStore({
      brand: body.motorcycleBrand,
      clientCoords: coords,
      ciudad,
      estado,
    });
    if (pick) storeId = pick.store.id;

    // Asesor de la tienda (si hay tienda)
    if (storeId) {
      const advisor = await getNextUser({
        store_id: storeId,
        client_email: body.contact.email.trim().toLowerCase(),
        client_phone: `+52${normalizeMxPhone(body.contact.phone)}`,
      });
      if (advisor.ok && advisor.data?.id) userId = advisor.data.id;
    }

    // ── Garantizar finva_user_id (asesor del holding) ────────────────────────
    // Si el probe no logró asignarlo, intentamos UNA vez más antes de fallar
    // duro. El cliente Finva (create/update) lo necesita SIEMPRE para que la
    // futura solicitud quede vinculada al asesor correcto en el pipeline.
    let finvaUserId: number | null = body.serverState.finvaUserId ?? null;
    if (!finvaUserId) {
      const advisor = await getNextFinvaUser({ holdingStore: getHolding() });
      if (advisor.ok && advisor.data?.id) finvaUserId = advisor.data.id;
    }

    // ── Validación dura: ambos IDs son obligatorios antes de tocar /cliente ──
    if (!finvaUserId) {
      return stubError(
        'No pudimos asignarte un asesor Finva (finva_user_id). Reintenta en unos segundos.',
        503,
        { label: 'address ensure_ids', details: { finvaUserId, userId, storeId } }
      );
    }
    if (!userId) {
      return stubError(
        'No pudimos asignarte un asesor de tienda (user_id). Verifica que haya ' +
          'sucursales disponibles para tu zona y reintenta.',
        503,
        { label: 'address ensure_ids', details: { finvaUserId, userId, storeId } }
      );
    }

    const clientePayload = buildClientePayload({
      contact: body.contact,
      identity: body.identity,
      address: body.address,
      ciudad,
      estado,
      userId,
      finvaUserId,
    });

    if (clienteId) {
      // CRÍTICO: el cliente DEBE quedar sincronizado en la DB de Finva antes
      // de pasar a NIP/buró. Antes ignorábamos el error y el `/send_nip_kiban`
      // recibía un cliente con datos viejos/incompletos (e.g. sin RFC) y
      // fallaba con `rfc_pf` empty. Ahora propagamos el error.
      //
      // Nota: en el PUT mandamos user_id Y finva_user_id explícitamente para
      // que un cliente ya existente quede REASIGNADO al asesor/sucursal de
      // Motoclick en este flujo (antes los borrábamos del payload y se
      // perdía la vinculación cuando el cliente venía de otro holding).
      const updated = await updateCliente(clienteId, clientePayload);
      if (!updated.ok) {
        return stubError(
          updated.error || 'No pudimos actualizar tus datos en Finva',
          updated.status || 502,
          { label: 'address update_cliente', details: updated.details }
        );
      }
    } else {
      const created = await createCliente(clientePayload);
      if (!created.ok) {
        return stubError(
          created.error || 'No pudimos registrar tu cliente Finva',
          created.status || 502,
          { label: 'address create_cliente', details: created.details }
        );
      }
      clienteId = extractClienteId(created.data);
    }

    // Persistimos el finva_user_id que efectivamente quedó vinculado para que
    // los siguientes pasos (employment, buró, submit) lo reusen.
    body.serverState = { ...body.serverState, finvaUserId };
  } else {
    logApplicationPayload('address (stub)', body);
  }

  const nextState = mergeServerState(body.serverState, {
    storeId,
    userId,
    clienteId,
    // body.serverState ya quedó actualizado con finvaUserId arriba; lo
    // re-aplicamos aquí explícitamente para no depender del orden de merge.
    finvaUserId: body.serverState.finvaUserId ?? null,
  });

  return stubOk({
    serverState: nextState,
    neighborhoods,
    ciudad,
    estado,
  });
}
