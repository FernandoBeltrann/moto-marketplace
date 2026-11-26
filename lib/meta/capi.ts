/**
 * FIN-151: copia por servidor (Conversions API) de los eventos del pixel de Meta.
 *
 * El navegador dispara `fbq('track', evento, datos, { eventID })` y manda lo
 * mismo a `/api/meta/event`; aquí se reenvía a Meta con el mismo `event_name`
 * y `event_id`, así Meta se queda con uno si llegan los dos (48 h).
 *
 * - Solo eventos de la lista: `Search` va únicamente por navegador.
 * - Sin datos personales: el sitio no los tiene. Viajan la IP y el navegador
 *   (Meta los pide en todo evento de sitio) y las cookies `_fbp` / `_fbc`.
 * - El token vive solo en el servidor (`META_CAPI_TOKEN`, nunca `NEXT_PUBLIC_`).
 *   Sin `META_DATASET_ID` o sin token no se manda nada.
 *
 * Sin imports de `@/`: es una pieza que puede copiar tal cual otro sitio
 * (motoclick-builder).
 */

export const SERVER_EVENTS = ['PageView', 'ViewContent', 'Contact', 'InitiateCheckout'] as const;
export type MetaServerEventName = (typeof SERVER_EVENTS)[number];

export type MetaCustomData = {
  content_ids?: string[];
  content_type?: 'product';
  content_name?: string;
  content_category?: string;
  value?: number;
  currency?: 'MXN';
};

export type MetaEventBody = {
  event_name: MetaServerEventName;
  event_id: string;
  event_source_url: string;
  custom_data?: MetaCustomData;
  fbclid?: string;
};

export type MetaCapiConfig = {
  datasetId?: string;
  token?: string;
  testEventCode?: string;
  apiVersion?: string;
  /** Hosts aceptados en `event_source_url` (sin `www.`). */
  allowedHosts: string[];
};

const EVENT_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const FBP_RE = /^fb\.\d\.\d{10,13}\.\d+(\.[A-Za-z0-9_-]{1,40})?$/;
const FBC_RE = /^fb\.\d\.\d{10,13}\.[A-Za-z0-9_.-]{1,1000}$/;
const FBCLID_RE = /^[A-Za-z0-9_-]{10,500}$/;
const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[0-9a-fA-F:]{2,45}$/;

export function configFromEnv(env: Record<string, string | undefined> = process.env): MetaCapiConfig {
  const hosts = (env.META_CAPI_ALLOWED_HOSTS || 'motoclick.mx')
    .split(',')
    .map((h) => h.trim().toLowerCase().replace(/^www\./, ''))
    .filter(Boolean);
  return {
    datasetId: env.META_DATASET_ID?.trim() || undefined,
    token: env.META_CAPI_TOKEN?.trim() || undefined,
    testEventCode: env.META_CAPI_TEST_EVENT_CODE?.trim() || undefined,
    apiVersion: env.META_CAPI_API_VERSION?.trim() || 'v25.0',
    allowedHosts: hosts,
  };
}

function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.replace(/\s+/g, ' ').trim().slice(0, max);
  return text || undefined;
}

