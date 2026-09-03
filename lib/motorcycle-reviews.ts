import { createServiceSupabase } from '@/lib/supabase/server';
import type { MotorcycleReview } from '@/types/motorcycle-review';

function reviewsTable() {
  return process.env.SUPABASE_MOTORCYCLE_REVIEWS_TABLE || 'motorcycle_reviews';
}

function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : String(v ?? '');
}

function asNumber(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapReviewRow(row: Record<string, unknown>): MotorcycleReview {
  return {
    id: asString(row.id),
    motorcycleId: asString(row.motorcycle_id),
    authorName: asString(row.author_name),
    rating: Math.min(5, Math.max(1, Math.round(asNumber(row.rating)))),
    title: row.title == null || row.title === '' ? null : asString(row.title),
    body: asString(row.body),
    publishedAt: asString(row.published_at),
  };
}

/** Reseñas visibles para una moto. Sin Supabase devuelve []. */
export async function getMotorcycleReviews(motorcycleId: string): Promise<MotorcycleReview[]> {
  if (!supabaseConfigured()) return [];
  try {
    const supabase = createServiceSupabase();
    const { data, error } = await supabase
      .from(reviewsTable())
      .select('id, motorcycle_id, author_name, rating, title, body, published_at')
      .eq('motorcycle_id', motorcycleId)
      .eq('published', true)
      .order('published_at', { ascending: false });
    if (error) {
      const msg = error.message || '';
      if (!/schema cache|does not exist|not find/i.test(msg)) {
        console.warn('[motorcycle-reviews]', msg);
      }
      return [];
    }
    return (data ?? []).map((row) => mapReviewRow(row as Record<string, unknown>));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/schema cache|does not exist|not find/i.test(msg)) {
      console.warn('[motorcycle-reviews]', msg);
    }
    return [];
  }
}
