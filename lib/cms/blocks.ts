/**
 * Registry + validación de bloques. Análogo a `src/runtime/registry.ts` +
 * `validation.ts` del hackathon: un tipo desconocido nunca rompe el render,
 * y un doc inválido se normaliza a algo seguro en vez de tumbar la página.
 *
 * En v1 la validación es a mano (sin ajv) para no sumar dependencias; la
 * forma canónica vive en types/cms.ts. Si el doc crece, migrar a un JSON
 * Schema generado desde los tipos (igual que el hackathon).
 */
import type { CmsBlock, CmsBlockType, CmsPageDoc, CmsSchemaMeta } from '@/types/cms';

export const KNOWN_BLOCK_TYPES: readonly CmsBlockType[] = [
  'heading',
  'paragraph',
  'image',
  'button',
  'faq',
  'input',
  'html',
] as const;

const SCHEMA_TYPES: CmsSchemaMeta['type'][] = ['WebPage', 'Article', 'AboutPage', 'FAQPage'];

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

/**
 * Normaliza un bloque arbitrario (viene del LLM o del editor) a un CmsBlock
 * válido. Devuelve null si es irrecuperable, para que el llamador lo descarte
 * en vez de renderizar basura.
 */
export function normalizeBlock(raw: unknown): CmsBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  const type = b.type as CmsBlockType;
  if (!KNOWN_BLOCK_TYPES.includes(type)) return null;

  switch (type) {
    case 'heading': {
      const level = [1, 2, 3].includes(Number(b.level)) ? (Number(b.level) as 1 | 2 | 3) : 2;
      const text = str(b.text).trim();
      return text ? { type, level, text, id: b.id ? str(b.id) : undefined } : null;
    }
    case 'paragraph': {
      const html = str(b.html).trim();
      return html ? { type, html } : null;
    }
    case 'image': {
      const url = str(b.url).trim();
      if (!url) return null;
      const widths = ['auto', 'small', 'medium', 'large', 'full'];
      const width = widths.includes(b.width as string) ? (b.width as 'auto' | 'small' | 'medium' | 'large' | 'full') : undefined;
      const align = ['left', 'center', 'right'].includes(b.align as string) ? (b.align as 'left' | 'center' | 'right') : undefined;
      const fit = ['contain', 'cover'].includes(b.fit as string) ? (b.fit as 'contain' | 'cover') : undefined;
      const height = Number(b.height) > 0 ? Math.round(Number(b.height)) : undefined;
      return { type, url, alt: str(b.alt), caption: b.caption ? str(b.caption) : undefined, width, align, fit, height };
    }
    case 'button': {
      const label = str(b.label).trim();
      const href = str(b.href).trim();
      const variant = b.variant === 'secondary' ? 'secondary' : 'primary';
      return label && href ? { type, label, href, variant } : null;
    }
    case 'faq': {
      const items = Array.isArray(b.items)
        ? b.items
            .map((it) => {
              const o = (it || {}) as Record<string, unknown>;
              return { q: str(o.q).trim(), a: str(o.a).trim() };
            })
            .filter((it) => it.q && it.a)
        : [];
      return items.length ? { type, items } : null;
    }
    case 'input': {
      const label = str(b.label).trim();
      const name = (str(b.name).trim() || label).replace(/[^a-zA-Z0-9_-]+/g, '_').toLowerCase();
      const kinds = ['text', 'email', 'tel', 'number', 'textarea', 'select', 'checkbox'] as const;
      type InputKind = (typeof kinds)[number];
      const inputType: InputKind = (kinds as readonly string[]).includes(String(b.inputType)) ? (b.inputType as InputKind) : 'text';
      const options = Array.isArray(b.options) ? b.options.map((o) => str(o)).filter(Boolean) : undefined;
      return label
        ? ({ type, inputType, label, name, placeholder: b.placeholder ? str(b.placeholder) : undefined, required: b.required === true, options } as CmsBlock)
        : null;
    }
    case 'html': {
      const html = str(b.html).trim();
      return html ? { type, html } : null;
    }
    default:
      return null;
  }
}

/** Normaliza y sanea un doc completo. Nunca lanza; siempre devuelve algo renderizable. */
export function normalizeDoc(raw: unknown, fallbackSlug = 'nueva-pagina'): CmsPageDoc {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const blocks = Array.isArray(d.blocks)
    ? d.blocks.map(normalizeBlock).filter((b): b is CmsBlock => b !== null)
    : [];

  const rawSchema = (d.schema || {}) as Record<string, unknown>;
  const schemaType = SCHEMA_TYPES.includes(rawSchema.type as CmsSchemaMeta['type'])
    ? (rawSchema.type as CmsSchemaMeta['type'])
    : 'WebPage';

  return {
    slug: slugify(str(d.slug) || fallbackSlug),
    title: str(d.title) || 'Página sin título',
    description: d.description ? str(d.description) : null,
    ogImageUrl: d.ogImageUrl ? str(d.ogImageUrl) : null,
    blocks,
    schema: {
      type: schemaType,
      author: rawSchema.author ? str(rawSchema.author) : null,
      datePublished: rawSchema.datePublished ? str(rawSchema.datePublished) : null,
      dateModified: rawSchema.dateModified ? str(rawSchema.dateModified) : null,
      breadcrumb: Array.isArray(rawSchema.breadcrumb)
        ? (rawSchema.breadcrumb as Array<Record<string, unknown>>)
            .map((c) => ({ name: str(c.name), url: str(c.url) }))
            .filter((c) => c.name && c.url)
        : undefined,
    },
  };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'pagina';
}

/**
 * Saneo mínimo de HTML para bloques `html`/`paragraph`. Quita <script>,
 * <iframe> y atributos on*. NO es un sanitizador de nivel producción — antes
 * de exponer el Studio a usuarios reales, cambiar por sanitize-html o DOMPurify
 * en servidor (ver documento de arquitectura, sección Seguridad).
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<\s*(script|iframe|object|embed)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed)[^>]*\/?>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, '$1="#"');
}
