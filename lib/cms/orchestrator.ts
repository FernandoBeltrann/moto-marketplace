/**
 * Orquestador prompt/HTML -> CmsPageDoc. Migra la lógica del Studio del
 * hackathon (app/studio/llm.py + app/synthesis/llm.py) a moto-marketplace,
 * usando la MISMA API real: OpenAI Responses API (/v1/responses), modelo
 * gpt-5.4-mini por defecto, salida JSON, y esfuerzo de razonamiento graduado
 * según el feedback reciente de marketing.
 *
 *  - Determinista primero: sin OPENAI_API_KEY, o si el modelo falla, SIEMPRE
 *    sale un doc válido (parseando el HTML de entrada o armando una página
 *    mínima). Es el "nunca pantalla en blanco" del hackathon.
 *  - Mejora por LLM: el modelo devuelve el JSON de bloques; normalizeDoc lo
 *    valida contra el registry (no confiamos en el schema del modelo, lo
 *    saneamos igual que el hackathon revalida con Pydantic).
 *  - Aprendizaje: el feedback reciente se dobla en las instrucciones y, además,
 *    sube el reasoning.effort cuando las calificaciones bajan
 *    (REASONING_EFFORT_BY_SCORE del hackathon).
 *
 * Sin dependencias nuevas: fetch contra el endpoint de OpenAI.
 */
import { normalizeDoc, slugify } from '@/lib/cms/blocks';
import { renderDocHtml } from '@/lib/cms/render';
import { recentFeedback } from '@/lib/cms/pages';
import type { CmsAgentFeedback, CmsOrchestratorResult, CmsPageDoc } from '@/types/cms';

const RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const TIMEOUT_MS = Number(process.env.CMS_LLM_TIMEOUT_MS || 30000);

export type OrchestrateInput = {
  prompt: string;
  htmlInput?: string | null;
  currentDoc?: CmsPageDoc | null;
  pageId?: string | null;
};

/**
 * Esfuerzo de razonamiento según la calificación promedio reciente: peor
 * promedio -> más esfuerzo (idéntico a REASONING_EFFORT_BY_SCORE del hackathon).
 */
export function reasoningEffortFor(feedback: CmsAgentFeedback[]): 'none' | 'low' | 'medium' | 'high' {
  if (!feedback.length) return 'none';
  const avg = feedback.reduce((s, f) => s + f.score, 0) / feedback.length;
  if (avg < 2) return 'high';
  if (avg < 3) return 'medium';
  if (avg < 4) return 'low';
  return 'none';
}

/** Convierte el feedback reciente en una instrucción de aprendizaje. */
export function buildLearningGuidance(feedback: CmsAgentFeedback[]): string {
  if (!feedback.length) return '';
  const avg = feedback.reduce((s, f) => s + f.score, 0) / feedback.length;
  const lines: string[] = [`Promedio de las últimas ${feedback.length} calificaciones de marketing: ${avg.toFixed(1)}/5.`];
  const complaints = feedback.filter((f) => f.score <= 2 && f.comment).map((f) => `- (${f.score}/5) "${f.comment}"`);
  if (complaints.length) lines.push('Corrige explícitamente estas quejas recientes:', ...complaints);
  if (avg < 3) lines.push('Las generaciones recientes NO satisficieron. Cambia el enfoque, no solo detalles.');
  return lines.join('\n');
}

function instructions(learning: string): string {
  return [
    'Eres el orquestador de contenido de MotoClick. Conviertes instrucciones de un editor de marketing (que solo sabe HTML) en un documento de página estructurado.',
    'Devuelve EXCLUSIVAMENTE un objeto JSON (sin markdown) con esta forma:',
    '{ "slug": string, "title": string, "description": string, "blocks": Block[], "schema": { "type": "WebPage"|"Article"|"AboutPage"|"FAQPage", "author"?: string, "datePublished"?: string, "breadcrumb"?: {"name":string,"url":string}[] }, "reason": string, "suggestion"?: string }',
    'Block es uno de:',
    '  {"type":"heading","level":1|2|3,"text":string}',
    '  {"type":"paragraph","html":string}   // HTML inline simple: <strong>,<em>,<a href>',
    '  {"type":"image","url":string,"alt":string,"caption"?:string}',
    '  {"type":"button","label":string,"href":string,"variant"?:"primary"|"secondary"}',
    '  {"type":"faq","items":[{"q":string,"a":string}]}',
    '  {"type":"html","html":string}       // solo si nada más aplica',
    'Reglas: un solo heading level 1 al inicio. Si es una página de preguntas frecuentes, usa schema.type "FAQPage" y un bloque faq. Escribe en español de México. "reason" explica en una frase qué construiste. "suggestion" es un consejo UX proactivo opcional.',
    learning ? `\nAPRENDIZAJE (feedback previo de marketing):\n${learning}` : '',
  ].join('\n');
}

