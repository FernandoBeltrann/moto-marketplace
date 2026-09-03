/**
 * Capa de datos del CMS agéntico sobre Supabase. Mismo estilo que lib/blog.ts:
 * lee con service role desde el servidor, degrada a vacío si no está
 * configurado.
 *
 * IDENTIDAD ESTABLE POR pageId: editar una página SIEMPRE actualiza la misma
 * fila (updateDraft) y conserva su slug — así el historial de versiones y el
 * rollback quedan sobre la misma página aunque cambie el título. Crear una
 * página nueva es lo único que genera una fila nueva (createDraft).
 *
 * BINDING: cada página puede controlar una página REAL del marketplace
 * (moto, post de blog, o una de las estáticas) via bindingKind/bindingKey —
 * ver types/cms.ts y lib/cms/overrides.ts — o ser 'standalone' y vivir en
 * cualquier urlPath que marketing configure (antes forzado a /p/{slug}).
 */
import { createServiceSupabase } from '@/lib/supabase/server';
import { normalizeDoc } from '@/lib/cms/blocks';
import type { CmsBindingKind, CmsPage, CmsPageDoc, CmsPageVersion, CmsAgentFeedback } from '@/types/cms';

function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export type CmsBinding = { kind: CmsBindingKind; key: string | null; urlPath: string };

