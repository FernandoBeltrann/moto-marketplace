/**
 * Páginas existentes del sitio, expuestas al Studio para que Marketing las
 * importe y edite — con contenido REAL y, a partir de ahora, BINDING real:
 * importar ya no crea una copia suelta en /p/algo, ata la página del CMS a
 * la página real (moto/post/estática) para que "Publicar" actualice esa
 * misma URL en vivo. Ver lib/cms/bindings.ts (fuente única, compartida con
 * el Mapa del sitio) y lib/cms/overrides.ts (cómo la página real la lee).
 */
import { getBindablePages } from '@/lib/cms/bindings';
import type { CmsSchemaMeta } from '@/types/cms';

export type ExistingPage = {
  key: string;
  source: 'blog' | 'moto' | 'static';
  label: string;
  /** slug sugerido al importar al CMS. */
  suggestedSlug: string;
  schemaType: CmsSchemaMeta['type'];
  /** HTML pre-cargado para editar. */
  html: string;
  description?: string;
  /** Binding real — importar/guardar esto liga la página CMS a la página real. */
  bindingKind: 'moto' | 'blog' | 'static';
  bindingKey: string;
  urlPath: string;
};

function slugFromBindingKey(key: string): string {
  return key.replace(/^(moto|blog|static):/, (_, k) => `${k}-`).replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
}

/**
 * HTML semilla al importar. Antepone `<h1>{title}</h1>` SOLO si el contenido
 * importado no trae ya su propio `<h1>` — antes se anteponía siempre y varias
 * páginas estáticas (motos, motos-a-crédito, aviso, envío) quedaban con dos
 * h1 (el título + el h1 real de la página), que se pintaban duplicados en la
 * vista previa.
 */
function buildSeedHtml(title: string, importHtml: string): string {
  if (/<h1[\s>]/i.test(importHtml)) return importHtml;
  return `<h1>${title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</h1>${importHtml}`;
}

export async function getExistingPages(): Promise<ExistingPage[]> {
  const bindables = await getBindablePages();
  return bindables.map((b) => ({
    key: b.bindingKey,
    source: b.bindingKind,
    label: b.bindingKind === 'static' ? b.label : `${b.bindingKind === 'moto' ? 'Moto' : 'Blog'} · ${b.label}`,
    suggestedSlug: slugFromBindingKey(b.bindingKey),
    schemaType: b.schemaType,
    description: b.description,
    html: buildSeedHtml(b.title, b.importHtml),
    bindingKind: b.bindingKind,
    bindingKey: b.bindingKey,
    urlPath: b.urlPath,
  }));
}
