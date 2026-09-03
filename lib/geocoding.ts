/**
 * ZIP (CP) → coordenadas usando Google Maps Geocoding API.
 * Server-only: GOOGLE_MAPS_API_KEY NUNCA debe exponerse al cliente.
 *
 * Cache en memoria por proceso para evitar hits repetidos al API durante el
 * mismo deploy.
 */
const cache = new Map<string, { lat: number; lng: number } | null>();

export type LatLng = { lat: number; lng: number };

export async function geocodeMxZip(zip: string): Promise<LatLng | null> {
  const cp = (zip || '').trim();
  if (!/^\d{5}$/.test(cp)) return null;
  if (cache.has(cp)) return cache.get(cp) ?? null;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[geocoding] GOOGLE_MAPS_API_KEY no configurada — devuelvo null.');
    }
    cache.set(cp, null);
    return null;
  }

  const url =
    'https://maps.googleapis.com/maps/api/geocode/json' +
    `?components=country:MX|postal_code:${cp}` +
    `&key=${apiKey}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      cache.set(cp, null);
      return null;
    }
    const data = (await res.json()) as {
      status?: string;
      results?: Array<{ geometry?: { location?: LatLng } }>;
    };
    const loc = data.results?.[0]?.geometry?.location;
    if (data.status !== 'OK' || !loc) {
      cache.set(cp, null);
      return null;
    }
    const out = { lat: Number(loc.lat), lng: Number(loc.lng) };
    if (!Number.isFinite(out.lat) || !Number.isFinite(out.lng)) {
      cache.set(cp, null);
      return null;
    }
    cache.set(cp, out);
    return out;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[geocoding] error consultando Google Maps:', err);
    }
    cache.set(cp, null);
    return null;
  }
}
