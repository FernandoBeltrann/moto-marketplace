/**
 * Capa de datos del CMS agéntico sobre Supabase. Mismo estilo que lib/blog.ts:
 * lee con service role desde el servidor, degrada a vacío si no está
 * configurado.
 *
 * IDENTIDAD ESTABLE POR pageId: editar una página SIEMPRE actualiza la misma
 * fila (updateDraft) y conserva su slug — así el historial de versiones y el
 * rollback quedan sobre la misma página aunque cambie el título. Crear una
 * página nueva es lo único que genera una fila nueva (createDraft).
 */
import { createServiceSupabase } from '@/lib/supabase/server';
import { normalizeDoc } from '@/lib/cms/blocks';
import type { CmsPage, CmsPageDoc, CmsPageVersion, CmsAgentFeedback } from '@/types/cms';

function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function mapPage(row: Record<string, unknown>): CmsPage {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    status: (row.status as CmsPage['status']) ?? 'draft',
    draftDoc: normalizeDoc(row.draft_doc, String(row.slug)),
    publishedDoc: row.published_doc ? normalizeDoc(row.published_doc, String(row.slug)) : null,
    currentVersion: Number(row.current_version ?? 0),
    updatedAt: String(row.updated_at ?? ''),
    publishedAt: row.published_at ? String(row.published_at) : null,
    createdAt: String(row.created_at ?? ''),
  };
}