function outputText(response: unknown): string {
  const r = response as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; output_text?: string };
  if (typeof r.output_text === 'string' && r.output_text) return r.output_text;
  for (const item of r.output ?? []) {
    for (const c of item.content ?? []) {
      if (c.type === 'output_text' && typeof c.text === 'string') return c.text;
    }
  }
  return '';
}

async function callOpenAI(
  input: OrchestrateInput,
  learning: string,
  effort: 'none' | 'low' | 'medium' | 'high'
): Promise<CmsOrchestratorResult | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const inputPayload = {
    instruccion: input.prompt,
    htmlBase: input.htmlInput ?? null,
    docActual: input.currentDoc ?? null,
  };

  try {
    const res = await fetch(RESPONSES_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        store: false,
        reasoning: { effort },
        max_output_tokens: 4000,
        instructions: instructions(learning),
        input: 'Responde EXCLUSIVAMENTE con un objeto JSON valido segun las instrucciones.\n' + JSON.stringify(inputPayload),
        text: { format: { type: 'json_object' } },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = outputText(data);
    if (!text) return null;
    const jsonStr = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    const doc = normalizeDoc(parsed, slugify(String(parsed.title || input.prompt)));
    if (!doc.blocks.length) return null;
    return {
      doc,
      html: renderDocHtml(doc),
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'Página generada por el orquestador.',
      suggestion: typeof parsed.suggestion === 'string' ? parsed.suggestion : null,
      generatedBy: 'llm',
    };
  } catch {
    return null;
  }
}

/** Parser determinista mínimo de HTML -> bloques (fallback sin LLM). */
function htmlToBlocks(html: string) {
  const blocks: Record<string, unknown>[] = [];
  const re = /<(h1|h2|h3|p|img)\b([^>]*)>([\s\S]*?)(?:<\/\1>|)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tag = m[1].toLowerCase();
    const attrs = m[2];
    const inner = m[3].replace(/<[^>]+>/g, '').trim();
    if (tag === 'img') {
      const src = /src\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] || /src\s*=\s*'([^']*)'/i.exec(attrs)?.[1] || '';
      const alt = /alt\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] || '';
      if (src) blocks.push({ type: 'image', url: src, alt });
    } else if (tag === 'p') {
      if (inner) blocks.push({ type: 'paragraph', html: inner });
    } else if (inner) {
      blocks.push({ type: 'heading', level: Number(tag[1]), text: inner });
    }
  }
  return blocks;
}

function deterministic(input: OrchestrateInput): CmsOrchestratorResult {
  const title = input.prompt.split('\n')[0].slice(0, 80) || 'Nueva página';
  let blocks: Record<string, unknown>[] = [];
  if (input.htmlInput) blocks = htmlToBlocks(input.htmlInput);
  if (!blocks.length) {
    blocks = [
      { type: 'heading', level: 1, text: title },
      { type: 'paragraph', html: input.prompt || 'Contenido pendiente de editar.' },
    ];
  }
  const doc = normalizeDoc({ slug: slugify(title), title, blocks, schema: { type: 'WebPage' } }, slugify(title));
  return {
    doc,
    html: renderDocHtml(doc),
    reason: input.htmlInput
      ? 'Página armada a partir del HTML pegado (modo determinista, sin LLM).'
      : 'Borrador mínimo generado (modo determinista, sin LLM).',
    suggestion: 'Configura OPENAI_API_KEY para que el orquestador genere estructura y schema más ricos.',
    generatedBy: 'deterministic',
  };
}

/** Punto de entrada: intenta LLM (OpenAI), cae a determinista. Nunca lanza. */
export async function orchestrate(input: OrchestrateInput): Promise<CmsOrchestratorResult> {
  const feedback = await recentFeedback(input.pageId ?? null, 5).catch(() => []);
  const learning = buildLearningGuidance(feedback);
  const effort = reasoningEffortFor(feedback);
  const viaLlm = await callOpenAI(input, learning, effort);
  return viaLlm ?? deterministic(input);
}
