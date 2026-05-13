/** URL absoluta para enlaces de compra (columna `purchase_url` en Supabase). */
export function normalizeOutboundUrl(raw: string | null | undefined): string | null {
  const t = (raw ?? '').trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}
