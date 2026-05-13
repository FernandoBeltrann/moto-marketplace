import { motorcycleSeed } from '@/data/motorcycle-seed';
import { createServiceSupabase } from '@/lib/supabase/server';
import { brandPath } from '@/lib/catalog-format';
import type { Motorcycle } from '@/types/motorcycle';

export type { Motorcycle } from '@/types/motorcycle';
export { formatMXN, brandPath, productPath, cashPrice, listPriceIfPromo, promoPercentSaved } from '@/lib/catalog-format';

function motorcyclesTable() {
  return process.env.SUPABASE_MOTORCYCLES_TABLE || 'motorcycles';
}

function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function seedCatalogSorted(): Motorcycle[] {
  return [...motorcycleSeed].sort((a, b) => b.priorityScore - a.priorityScore);
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : String(v ?? '');
}

function asNumber(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x));
}

function asSpecs(v: unknown): Record<string, string> {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, String(val ?? '')])
    );
  }
  return {};
}

export function mapMotorcycleRow(row: Record<string, unknown>): Motorcycle {
  const rawList = asNumber(row.price);
  let promo: number | undefined;
  if (row.promo_price != null && row.promo_price !== '') {
    const n = asNumber(row.promo_price);
    if (n > 0 && n < rawList) promo = n;
  }
  return {
    id: asString(row.id),
    brand: asString(row.brand),
    model: asString(row.model),
    year: asNumber(row.year),
    slug: asString(row.slug),
    price: rawList,
    promoPrice: promo,
    category: asString(row.category),
    engineCc: asNumber(row.engine_cc),
    monthlyFrom: asNumber(row.monthly_from),
    suggestedDownPayment: asNumber(row.suggested_down_payment),
    availableCities: asStringArray(row.available_cities),
    tags: asStringArray(row.tags),
    shortDescription: asString(row.short_description),
    bestFor: asStringArray(row.best_for),
    specs: asSpecs(row.specs),
    priorityScore: asNumber(row.priority_score),
    imageUrl: row.image_url == null || row.image_url === '' ? null : asString(row.image_url),
    galleryUrls: asStringArray(row.gallery_urls),
    purchaseUrl:
      row.purchase_url == null || row.purchase_url === '' ? null : asString(row.purchase_url),
  };
}

export async function getMotorcycles(): Promise<Motorcycle[]> {
  if (!supabaseConfigured()) {
    if (process.env.SKIP_DB_CATALOG === '1') {
      console.warn('[catalog] SKIP_DB_CATALOG=1: usando semilla local (sin Supabase).');
      return seedCatalogSorted();
    }
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[catalog] Sin NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: usando semilla local en desarrollo.'
      );
      return seedCatalogSorted();
    }
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para leer el catálogo desde Supabase.'
    );
  }
  const supabase = createServiceSupabase();
  const { data, error } = await supabase
    .from(motorcyclesTable())
    .select('*')
    .eq('published', true)
    .order('priority_score', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapMotorcycleRow(row as Record<string, unknown>));
}

export async function getMotorcycleByPath(urlBrand: string, slug: string): Promise<Motorcycle | undefined> {
  const list = await getMotorcycles();
  const norm = decodeURIComponent(urlBrand).toLowerCase();
  return list.find((m) => brandPath(m.brand) === norm && m.slug === slug);
}

export async function getBrands(): Promise<string[]> {
  const list = await getMotorcycles();
  return Array.from(new Set(list.map((m) => m.brand))).sort();
}

export async function getCategories(): Promise<string[]> {
  const list = await getMotorcycles();
  return Array.from(new Set(list.map((m) => m.category))).sort();
}
