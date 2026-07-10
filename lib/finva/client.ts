/**
 * Cliente HTTP server-only para el backend Finva. NUNCA importar desde un
 * componente cliente — depende de FINVA_API_TOKEN que sólo existe en el server.
 * Lo usamos sólo desde route handlers `app/api/**`, por eso no añadimos el
 * paquete `server-only` (evita una dep extra).
 *
 * Spec: ver docs internas Finva (unknown-client, cliente, send_nip_kiban,
 * validate_nip_kiban, get_bc_kiban, get_stores, get_next_user, etc.).
 */
import type {
  FinvaAddSolicitudPayload,
  FinvaAdvisor,
  FinvaBcReport,
  FinvaCliente,
  FinvaKibanResponse,
  FinvaNeighborhoodsResponse,
  FinvaResult,
  FinvaSolicitud,
  FinvaStore,
  FinvaStoresResponse,
  FinvaUnknownClientPayload,
  FinvaValidateClientResponse,
  FinvaValidatePhoneResponse,
  FinvaZipResponse,
} from './types';

let warnedAboutScheme = false;

function baseUrl(): string {
  const raw = process.env.FINVA_API_URL?.trim();
  if (!raw) throw new Error('finva_api_url_missing');

  // Tolerante con typos comunes: si falta el esquema lo prepenamos (http para
  // hosts locales, https en otro caso) y avisamos UNA vez. Sin esto, Node fetch
  // dispara un "Failed to parse URL" críptico desde dentro de cada request.
  let normalized = raw;
  if (!/^https?:\/\//i.test(normalized)) {
    const isLocal = /^(127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\])(:\d+)?(\/|$)/i.test(normalized);
    const scheme = isLocal ? 'http://' : 'https://';
    normalized = scheme + normalized;
    if (!warnedAboutScheme) {
      warnedAboutScheme = true;
      console.warn(
        `[finva] FINVA_API_URL "${raw}" no tiene esquema. Asumiendo "${normalized}". ` +
          `Define la URL completa (e.g. http://127.0.0.1:5000/api) en .env para silenciar este aviso.`
      );
    }
  }

  try {
    new URL(normalized);
  } catch {
    throw new Error(
      `finva_api_url_invalid: "${raw}" no es una URL válida. ` +
        `Esperado algo como "http://127.0.0.1:5000/api" o "https://dev.finva.app/api".`
    );
  }

  return normalized.replace(/\/+$/, '');
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = process.env.FINVA_API_TOKEN?.trim();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) headers['Public-key'] = token;
  if (extra) Object.assign(headers, extra as Record<string, string>);
  return headers;
}

export function getHolding(): string {
  return process.env.FINVA_HOLDING?.trim() || 'motoclick';
}

/* ────────────────────────────── Logging ────────────────────────────────────
 * Cada request a Finva se loguea con un id corto para correlacionar request y
 * response. Los errores SIEMPRE se loguean (incluso en prod) con todo el body
 * que devolvió Finva. Las requests exitosas sólo se loguean cuando
 * `FINVA_DEBUG=1` o `NODE_ENV !== 'production'`.
 * ------------------------------------------------------------------------- */

const SENSITIVE_KEYS = new Set([
  'curp',
  'rfc',
  'rfc_pf',
  'phone',
  'phoneNumber',
  'phone_number',
  'email',
  'nip',
  'id_number',
  'birth_date',
  'fechaNacimiento',
  'address',
  'street_address',
  'Public-key',
]);

