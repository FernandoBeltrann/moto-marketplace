/**
 * Contrato canónico del CMS agéntico (fuente de verdad = JSON de bloques).
 *
 * Este archivo es el análogo de `src/runtime/contracts.ts` del hackathon:
 * un contrato pequeño y CONGELADO que todas las capas comparten. El
 * orquestador (LLM/determinista) SOLO produce un `CmsPageDoc`; renderizarlo a
 * HTML (`lib/cms/render.ts`) y a Schema.org (`lib/cms/schema-jsonld.ts`) es
 * determinista. Marketing edita bloques o HTML, pero lo versionado y
 * publicado siempre es este JSON.
 *
 * Regla de oro: agregar un tipo de bloque nuevo se hace SOLO aquí + en el
 * registry (`lib/cms/blocks.ts`) + en el render. Nada fuera de esos tres
 * lugares conoce la forma de un bloque.
 */

/** Tipos de bloque soportados en v1. El registry valida contra esta unión. */
export type CmsBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string; id?: string }
  | { type: 'paragraph'; html: string }
  | {
      type: 'image';
      url: string;
      alt: string;
      caption?: string;
      /** Ancho: 'auto' = responsivo al 100%; presets con max-width. */
      width?: 'auto' | 'small' | 'medium' | 'large' | 'full';
      /** Alineación cuando el ancho no es completo. */
      align?: 'left' | 'center' | 'right';
      /** Ajuste dentro de su caja: 'contain' muestra completa; 'cover' rellena/recorta. */
      fit?: 'contain' | 'cover';
      /** Alto fijo en px (solo aplica con fit 'cover'). Vacío = automático. */
      height?: number;
    }
  | { type: 'button'; label: string; href: string; variant?: 'primary' | 'secondary' }
  | { type: 'faq'; items: Array<{ q: string; a: string }> }
  | {
      type: 'input';
      inputType: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'checkbox';
      label: string;
      name: string;
      placeholder?: string;
      required?: boolean;
      options?: string[]; // solo para select
    }
  | { type: 'html'; html: string }; // escotilla de escape: HTML crudo saneado

export type CmsBlockType = CmsBlock['type'];

/**
 * Metadatos que controlan el Schema.org de la página. A diferencia del sitio
 * actual (schema fijo por código, ver lib/organization-jsonld.ts), aquí el
 * editor de marketing SÍ elige el tipo y los datos por página — que es
 * exactamente lo que pedía el requerimiento original de marketing.
 */
export type CmsSchemaMeta = {
  /** Tipo raíz de Schema.org de la página. */
  type: 'WebPage' | 'Article' | 'AboutPage' | 'FAQPage';
  author?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
  /** Miga de pan opcional -> BreadcrumbList. */
  breadcrumb?: Array<{ name: string; url: string }>;
};

/** Documento canónico de una página. Es lo que se versiona y se publica. */
export type CmsPageDoc = {
  slug: string;
  title: string;
  description?: string | null;
  /** Imagen social/OG opcional. */
  ogImageUrl?: string | null;
  blocks: CmsBlock[];
  schema: CmsSchemaMeta;
};

export type CmsPageStatus = 'draft' | 'published';

/**
 * A qué página REAL del marketplace controla este CmsPage — o 'standalone'
 * si es una página nueva sin contraparte en el código (antes forzada a
 * vivir en /p/[slug], ahora vive en `urlPath`, configurable).
 *
 * bindingKey es la llave estable para buscar el override publicado desde
 * la página real (ver lib/cms/overrides.ts):
 *   moto:<motorcycleId>          — página de una moto individual
 *   blog:<blogPostId>            — un post del blog
 *   static:home                  — home
 *   static:motos                 — listado /motos
 *   static:motos-a-credito       — listado /motos-a-credito
 *   static:aviso-de-privacidad   — página legal
 *   static:envio-garantia        — página legal
 */
export type CmsBindingKind = 'standalone' | 'moto' | 'blog' | 'static';

/** Fila de `cms_pages` mapeada a dominio (ver lib/cms/pages.ts). */
export type CmsPage = {
  id: string;
  slug: string;
  title: string;
  status: CmsPageStatus;
  /** null = página standalone (vive donde diga urlPath, ej. /p/algo o cualquier ruta libre). */
  bindingKind: CmsBindingKind;
  /** Llave estable de binding (ver arriba). null para standalone. */
  bindingKey: string | null;
  /**
   * Ruta pública real donde vive esta página:
   *  - standalone: editable por marketing (default sugerido /p/{slug}).
   *  - bound (moto/blog/static): la ruta real del sitio (no editable aquí,
   *    la controla el dato de origen — ej. la moto o el post).
   */
  urlPath: string;
  /** Borrador en edición (JSON canónico). */
  draftDoc: CmsPageDoc;
  /** Última versión publicada; null si nunca se ha publicado. */
  publishedDoc: CmsPageDoc | null;
  currentVersion: number;
  updatedAt: string;
  publishedAt: string | null;
  createdAt: string;
};

/** Fila de `cms_page_versions` — historial para diff y rollback. */
export type CmsPageVersion = {
  id: string;
  pageId: string;
  version: number;
  doc: CmsPageDoc;
  /** De dónde salió esta versión. */
  source: 'agent' | 'manual' | 'rollback';
  note: string | null;
  createdAt: string;
};

/** Feedback de marketing que el orquestador reincorpora (aprendizaje). */
export type CmsAgentFeedback = {
  id: string;
  pageId: string | null;
  score: number; // 1..5
  comment: string | null;
  createdAt: string;
};

/** Respuesta del orquestador: doc + HTML renderizado + por qué + sugerencia. */
export type CmsOrchestratorResult = {
  doc: CmsPageDoc;
  html: string;
  /** Explica qué se construyó (análogo a `reason` del Studio del hackathon). */
  reason: string;
  /** Sugerencia UX proactiva opcional (análogo a `suggestion`). */
  suggestion?: string | null;
  /** 'llm' si lo generó el modelo; 'deterministic' si fue el fallback. */
  generatedBy: 'llm' | 'deterministic';
};
