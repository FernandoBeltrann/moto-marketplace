/**
 * Selecciona la sucursal Finva más cercana al cliente usando Haversine.
 * No usa store de "ciudad/estado" como criterio principal — sólo coordenadas.
 */
import type { FinvaStore } from './types';
import type { LatLng } from '@/lib/geocoding';
import { getStores, getHolding, unwrapStores } from './client';

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function getDistanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export type PickStoreResult = {
  store: FinvaStore;
  distanceKm: number | null;
  fallback: boolean;
};

export async function pickNearestStore(params: {
  brand: string;
  clientCoords?: LatLng | null;
  estado?: string;
  ciudad?: string;
}): Promise<PickStoreResult | null> {
  const holding = getHolding();
  const result = await getStores({ brand: params.brand.toLowerCase(), holding });
  if (!result.ok) return null;
  const stores = unwrapStores(result.data).filter((s) => s.active !== false);
  if (stores.length === 0) return null;

  if (params.clientCoords) {
    const radius = Number(process.env.FINVA_STORE_RADIUS_KM || 120);
    const ranked = stores
      .filter((s) => s.coordinates?.lat != null && s.coordinates?.lng != null)
      .map((s) => ({
        store: s,
        distanceKm: getDistanceKm(params.clientCoords as LatLng, s.coordinates as LatLng),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const inRadius = ranked.find((r) => r.distanceKm <= radius);
    if (inRadius) return { ...inRadius, fallback: false };
    if (ranked[0]) return { ...ranked[0], fallback: true };
  }

  // Fallback: filtrar por estado/ciudad si vinieron, si no la primera.
  const byCity =
    (params.ciudad && stores.find((s) => s.ciudad?.toLowerCase() === params.ciudad?.toLowerCase())) ||
    (params.estado && stores.find((s) => s.estado?.toLowerCase() === params.estado?.toLowerCase()));
  return {
    store: byCity || stores[0],
    distanceKm: null,
    fallback: true,
  };
}