/** Página del sitio sin query ni hash; `undefined` si es de otro host. */
export function cleanSourceUrl(value: unknown, allowedHosts: string[]): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const local = host === 'localhost' || host === '127.0.0.1';
    if (!local && !allowedHosts.includes(host)) return undefined;
    return `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
}

export function cleanCustomData(value: unknown): MetaCustomData | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const out: MetaCustomData = {};
  if (Array.isArray(raw.content_ids)) {
    const ids = raw.content_ids.map((id) => cleanText(id, 100)).filter((id): id is string => !!id);
    if (ids.length) out.content_ids = ids.slice(0, 5);
  }
  if (raw.content_type === 'product') out.content_type = 'product';
  const name = cleanText(raw.content_name, 200);
  if (name) out.content_name = name;
  const category = cleanText(raw.content_category, 100);
  if (category) out.content_category = category;
  if (typeof raw.value === 'number' && Number.isFinite(raw.value) && raw.value >= 0 && raw.value < 10_000_000) {
    out.value = Math.round(raw.value * 100) / 100;
    out.currency = 'MXN';
  }
  return Object.keys(out).length ? out : undefined;
}

/** Valida lo que manda el navegador; `null` si no es un evento aceptable. */
export function parseEventBody(value: unknown, allowedHosts: string[]): MetaEventBody | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const name = raw.event_name;
  if (typeof name !== 'string' || !(SERVER_EVENTS as readonly string[]).includes(name)) return null;
  if (typeof raw.event_id !== 'string' || !EVENT_ID_RE.test(raw.event_id)) return null;
  const sourceUrl = cleanSourceUrl(raw.event_source_url, allowedHosts);
  if (!sourceUrl) return null;
  const body: MetaEventBody = {
    event_name: name as MetaServerEventName,
    event_id: raw.event_id,
    event_source_url: sourceUrl,
  };
  const custom = cleanCustomData(raw.custom_data);
  if (custom) body.custom_data = custom;
  if (typeof raw.fbclid === 'string' && FBCLID_RE.test(raw.fbclid)) body.fbclid = raw.fbclid;
  return body;
}

/** IP del cliente: primer valor de `x-forwarded-for` (proxy de Railway), si no `x-real-ip`. */
export function clientIp(headers: Headers): string | undefined {
  const xff = headers.get('x-forwarded-for');
  const candidate = (xff ? xff.split(',')[0] : headers.get('x-real-ip') ?? '').trim();
  return IPV4_RE.test(candidate) || (candidate.includes(':') && IPV6_RE.test(candidate))
    ? candidate
    : undefined;
}

export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return rest.join('=');
      }
    }
  }
  return undefined;
}

/**
 * Evento para Conversions API. `fbc` sale de la cookie `_fbc`; si todavía no
 * existe pero la página trae `fbclid`, se arma como pide Meta:
 * `fb.1.<ms>.<fbclid>`.
 */
export function buildServerEvent(
  body: MetaEventBody,
  request: { headers: Headers },
  now: Date = new Date()
): Record<string, unknown> {
  const cookies = request.headers.get('cookie');
  const userData: Record<string, string> = {};
  const ip = clientIp(request.headers);
  if (ip) userData.client_ip_address = ip;
  const userAgent = request.headers.get('user-agent')?.trim().slice(0, 512);
  if (userAgent) userData.client_user_agent = userAgent;
  const fbp = readCookie(cookies, '_fbp');
  if (fbp && FBP_RE.test(fbp)) userData.fbp = fbp;
  const fbc = readCookie(cookies, '_fbc');
  if (fbc && FBC_RE.test(fbc)) userData.fbc = fbc;
  else if (body.fbclid) userData.fbc = `fb.1.${now.getTime()}.${body.fbclid}`;

  const event: Record<string, unknown> = {
    event_name: body.event_name,
    event_time: Math.floor(now.getTime() / 1000),
    event_id: body.event_id,
    action_source: 'website',
    event_source_url: body.event_source_url,
    user_data: userData,
  };
  if (body.custom_data) event.custom_data = body.custom_data;
  return event;
}

type Fetcher = (url: string, init: RequestInit) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

/** Manda un evento; nunca lanza (la medición no rompe la página). */
export async function sendServerEvent(
  event: Record<string, unknown>,
  config: MetaCapiConfig,
  fetcher: Fetcher = fetch
): Promise<{ sent: boolean; status?: number }> {
  if (!config.datasetId || !config.token) return { sent: false };
  const url = `https://graph.facebook.com/${config.apiVersion}/${encodeURIComponent(config.datasetId)}/events`;
  const payload: Record<string, unknown> = { data: [event], access_token: config.token };
  if (config.testEventCode) payload.test_event_code = config.testEventCode;
  try {
    const res = await fetcher(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300);
      console.warn('[meta-capi] Meta rechazó el evento', event.event_name, res.status, detail);
    }
    return { sent: res.ok, status: res.status };
  } catch (error) {
    console.warn('[meta-capi] no se pudo mandar el evento', event.event_name, (error as Error).name);
    return { sent: false };
  }
}

/** Route handler completo: valida, arma y reenvía. Responde 204 siempre que el cuerpo sea válido. */
export async function handleMetaEventRequest(
  request: Request,
  config: MetaCapiConfig = configFromEnv(),
  fetcher?: Fetcher
): Promise<Response> {
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 4096) return new Response(null, { status: 413 });
    raw = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const body = parseEventBody(raw, config.allowedHosts);
  if (!body) return new Response(null, { status: 400 });
  await sendServerEvent(buildServerEvent(body, request), config, fetcher);
  return new Response(null, { status: 204 });
}
