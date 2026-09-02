/**
 * Fase 1 del CMS agéntico — smoke test contra Supabase + OpenAI reales.
 *
 * Corre:  npx tsx --env-file=.env scripts/cms-fase1.ts
 *
 * 1) Verifica que exista la tabla cms_pages.
 * 2) Genera una página con el orquestador REAL (OpenAI Responses API).
 * 3) Si la tabla existe: guarda borrador -> publica -> relee published_doc
 *    y muestra el HTML + JSON-LD que verá el público en /p/[slug].
 */
import { createServiceSupabase } from '@/lib/supabase/server';
import { orchestrate } from '@/lib/cms/orchestrator';
import { saveDraft, publishPage, getPublishedPage } from '@/lib/cms/pages';
import { renderDocHtml } from '@/lib/cms/render';
import { buildPageJsonLd } from '@/lib/cms/schema-jsonld';

async function tableExists(): Promise<boolean> {
  try {
    const sb = createServiceSupabase();
    const { error } = await sb.from('cms_pages').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

async function main() {
  console.log('== Fase 1: CMS agéntico ==\n');

  const hasTable = await tableExists();
  console.log(`Tabla cms_pages: ${hasTable ? 'OK' : 'NO EXISTE (corre sql/cms_pages.sql en Supabase)'}\n`);

  const prompt =
    'Crea una página de preguntas frecuentes sobre el financiamiento de motos en MotoClick: ' +
    'requisitos, enganche, plazos, y qué es el CAT. Tono claro y confiable para compradores primerizos.';
  console.log('Prompt:', prompt, '\n');

  const result = await orchestrate({ prompt });
  console.log(`generatedBy: ${result.generatedBy}`);
  console.log(`reason: ${result.reason}`);
  if (result.suggestion) console.log(`suggestion: ${result.suggestion}`);
  console.log(`\nDoc generado (${result.doc.blocks.length} bloques, schema=${result.doc.schema.type}, slug=${result.doc.slug}):`);
  console.log(JSON.stringify(result.doc, null, 2).slice(0, 1600));

  if (!hasTable) {
    console.log('\n[Sin tabla] No se puede publicar todavía. Corre sql/cms_pages.sql y vuelve a ejecutar.');
    return;
  }

  const page = await saveDraft(result.doc, 'agent', result.reason);
  console.log(`\nBorrador guardado: id=${page.id} slug=${page.slug} v${page.currentVersion}`);
  const published = await publishPage(page.id);
  console.log(`Publicado: status=${published?.status} publishedAt=${published?.publishedAt}`);

  const live = await getPublishedPage(page.slug);
  if (live) {
    console.log(`\n== Lo que verá el público en /p/${page.slug} ==`);
    console.log('\n-- HTML --\n' + renderDocHtml(live).slice(0, 800));
    console.log('\n-- JSON-LD --\n' + JSON.stringify(buildPageJsonLd(live), null, 2).slice(0, 900));
  }
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
