import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { motorcycleSeed } from '../data/motorcycle-seed';

/** Escape for single-quoted SQL literals. */
function esc(s: string) {
  return s.replace(/'/g, "''");
}

function jsonbDollar(tag: string, obj: unknown) {
  return `$${tag}$${JSON.stringify(obj)}$${tag}$::jsonb`;
}

const values = motorcycleSeed.map((m) => {
  const cols = [
    `'${esc(m.id)}'`,
    `'${esc(m.brand)}'`,
    `'${esc(m.model)}'`,
    String(m.year),
    `'${esc(m.slug)}'`,
    String(m.price),
    m.promoPrice != null ? String(m.promoPrice) : 'null',
    `'${esc(m.category)}'`,
    String(m.engineCc),
    String(m.monthlyFrom),
    String(m.suggestedDownPayment),
    `'${esc(m.shortDescription)}'`,
    String(m.priorityScore),
    jsonbDollar('cities', m.availableCities),
    jsonbDollar('tags', m.tags),
    jsonbDollar('best', m.bestFor),
    jsonbDollar('specs', m.specs),
    m.imageUrl ? `'${esc(m.imageUrl)}'` : 'null',
    jsonbDollar('gal', m.galleryUrls ?? []),
    'true',
  ];
  // Avoid outer `...${cols}` — a closing `$` before JSON `{` becomes `${` in templates.
  return '(\n  ' + cols.join(',\n  ') + '\n)';
});

const sql = `insert into public.motorcycles (
  id, brand, model, year, slug, price, promo_price, category, engine_cc,
  monthly_from, suggested_down_payment, short_description, priority_score,
  available_cities, tags, best_for, specs, image_url, gallery_urls, published
)
values
${values.join(',\n')}
on conflict (id) do update set
  brand = excluded.brand,
  model = excluded.model,
  year = excluded.year,
  slug = excluded.slug,
  price = excluded.price,
  promo_price = excluded.promo_price,
  category = excluded.category,
  engine_cc = excluded.engine_cc,
  monthly_from = excluded.monthly_from,
  suggested_down_payment = excluded.suggested_down_payment,
  short_description = excluded.short_description,
  priority_score = excluded.priority_score,
  available_cities = excluded.available_cities,
  tags = excluded.tags,
  best_for = excluded.best_for,
  specs = excluded.specs,
  image_url = excluded.image_url,
  gallery_urls = excluded.gallery_urls,
  published = excluded.published;
`;

const out = resolve(process.cwd(), 'sql/seed_motorcycles.sql');
writeFileSync(out, `${sql}\n`, 'utf8');
console.log(`Wrote ${out}`);
