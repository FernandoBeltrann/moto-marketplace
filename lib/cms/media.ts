/**
 * Imágenes disponibles para el builder: las del bucket de Supabase Storage
 * (las mismas que ya usa el sitio) más las que ya están referenciadas en el
 * catálogo y el blog. Marketing las elige visualmente en el módulo Imagen.
 */
import { createServiceSupabase } from '@/lib/supabase/server';
import { getMotorcycles } from '@/lib/catalog';
import { getBlogPosts } from '@/lib/blog';
import { absoluteAssetUrl } from '@/lib/product-jsonld';

export type MediaImage = { name: string; url: string; source: 'bucket' | 'catalogo' | 'blog' };

function bucket() {
  return process.env.STORAGE_SUPABASE_BUCKET || 'motorcycle-images';
}
function base() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
}
function publicUrl(name: string) {
  return `${base()}/storage/v1/object/public/${bucket()}/${name}`;
}
const IMG = /\.(png|jpe?g|webp|avif|gif|svg)$/i;

/** Lista archivos de imagen del bucket vía la Storage API (service role). */
async function fromBucket(limit = 100): Promise<MediaImage[]> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !base()) return [];
  const out: MediaImage[] = [];
  async function listPrefix(prefix: string) {
    const res = await fetch(`${base()}/storage/v1/object/list/${bucket()}`, {
      method: 'POST',
      headers: { apikey: key!, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit, offset: 0, sortBy: { column: 'name', order: 'asc' } }),
    });
    if (!res.ok) return;
    const items = (await res.json()) as Array<{ name: string; id: string | null; metadata?: { mimetype?: string } }>;
    for (const it of items) {
      const path = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id === null) {
        // carpeta: baja un nivel (una sola profundidad para v1)
        if (!prefix) await listPrefix(it.name);
        continue;
      }
      const isImg = IMG.test(it.name) || (it.metadata?.mimetype || '').startsWith('image/');
      if (isImg) out.push({ name: path, url: publicUrl(path), source: 'bucket' });
    }
  }
  try { await listPrefix(''); } catch { /* ignore */ }
  return out;
}

export async function listMediaImages(): Promise<MediaImage[]> {
  const seen = new Set<string>();
  const push = (arr: MediaImage[], img: MediaImage) => { if (img.url && !seen.has(img.url)) { seen.add(img.url); arr.push(img); } };
  const out: MediaImage[] = [];

  for (const img of await fromBucket().catch(() => [])) push(out, img);

  try {
    for (const m of (await getMotorcycles()).slice(0, 40)) {
      if (m.imageUrl) push(out, { name: `${m.brand} ${m.model}`, url: absoluteAssetUrl(m.imageUrl), source: 'catalogo' });
      for (const g of m.galleryUrls ?? []) push(out, { name: `${m.brand} ${m.model} (galería)`, url: absoluteAssetUrl(g), source: 'catalogo' });
    }
  } catch { /* ignore */ }

  try {
    for (const p of await getBlogPosts()) {
      if (p.coverImageUrl) push(out, { name: p.title, url: absoluteAssetUrl(p.coverImageUrl), source: 'blog' });
    }
  } catch { /* ignore */ }

  return out;
}
