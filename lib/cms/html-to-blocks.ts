/**
 * Parser determinista HTML -> bloques canónicos. Es el corazón del flujo
 * "HTML primero": Marketing edita/pega HTML y ESTO lo adapta a nuestro
 * framework (bloques -> render Next.js), sin depender del LLM. Isomorfo
 * (regex, sirve en servidor y cliente).
 *
 * Cobertura v1: h1–h6 (h4+ -> h3), p, img, a (-> button), ul/ol y blockquote
 * (-> html crudo saneado). Lo que no reconoce se preserva como bloque html.
 */
import type { CmsBlock } from '@/types/cms';
import { normalizeBlock } from '@/lib/cms/blocks';

function attr(tag: string, name: string): string {
  const m = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i').exec(tag) || new RegExp(`${name}\\s*=\\s*'([^']*)'`, 'i').exec(tag);
  return m ? m[1] : '';
}
function inner(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

export function htmlToBlocks(html: string): CmsBlock[] {
  const raw: unknown[] = [];
  const re = /<(h[1-6]|p|img|a|ul|ol|blockquote)\b([^>]*)>([\s\S]*?)<\/\1>|<img\b([^>]*)\/?>/gi;
  let m: RegExpExecArray | null;
  let matchedAny = false;
  while ((m = re.exec(html)) !== null) {
    matchedAny = true;
    const tag = (m[1] || 'img').toLowerCase();
    if (tag === 'img') {
      const a = m[2] || m[4] || '';
      const src = attr(a, 'src');
      if (src) raw.push({ type: 'image', url: src, alt: attr(a, 'alt') });
      continue;
    }
    const attrs = m[2] || '';
    const body = m[3] || '';
    if (/^h[1-6]$/.test(tag)) {
      const lvl = Number(tag[1]);
      raw.push({ type: 'heading', level: lvl >= 3 ? 3 : lvl, text: inner(body) });
    } else if (tag === 'p') {
      const t = body.trim();
      if (t) raw.push({ type: 'paragraph', html: t });
    } else if (tag === 'a') {
      raw.push({ type: 'button', label: inner(body) || 'Ver más', href: attr(attrs, 'href') || '#', variant: /secondary/i.test(attrs) ? 'secondary' : 'primary' });
    } else if (tag === 'ul' || tag === 'ol' || tag === 'blockquote') {
      raw.push({ type: 'html', html: m[0] });
    }
  }
  const blocks = raw.map(normalizeBlock).filter((b): b is CmsBlock => b !== null);
  if (!blocks.length && html.trim()) {
    const fallback = normalizeBlock({ type: 'html', html: html.trim() });
    if (fallback) blocks.push(fallback);
  }
  return blocks;
}