export async function getPublishedPage(slug: string): Promise<CmsPageDoc | null> {
  if (!supabaseConfigured()) return null;
  const sb = createServiceSupabase();
  const { data, error } = await sb
    .from('cms_pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error || !data || !data.published_doc) return null;
  return normalizeDoc(data.published_doc, slug);
}

export async function getPublishedSlugs(): Promise<string[]> {
  if (!supabaseConfigured()) return [];
  const sb = createServiceSupabase();
  const { data } = await sb.from('cms_pages').select('slug').eq('status', 'published');
  return (data ?? []).map((r) => String(r.slug));
}

export async function listPages(): Promise<CmsPage[]> {
  if (!supabaseConfigured()) return [];
  const sb = createServiceSupabase();
  const { data } = await sb.from('cms_pages').select('*').order('updated_at', { ascending: false });
  return (data ?? []).map(mapPage);
}

export async function getPageById(id: string): Promise<CmsPage | null> {
  if (!supabaseConfigured()) return null;
  const sb = createServiceSupabase();
  const { data } = await sb.from('cms_pages').select('*').eq('id', id).maybeSingle();
  return data ? mapPage(data) : null;
}

export async function getPageBySlug(slug: string): Promise<CmsPage | null> {
  if (!supabaseConfigured()) return null;
  const sb = createServiceSupabase();
  const { data } = await sb.from('cms_pages').select('*').eq('slug', slug).maybeSingle();
  return data ? mapPage(data) : null;
}

/** Inserta una fila de versión (falla ruidosamente si no se pudo guardar). */
async function insertVersion(
  pageId: string,
  version: number,
  doc: CmsPageDoc,
  source: CmsPageVersion['source'],
  note: string | null
): Promise<void> {
  const sb = createServiceSupabase();
  const { error } = await sb
    .from('cms_page_versions')
    .insert({ page_id: pageId, version, doc, source, note });
  if (error) throw new Error(`No se pudo guardar la versión: ${error.message}`);
}

/**
 * Actualiza una página EXISTENTE por id: sube current_version, escribe una
 * versión en el historial y CONSERVA el slug original (identidad estable).
 * Es el camino de todas las ediciones (visual, HTML o IA) y del rollback.
 */
export async function updateDraft(
  pageId: string,
  doc: CmsPageDoc,
  source: CmsPageVersion['source'] = 'manual',
  note: string | null = null
): Promise<CmsPage> {
  if (!supabaseConfigured()) throw new Error('Supabase no configurado');
  const sb = createServiceSupabase();
  const page = await getPageById(pageId);
  if (!page) throw new Error('Página no encontrada');
  const nextVersion = page.currentVersion + 1;
  const merged: CmsPageDoc = { ...doc, slug: page.slug }; // slug estable
  const { data, error } = await sb
    .from('cms_pages')
    .update({ title: merged.title, draft_doc: merged, current_version: nextVersion })
    .eq('id', pageId)
    .select('*')
    .single();
  if (error) throw error;
  await insertVersion(pageId, nextVersion, merged, source, note);
  return mapPage(data);
}

/**
 * Crea una página nueva (o, si el slug ya existe, la actualiza por id para no
 * duplicar). Úsalo solo para páginas nuevas / importadas; las ediciones de una
 * página abierta usan updateDraft(pageId, …).
 */
export async function createDraft(
  doc: CmsPageDoc,
  source: CmsPageVersion['source'] = 'manual',
  note: string | null = null
): Promise<CmsPage> {
  if (!supabaseConfigured()) throw new Error('Supabase no configurado');
  const sb = createServiceSupabase();
  const existing = await getPageBySlug(doc.slug);
  if (existing) return updateDraft(existing.id, doc, source, note);

  const { data, error } = await sb
    .from('cms_pages')
    .insert({ slug: doc.slug, title: doc.title, status: 'draft', draft_doc: doc, current_version: 1 })
    .select('*')
    .single();
  if (error) throw error;
  const page = mapPage(data);
  await insertVersion(page.id, 1, doc, source, note);
  return page;
}

/** @deprecated Usa createDraft (nuevas) o updateDraft (ediciones). Se mantiene por compatibilidad. */
export async function saveDraft(
  doc: CmsPageDoc,
  source: CmsPageVersion['source'] = 'agent',
  note: string | null = null
): Promise<CmsPage> {
  return createDraft(doc, source, note);
}

export async function listVersions(pageId: string): Promise<CmsPageVersion[]> {
  if (!supabaseConfigured()) return [];
  const sb = createServiceSupabase();
  const { data } = await sb
    .from('cms_page_versions')
    .select('*')
    .eq('page_id', pageId)
    .order('version', { ascending: false });
  return (data ?? []).map((r) => ({
    id: String(r.id),
    pageId: String(r.page_id),
    version: Number(r.version),
    doc: normalizeDoc(r.doc),
    source: (r.source as CmsPageVersion['source']) ?? 'agent',
    note: r.note ? String(r.note) : null,
    createdAt: String(r.created_at ?? ''),
  }));
}

export async function publishPage(pageId: string): Promise<CmsPage | null> {
  if (!supabaseConfigured()) throw new Error('Supabase no configurado');
  const sb = createServiceSupabase();
  const page = await getPageById(pageId);
  if (!page) return null;
  const { data, error } = await sb
    .from('cms_pages')
    .update({ published_doc: page.draftDoc, status: 'published' })
    .eq('id', pageId)
    .select('*')
    .single();
  if (error) throw error;
  return mapPage(data);
}

/** Rollback: toma una versión histórica y la vuelve el borrador actual (misma página, slug estable). */
export async function rollbackToVersion(pageId: string, version: number): Promise<CmsPage> {
  const versions = await listVersions(pageId);
  const target = versions.find((v) => v.version === version);
  if (!target) throw new Error(`Versión ${version} no encontrada`);
  return updateDraft(pageId, target.doc, 'rollback', `Rollback a v${version}`);
}

export async function addFeedback(pageId: string | null, score: number, comment: string | null): Promise<void> {
  if (!supabaseConfigured()) return;
  const sb = createServiceSupabase();
  await sb.from('cms_agent_feedback').insert({ page_id: pageId, score, comment });
}

export async function recentFeedback(pageId: string | null, limit = 5): Promise<CmsAgentFeedback[]> {
  if (!supabaseConfigured()) return [];
  const sb = createServiceSupabase();
  let q = sb.from('cms_agent_feedback').select('*').order('created_at', { ascending: false }).limit(limit);
  if (pageId) q = q.eq('page_id', pageId);
  const { data } = await q;
  return (data ?? []).map((r) => ({
    id: String(r.id),
    pageId: r.page_id ? String(r.page_id) : null,
    score: Number(r.score),
    comment: r.comment ? String(r.comment) : null,
    createdAt: String(r.created_at ?? ''),
  }));
}

/** Entradas de sitemap de las páginas CMS publicadas (slug + fecha real). */
export async function getPublishedSitemapEntries(): Promise<{ slug: string; updatedAt: string }[]> {
  if (!supabaseConfigured()) return [];
  const sb = createServiceSupabase();
  const { data } = await sb.from('cms_pages').select('slug,updated_at').eq('status', 'published');
  return (data ?? []).map((r) => ({ slug: String(r.slug), updatedAt: String(r.updated_at ?? '') }));
}