function mapPage(row: Record<string, unknown>): CmsPage {
  const slug = String(row.slug);
  return {
    id: String(row.id),
    slug,
    title: String(row.title),
    status: (row.status as CmsPage['status']) ?? 'draft',
    bindingKind: (row.binding_kind as CmsBindingKind) ?? 'standalone',
    bindingKey: row.binding_key ? String(row.binding_key) : null,
    urlPath: row.url_path ? String(row.url_path) : `/p/${slug}`,
    draftDoc: normalizeDoc(row.draft_doc, slug),
    publishedDoc: row.published_doc ? normalizeDoc(row.published_doc, slug) : null,
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

/** Doc publicado por urlPath — lo usa el catch-all de páginas standalone (app/[...cmsPath]). */
export async function getPublishedPageByUrlPath(urlPath: string): Promise<CmsPage | null> {
  if (!supabaseConfigured()) return null;
  const sb = createServiceSupabase();
  const { data } = await sb
    .from('cms_pages')
    .select('*')
    .eq('url_path', urlPath)
    .eq('status', 'published')
    .maybeSingle();
  return data ? mapPage(data) : null;
}

export async function getPublishedSlugs(): Promise<string[]> {
  if (!supabaseConfigured()) return [];
  const sb = createServiceSupabase();
  const { data } = await sb.from('cms_pages').select('slug').eq('status', 'published').eq('binding_kind', 'standalone');
  return (data ?? []).map((r) => String(r.slug));
}

/** urlPaths (segmentos) de páginas standalone publicadas — generateStaticParams del catch-all. */
export async function getPublishedStandaloneUrlPaths(): Promise<string[]> {
  if (!supabaseConfigured()) return [];
  const sb = createServiceSupabase();
  const { data } = await sb
    .from('cms_pages')
    .select('url_path')
    .eq('status', 'published')
    .eq('binding_kind', 'standalone');
  return (data ?? []).map((r) => String(r.url_path));
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

/** La página CMS que controla un binding real (ej. 'moto:123'), si ya fue importada/creada. */
export async function getPageByBindingKey(bindingKey: string): Promise<CmsPage | null> {
  if (!supabaseConfigured()) return null;
  const sb = createServiceSupabase();
  const { data } = await sb.from('cms_pages').select('*').eq('binding_key', bindingKey).maybeSingle();
  return data ? mapPage(data) : null;
}

/** Doc PUBLICADO que hace override de una página real por su bindingKey — usa esto desde app/**. */
export async function getPublishedOverride(bindingKey: string): Promise<CmsPageDoc | null> {
  const page = await getPageByBindingKey(bindingKey);
  if (!page || page.status !== 'published' || !page.publishedDoc) return null;
  return page.publishedDoc;
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
 * versión en el historial y CONSERVA el slug y el binding originales
 * (identidad estable). Es el camino de todas las ediciones (visual, HTML o
 * IA) y del rollback. `urlPath` solo se puede cambiar aquí para páginas
 * standalone — el de una página con binding lo controla la página real.
 */
export async function updateDraft(
  pageId: string,
  doc: CmsPageDoc,
  source: CmsPageVersion['source'] = 'manual',
  note: string | null = null,
  urlPath?: string
): Promise<CmsPage> {
  if (!supabaseConfigured()) throw new Error('Supabase no configurado');
  const sb = createServiceSupabase();
  const page = await getPageById(pageId);
  if (!page) throw new Error('Página no encontrada');
  const nextVersion = page.currentVersion + 1;
  // El slug antes era siempre "estable" (nunca cambiaba tras crear la
  // página) — pero eso también significaba que marketing no podía nunca
  // limpiar un slug feo (ej. el sufijo aleatorio de un artículo nuevo).
  // Ahora se respeta el slug que venga en el doc para páginas standalone y
  // de blog (donde tiene sentido editarlo); moto/estática lo ignoran porque
  // ahí el slug del doc no controla ninguna URL real.
  const slugEditable = page.bindingKind === 'standalone' || page.bindingKind === 'blog';
  const nextSlug = slugEditable && doc.slug ? doc.slug : page.slug;
  const merged: CmsPageDoc = { ...doc, slug: nextSlug };
  const update: Record<string, unknown> = { title: merged.title, slug: nextSlug, draft_doc: merged, current_version: nextVersion };
  if ((page.bindingKind === 'standalone' || page.bindingKind === 'blog') && urlPath && urlPath !== page.urlPath) {
    update.url_path = normalizeUrlPath(urlPath);
  }
  const { data, error } = await sb.from('cms_pages').update(update).eq('id', pageId).select('*').single();
  if (error) {
    if (error.code === '23505') throw new Error(`Ese slug ya lo usa otra página: "${nextSlug}".`);
    throw error;
  }
  await insertVersion(pageId, nextVersion, merged, source, note);
  return mapPage(data);
}

function normalizeUrlPath(p: string): string {
  let out = p.trim();
  if (!out.startsWith('/')) out = `/${out}`;
  out = out.replace(/\/+/g, '/').replace(/\/$/, '');
  return out || '/';
}

/**
 * Crea una página nueva. Si `binding.key` ya tiene una página CMS asociada,
 * o si el slug ya existe (compat con standalone previas), actualiza esa
 * fila por id en vez de duplicar — así "importar" una moto/post/estática dos
 * veces edita la misma página CMS, no crea copias.
 */
export async function createDraft(
  doc: CmsPageDoc,
  source: CmsPageVersion['source'] = 'manual',
  note: string | null = null,
  binding?: CmsBinding
): Promise<CmsPage> {
  if (!supabaseConfigured()) throw new Error('Supabase no configurado');
  const sb = createServiceSupabase();

  if (binding?.key) {
    const existing = await getPageByBindingKey(binding.key);
    if (existing) return updateDraft(existing.id, doc, source, note);
  } else {
    const existing = await getPageBySlug(doc.slug);
    if (existing) return updateDraft(existing.id, doc, source, note, binding?.urlPath);
  }

  const bindingKind = binding?.kind ?? 'standalone';
  const bindingKey = binding?.key ?? null;
  const urlPath = normalizeUrlPath(binding?.urlPath ?? `/p/${doc.slug}`);

  const { data, error } = await sb
    .from('cms_pages')
    .insert({
      slug: doc.slug,
      title: doc.title,
      status: 'draft',
      draft_doc: doc,
      current_version: 1,
      binding_kind: bindingKind,
      binding_key: bindingKey,
      url_path: urlPath,
    })
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

/** Rollback: toma una versión histórica y la vuelve el borrador actual (misma página, slug y binding estables). */
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

/** Entradas de sitemap de las páginas CMS standalone publicadas (las bound ya salen en su propio sitemap nativo). */
export async function getPublishedSitemapEntries(): Promise<{ urlPath: string; updatedAt: string }[]> {
  if (!supabaseConfigured()) return [];
  const sb = createServiceSupabase();
  const { data } = await sb
    .from('cms_pages')
    .select('url_path,updated_at')
    .eq('status', 'published')
    .eq('binding_kind', 'standalone');
  return (data ?? []).map((r) => ({ urlPath: String(r.url_path), updatedAt: String(r.updated_at ?? '') }));
}