function maskValue(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  if (v.length <= 4) return '***';
  return `${v.slice(0, 2)}***${v.slice(-2)}`;
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.has(k) ? maskValue(v) : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

function parseBody(body: BodyInit | null | undefined): unknown {
  if (body == null) return undefined;
  if (typeof body !== 'string') return '[non-string body]';
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function shouldLogSuccess(): boolean {
  return process.env.FINVA_DEBUG === '1' || process.env.NODE_ENV !== 'production';
}

function makeReqId(): string {
  return Math.random().toString(36).slice(2, 8);
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { query?: Record<string, string | number | undefined | null> } = {}
): Promise<FinvaResult<T>> {
  const { query, headers, ...rest } = init;
  const qs = query
    ? '?' +
      Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  const url = `${baseUrl()}${path}${qs}`;
  const method = (rest.method || 'GET').toUpperCase();
  const reqId = makeReqId();
  const startedAt = Date.now();
  const redactedReqBody = redact(parseBody(rest.body as BodyInit | null | undefined));

  if (shouldLogSuccess()) {
    console.log(
      `[finva ${reqId}] → ${method} ${path}${qs}` +
        (redactedReqBody !== undefined ? ` body=${safeStringify(redactedReqBody)}` : '')
    );
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: authHeaders(headers),
      cache: 'no-store',
    });
  } catch (err) {
    const elapsed = Date.now() - startedAt;
    const details = err instanceof Error ? err.message : err;
    console.error(
      `[finva ${reqId}] ✗ ${method} ${path} network_error (${elapsed}ms) details=${safeStringify(details)}`
    );
    return { ok: false, status: 0, error: 'finva_network_error', details };
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* puede no traer body */
  }
  const elapsed = Date.now() - startedAt;

  if (!res.ok) {
    const error =
      (data && typeof data === 'object' && 'error' in data
        ? String((data as Record<string, unknown>).error)
        : null) || `finva_${res.status}`;
    console.error(
      `[finva ${reqId}] ✗ ${method} ${path} → ${res.status} (${elapsed}ms) ` +
        `error=${safeStringify(error)} details=${safeStringify(data)} ` +
        `reqBody=${safeStringify(redactedReqBody)}`
    );
    return { ok: false, status: res.status, error, details: data };
  }

  if (shouldLogSuccess()) {
    console.log(`[finva ${reqId}] ← ${method} ${path} → ${res.status} (${elapsed}ms)`);
  }
  return { ok: true, data: data as T };
}

// ── 0. Entry probe (validate_phone + validate_client) ─────────────────────
/**
 * `GET /validate_phone` — decide en una sola llamada si el contacto está
 * registrado, no registrado (HTTP 404), o si hay un mismatch (email ↔ phone).
 * El status 404 lo modelamos a nivel de `FinvaResult.status`.
 */
export function validatePhone(query: { email: string; phone: string }) {
  return request<FinvaValidatePhoneResponse>('/validate_phone', { query });
}

/**
 * `GET /validate_client` — sólo después de un `validate_phone` exitoso. Trae
 * el cliente completo + `report_id` si ya tiene reporte vigente.
 */
export function validateClient(query: { email: string; phone: string }) {
  return request<FinvaValidateClientResponse>('/validate_client', { query });
}

