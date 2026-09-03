import { createClient } from '@supabase/supabase-js';
import { motorcycleSeed } from '../data/motorcycle-seed';

function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const table = process.env.SUPABASE_MOTORCYCLES_TABLE || 'motorcycles';

  if (!url || !key) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local).'
    );
    process.exit(1);
  }

  const supabase = createClient(url, key);

  const rows = motorcycleSeed.map((m) => ({
    id: m.id,
    brand: m.brand,
    model: m.model,
    year: m.year,
    slug: m.slug,
    price: m.price,
    promo_price: m.promoPrice ?? null,
    category: m.category,
    engine_cc: m.engineCc,
    monthly_from: m.monthlyFrom,
    suggested_down_payment: m.suggestedDownPayment,
    short_description: m.shortDescription,
    priority_score: m.priorityScore,
    available_cities: m.availableCities,
    tags: m.tags,
    best_for: m.bestFor,
    specs: m.specs,
    image_url: m.imageUrl ?? null,
    gallery_urls: m.galleryUrls ?? [],
    purchase_url: m.purchaseUrl ?? null,
    published: true,
  }));

  return supabase.from(table).upsert(rows, { onConflict: 'id' });
}

main().then(({ error, count }) => {
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(`Upserted ${motorcycleSeed.length} rows into public.motorcycles (count hint: ${count ?? 'n/a'}).`);
});
