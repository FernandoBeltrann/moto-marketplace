/**
 * FIN-151: eventos estándar del pixel de Meta, con copia por servidor.
 *
 * `metaEvent()` genera un `eventID`, dispara `fbq('track', …, { eventID })` y
 * manda lo mismo a `/api/meta/event`, que lo reenvía a Conversions API: Meta
 * se queda con uno. `metaBrowserEvent()` es solo navegador (`Search`).
 *
 * Sin `NEXT_PUBLIC_META_PIXEL_ID` no hace nada. Sin datos personales.
 * Sin imports de `@/`: la puede copiar tal cual otro sitio (motoclick-builder).
 */
import type { MetaCustomData, MetaServerEventName } from './capi';

export type { MetaCustomData, MetaServerEventName };

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
const ENDPOINT = '/api/meta/event';
const EVENT_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

type Fbq = (...args: unknown[]) => void;

export function metaEnabled(): boolean {
  return !!PIXEL_ID && typeof window !== 'undefined';
}

export function newEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

/** `fbq` existe en cuanto corre el snippet del pixel; si aún no, se espera hasta 10 s. */
function withFbq(run: (fbq: Fbq) => void) {
  const fbq = (window as { fbq?: Fbq }).fbq;
  if (fbq) {
    run(fbq);
    return;
  }
  const started = Date.now();
  const timer = window.setInterval(() => {
    const ready = (window as { fbq?: Fbq }).fbq;
    if (ready) {
      window.clearInterval(timer);
      run(ready);
    } else if (Date.now() - started > 10_000) {
      window.clearInterval(timer);
    }
  }, 100);
}

const FBCLID_RE = /^[A-Za-z0-9_-]{10,500}$/;
const FBC_RE = /^fb\.\d\.\d{10,13}\.[A-Za-z0-9_.-]{1,1000}$/;
const FBC_MAX_AGE_S = 90 * 24 * 60 * 60;

function readBrowserCookie(name: string): string | undefined {
  for (const part of document.cookie.split(';')) {
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

/** `; domain=.motoclick.mx` (el mismo dominio donde el pixel deja `_fbc`); nada en localhost. */
function cookieDomain(): string {
  const host = window.location.hostname;
  if (host === 'localhost' || !host.includes('.') || /^[\d.]+$/.test(host)) return '';
  return `; domain=.${host.replace(/^www\./, '')}`;
}

/**
 * FIN-149: `fbc` con la hora del clic al anuncio, no la de cada evento.
 *
 * Si la página llega con `fbclid` y no hay una cookie `_fbc` de ese mismo
 * clic, la dejamos nosotros (`fb.1.<ms de llegada>.<fbclid>`, 90 días), igual
 * que el pixel. El pixel la respeta al cargar porque es del mismo `fbclid`, y
 * si el pixel está bloqueado el servidor igual la recibe en cada evento,
 * también en las páginas que ya no traen `fbclid`.
 */
export function rememberMetaClick(): string | undefined {
  try {
    const current = readBrowserCookie('_fbc');
    const fbclid = new URLSearchParams(window.location.search).get('fbclid') ?? '';
    if (FBCLID_RE.test(fbclid) && !current?.endsWith(`.${fbclid}`)) {
      const value = `fb.1.${Date.now()}.${fbclid}`;
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `_fbc=${value}; path=/; max-age=${FBC_MAX_AGE_S}; SameSite=Lax${cookieDomain()}${secure}`;
      return value;
    }
    return current && FBC_RE.test(current) ? current : undefined;
  } catch {
    return undefined;
  }
}

function sendCopy(name: MetaServerEventName, eventId: string, data: MetaCustomData) {
  const body = JSON.stringify({
    event_name: name,
    event_id: eventId,
    event_source_url: `${window.location.origin}${window.location.pathname}`,
    custom_data: Object.keys(data).length ? data : undefined,
    fbc: rememberMetaClick(),
  });
  try {
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))) return;
  } catch {
    /* sigue con fetch */
  }
  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => {
    /* la medición nunca rompe la página */
  });
}

/**
 * Evento estándar por navegador y servidor con el mismo `eventID`. Si el aviso
 * viene del package con su propio `eventId`, se usa ese. Devuelve el id usado.
 */
export function metaEvent(
  name: MetaServerEventName,
  data: MetaCustomData = {},
  eventId?: string
): string | undefined {
  if (!metaEnabled()) return undefined;
  const id = eventId && EVENT_ID_RE.test(eventId) ? eventId : newEventId();
  withFbq((fbq) => fbq('track', name, data, { eventID: id }));
  sendCopy(name, id, data);
  return id;
}

/** Solo navegador (Meta no necesita `Search` por servidor). */
export function metaBrowserEvent(name: 'Search', data: { search_string: string }) {
  if (!metaEnabled() || !data.search_string.trim()) return;
  withFbq((fbq) => fbq('track', name, { search_string: data.search_string.trim().slice(0, 200) }));
}

/** Datos de producto de una moto para `ViewContent` / `InitiateCheckout`. */
export function motoContent(moto: {
  slug: string;
  brand: string;
  model?: string;
  year?: number;
  price?: number;
}): MetaCustomData {
  const name = [moto.brand, moto.model, moto.year].filter(Boolean).join(' ');
  const data: MetaCustomData = {
    content_ids: [moto.slug],
    content_type: 'product',
    content_name: name || undefined,
    content_category: moto.brand,
  };
  if (typeof moto.price === 'number' && moto.price > 0) {
    data.value = moto.price;
    data.currency = 'MXN';
  }
  return data;
}

/** `/motos/<marca>/<slug>` → `slug`; para `Contact` en la ficha. */
export function motoSlugFromPath(pathname: string): string | undefined {
  const match = /^\/motos\/[^/]+\/([^/?#]+)/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : undefined;
}

const WHATSAPP_HREF_RE = /^(https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\/|whatsapp:)/i;

export function isWhatsappHref(href: string | null | undefined): boolean {
  return !!href && WHATSAPP_HREF_RE.test(href.trim());
}