// ── 1. Lead ────────────────────────────────────────────────────────────────
export function unknownClient(payload: FinvaUnknownClientPayload) {
  return request<unknown>('/unknown-client', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── 2-3. Cliente ───────────────────────────────────────────────────────────
export function createCliente(payload: FinvaCliente) {
  return request<{ cliente_id: number } | FinvaCliente>('/cliente', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateCliente(clienteId: number, payload: Partial<FinvaCliente>) {
  return request<FinvaCliente>(`/cliente/${clienteId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// ── CURP / RFC / ZIP / Vecindarios ────────────────────────────────────────
export function validateCurp(payload: { curp: string; [k: string]: unknown }) {
  return request<Record<string, unknown>>('/validate-curp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function generateRfc(payload: {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  fechaNacimiento: string;
}) {
  // El backend Finva devuelve `{ status: "success", rfc: ... }` donde `rfc`
  // puede ser un string o un objeto anidado `{ response: { rfc } }`. El caller
  // se encarga de desempacar con `extractRfc()`.
  return request<Record<string, unknown>>('/generate_rfc', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function validateZipCode(zip: string) {
  return request<FinvaZipResponse>('/validate_zip_code', {
    method: 'POST',
    body: JSON.stringify({ zip_code: zip }),
  });
}

export function getNeighborhoods(zip: string) {
  return request<FinvaNeighborhoodsResponse | string[]>(
    `/get_neighborhoods/${encodeURIComponent(zip)}`
  );
}

/**
 * Normaliza la respuesta de `/get_neighborhoods/{cp}` independientemente del
 * shape (objeto nuevo `{ city, state, neighborhoods }` o array legacy).
 */
export function unwrapNeighborhoods(
  data: FinvaNeighborhoodsResponse | string[] | null | undefined
): FinvaNeighborhoodsResponse {
  if (!data) return {};
  if (Array.isArray(data)) return { neighborhoods: data };
  return {
    city: data.city,
    state: data.state,
    neighborhoods: Array.isArray(data.neighborhoods) ? data.neighborhoods : undefined,
  };
}

// ── 4-7. Buró Kiban ───────────────────────────────────────────────────────
export type SendNipKibanPayload = {
  first_name: string;
  second_name?: string;
  last_name_1: string;
  last_name_2?: string;
  birth_date: string;
  postal_code: string;
  rfc_pf?: string;
  phone: string;
  email: string;
  address: string;
  country_code: '+52';
};

export function sendNipKiban(payload: SendNipKibanPayload) {
  return request<{ response: FinvaKibanResponse } | FinvaKibanResponse>('/send_nip_kiban', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function resendNipKiban(payload: {
  workflooId: string;
  countryCode?: '+52';
  phoneNumber?: string;
}) {
  return request<{ response: FinvaKibanResponse } | FinvaKibanResponse>('/resend_nip_kiban', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function validateNipKiban(payload: { workflooId: string; nip: string }) {
  return request<{ response: FinvaKibanResponse } | FinvaKibanResponse>('/validate_nip_kiban', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getBcKiban(clienteId: number, workflooId: string) {
  return request<FinvaBcReport>(`/get_bc_kiban/${clienteId}`, {
    method: 'POST',
    body: JSON.stringify({ workflooId }),
  });
}

// ── 8. Solicitud ──────────────────────────────────────────────────────────
export function addSolicitud(payload: FinvaAddSolicitudPayload) {
  // El backend de Finva ya no acepta `id_motorcycle` y devuelve
  // `{"id_motorcycle":["Unknown field."]}` al recibirlo. Lo eliminamos antes de
  // serializar por si algún caller viejo lo incluye dentro de un spread.
  const sanitized: Record<string, unknown> = { ...(payload as Record<string, unknown>) };
  if ('id_motorcycle' in sanitized) delete sanitized.id_motorcycle;
  return request<{ solicitud: FinvaSolicitud } | { id: number } | FinvaSolicitud>(
    '/add_solicitud',
    { method: 'POST', body: JSON.stringify(sanitized) }
  );
}

export function getSolicitud(id: number) {
  return request<FinvaSolicitud>(`/solicitud/${id}`);
}

export function getSolicitudesByCliente(clienteId: number) {
  return request<FinvaSolicitud[]>(`/cliente/${clienteId}/solicitudes`);
}

// ── 9-11. Stores y advisors ───────────────────────────────────────────────
export function getStores(query: {
  /** Nuevo: query param se llama `brand`. */
  brand?: string;
  /** Alias legacy — algunos endpoints viejos aún esperan `marca`. */
  marca?: string;
  holding?: string;
  razon_social?: string;
  estado?: string;
  ciudad?: string;
}) {
  return request<FinvaStoresResponse | FinvaStore[]>('/get_stores', { query });
}

/**
 * Normaliza la respuesta de `/get_stores` independientemente del shape:
 *   - Nuevo: `{ stores_data: [...], status, count, ... }`
 *   - Legacy: `[...]` directo.
 */
export function unwrapStores(
  data: FinvaStoresResponse | FinvaStore[] | null | undefined
): FinvaStore[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return Array.isArray(data.stores_data) ? data.stores_data : [];
}

export function getNextUser(query: {
  store_id: number;
  client_email: string;
  client_phone: string;
}) {
  return request<FinvaAdvisor>('/get_next_user', { query });
}

export function getNextFinvaUser(query: { client_id?: number; holdingStore?: string } = {}) {
  return request<FinvaAdvisor>('/get_next_finva_user', { query });
}

export function getAdvisorDetails(finvaUserId: number) {
  return request<FinvaAdvisor>(`/get_advisor_details/${finvaUserId}`);
}

/**
 * Normaliza un asesor Finva (de `get_next_finva_user` o `get_advisor_details`)
 * al par nombre/teléfono que consume el paso 6 (WhatsApp). Devuelve `null` en
 * los campos que no vengan para poder aplicar fallbacks aguas arriba.
 */
export function advisorToAgent(
  advisor: FinvaAdvisor | null | undefined
): { agentName: string | null; agentPhone: string | null } {
  if (!advisor) return { agentName: null, agentPhone: null };
  const name = [advisor.name, advisor.first_last_name].filter(Boolean).join(' ').trim();
  return {
    agentName: name || null,
    agentPhone: advisor.phone_number ?? null,
  };
}

// ── Helpers para desempaquetar respuestas Kiban ──────────────────────────
export function unwrapKiban(res: FinvaKibanResponse | { response: FinvaKibanResponse }): FinvaKibanResponse {
  if (res && typeof res === 'object' && 'response' in res && res.response) {
    return res.response as FinvaKibanResponse;
  }
  return res as FinvaKibanResponse;
}
