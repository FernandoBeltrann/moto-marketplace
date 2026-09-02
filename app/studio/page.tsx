'use client';

/**
 * Studio de Marketing — constructor visual de bloques (HTML primero).
 *
 * Filosofía (cambio de rumbo): el flujo NO depende del chatbot. Marketing arma
 * la UI con MÓDULOS de bloque (los agrega, cambia su tipo, edita sus campos) o
 * pega/edita HTML; el agente solo ADAPTA eso a nuestro framework (bloques
 * canónicos -> render Next.js). El chat queda como asistente opcional.
 *
 * Identidad estable: editar una página abierta siempre actualiza su pageId
 * (updateDraft), así el historial de versiones y el rollback son correctos.
 */
import { useCallback, useEffect, useState } from 'react';
import type { CmsBindingKind, CmsBlock, CmsBlockType, CmsPage, CmsPageDoc, CmsPageVersion } from '@/types/cms';

type Detail = { page: CmsPage; versions: CmsPageVersion[] };
type SiteNode = {
  id: string; label: string; href?: string;
  kind: 'section' | 'bindable' | 'standalone';
  bindingKey?: string;
  status?: 'none' | 'draft' | 'published';
  hasUnpublishedChanges?: boolean;
  pageId?: string;
  canCreateChild?: boolean; childSlugPrefix?: string; children?: SiteNode[];
};
type Binding = { kind: CmsBindingKind; key: string | null; urlPath: string };
type ExistingEntry = { key: string; label: string; html: string; schemaType: string; bindingKind: CmsBindingKind; bindingKey: string; urlPath: string };
const SCHEMA_TYPES = ['WebPage', 'Article', 'AboutPage', 'FAQPage'] as const;
const BLOCK_LABELS: Record<CmsBlockType, string> = {
  heading: 'Título', paragraph: 'Párrafo', image: 'Imagen', button: 'Botón',
  faq: 'Preguntas', input: 'Campo', html: 'HTML',
};
const INPUT_KINDS = ['text', 'email', 'tel', 'number', 'textarea', 'select', 'checkbox'] as const;

async function jpost<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return r.json();
}
function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80) || 'pagina';
}
function esc(s: string) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// Render cliente (espejo de lib/cms/render.ts) para preview y pestaña HTML.
function renderBlock(b: CmsBlock): string {
  switch (b.type) {
    case 'heading': return `<h${b.level}>${esc(b.text)}</h${b.level}>`;
    case 'paragraph': return `<p>${b.html}</p>`;
    case 'image': {
      const wm: Record<string, string> = { small: '240px', medium: '420px', large: '640px', full: '100%', auto: '100%' };
      const maxW = wm[b.width ?? 'auto'] ?? '100%';
      const align = b.align ?? 'center';
      const figMargin = align === 'left' ? '1em auto 1em 0' : align === 'right' ? '1em 0 1em auto' : '1em auto';
      const imgStyle = b.fit === 'cover' ? `width:100%;height:${b.height ? b.height + 'px' : '260px'};object-fit:cover;border-radius:12px;` : `width:100%;height:auto;object-fit:contain;border-radius:12px;`;
      return `<figure class="cms-figure" style="max-width:${maxW};margin:${figMargin};"><img src="${esc(b.url)}" alt="${esc(b.alt)}" style="${imgStyle}"/>${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</figure>`;
    }
    case 'button': return `<a class="btn btn--${b.variant ?? 'primary'}" href="${esc(b.href)}">${esc(b.label)}</a>`;
    case 'faq': return `<div class="cms-faq">${b.items.map((i) => `<details open><summary>${esc(i.q)}</summary><div>${esc(i.a)}</div></details>`).join('')}</div>`;
    case 'input': {
      const id = 'f_' + b.name;
      const req = b.required ? ' *' : '';
      let c = '';
      if (b.inputType === 'textarea') c = `<textarea id="${id}"></textarea>`;
      else if (b.inputType === 'select') c = `<select id="${id}">${(b.options ?? []).map((o) => `<option>${esc(o)}</option>`).join('')}</select>`;
      else if (b.inputType === 'checkbox') c = `<input type="checkbox" id="${id}"/>`;
      else c = `<input type="${b.inputType}" id="${id}" placeholder="${esc(b.placeholder ?? '')}"/>`;
      return `<div class="cms-field"><label for="${id}">${esc(b.label)}${req}</label>${c}</div>`;
    }
    case 'html': return `<div class="cms-raw">${b.html}</div>`;
    default: return '';
  }
}
function renderDoc(doc: CmsPageDoc) { return doc.blocks.map(renderBlock).join('\n'); }

function newBlock(type: CmsBlockType): CmsBlock {
  switch (type) {
    case 'heading': return { type, level: 2, text: 'Nuevo encabezado' };
    case 'paragraph': return { type, html: 'Escribe aquí el texto del párrafo.' };
    case 'image': return { type, url: '', alt: '' };
    case 'button': return { type, label: 'Ver más', href: '/motos', variant: 'primary' };
    case 'faq': return { type, items: [{ q: '¿Nueva pregunta?', a: 'Respuesta.' }] };
    case 'input': return { type, inputType: 'text', label: 'Nombre', name: 'nombre', placeholder: '', required: false };
    case 'html': return { type, html: '<div>HTML personalizado</div>' };
    default: return { type: 'paragraph', html: '' };
  }
}
const EMPTY_DOC: CmsPageDoc = { slug: '', title: 'Nueva página', description: '', blocks: [], schema: { type: 'WebPage' } };

export default function StudioPage() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [existing, setExisting] = useState<ExistingEntry[]>([]);
  const [pageId, setPageId] = useState<string | null>(null);
  const [binding, setBinding] = useState<Binding>({ kind: 'standalone', key: null, urlPath: '' });
  const [doc, setDoc] = useState<CmsPageDoc>(EMPTY_DOC);
  const [versions, setVersions] = useState<CmsPageVersion[]>([]);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [tab, setTab] = useState<'build' | 'html' | 'preview' | 'json' | 'seo' | 'map'>('build');
  const [seo, setSeo] = useState<{ metaTags?: string; headTags?: string; sitemapXml?: string; nodes?: string[]; schemaType?: string; sitemap?: { loc: string; lastmod: string } } | null>(null);
  const [media, setMedia] = useState<{ name: string; url: string; source: string }[]>([]);
  const [links, setLinks] = useState<{ label: string; href: string; group: string }[]>([]);
  const [imgPicker, setImgPicker] = useState<number | null>(null);
  const [siteMap, setSiteMap] = useState<SiteNode[]>([]);
  const [htmlBuf, setHtmlBuf] = useState('');
  const [busy, setBusy] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<{ email: string; role: string } | null>(null);

  const refreshList = useCallback(async () => {
    const r = await fetch('/api/cms/pages').then((x) => x.json());
    setPages(r.pages ?? []);
  }, []);
  useEffect(() => { refreshList(); }, [refreshList]);
  useEffect(() => {
    fetch('/api/cms/auth/me').then((r) => (r.ok ? r.json() : null)).then((r) => setSessionUser(r?.user ?? null)).catch(() => {});
  }, []);
  async function logout() {
    await fetch('/api/cms/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/studio/login';
  }
  useEffect(() => { fetch('/api/cms/existing').then((x) => x.json()).then((r) => setExisting(r.pages || [])).catch(() => {}); }, []);
  useEffect(() => {
    fetch('/api/cms/media').then((x) => x.json()).then((r) => setMedia(r.images || [])).catch(() => {});
    fetch('/api/cms/links').then((x) => x.json()).then((r) => setLinks(r.links || [])).catch(() => {});
    fetch('/api/cms/site-map').then((x) => x.json()).then((r) => setSiteMap(r.nodes || [])).catch(() => {});
  }, []);

  const loadPage = useCallback(async (id: string) => {
    setBusy('Cargando página…');
    try {
      const d = (await fetch(`/api/cms/pages/${id}`).then((x) => x.json())) as Detail;
      setPageId(d.page.id); setDoc(d.page.draftDoc); setVersions(d.versions);
      setStatus(d.page.status); setHtmlBuf(renderDoc(d.page.draftDoc)); setTab('build'); setNote(null);
      setBinding({ kind: d.page.bindingKind, key: d.page.bindingKey, urlPath: d.page.urlPath });
    } finally {
      setBusy('');
    }
  }, []);

  function newPage() {
    setPageId(null); setDoc({ ...EMPTY_DOC, blocks: [newBlock('heading')] }); setVersions([]);
    setStatus('draft'); setTab('build'); setHtmlBuf(''); setNote('Página nueva — agrega bloques y guarda.');
    setBinding({ kind: 'standalone', key: null, urlPath: '' });
  }

  async function importExisting(key: string) {
    const pg = existing.find((e) => e.key === key); if (!pg) return;
    // Si esta página real ya tiene una página CMS asociada (bindingKey), ábrela — no dupliques.
    const already = pages.find((p) => p.bindingKey === pg.bindingKey);
    if (already) { await loadPage(already.id); setNote(`"${pg.label}" ya tenía una página CMS — la abrí para seguir editando.`); return; }
    setBusy('Adaptando HTML…');
    const r = (await jpost('/api/cms/parse-html', { html: pg.html, title: pg.label.replace(/^[^·]+· /, ''), schemaType: pg.schemaType })) as { doc: CmsPageDoc };
    setBusy(''); setPageId(null); setDoc(r.doc); setVersions([]); setStatus('draft');
    setBinding({ kind: pg.bindingKind, key: pg.bindingKey, urlPath: pg.urlPath });
    setHtmlBuf(renderDoc(r.doc)); setTab('build');
    setNote(`Importada "${pg.label}" — al guardar, esto controlará ${pg.urlPath} en vivo (aún no publicado).`);
  }

  // --- edición de bloques ---
  function setBlocks(blocks: CmsBlock[]) { setDoc((d) => ({ ...d, blocks })); }
  function updateBlock(i: number, patch: Partial<CmsBlock>) {
    setBlocks(doc.blocks.map((b, idx) => (idx === i ? ({ ...b, ...patch } as CmsBlock) : b)));
  }
  function changeType(i: number, type: CmsBlockType) { setBlocks(doc.blocks.map((b, idx) => (idx === i ? newBlock(type) : b))); }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir; if (j < 0 || j >= doc.blocks.length) return;
    const arr = [...doc.blocks]; [arr[i], arr[j]] = [arr[j], arr[i]]; setBlocks(arr);
  }
  function remove(i: number) { setBlocks(doc.blocks.filter((_, idx) => idx !== i)); }
  function add(type: CmsBlockType) { setBlocks([...doc.blocks, newBlock(type)]); }

  async function applyHtml() {
    setBusy('Adaptando HTML a bloques…');
    const r = (await jpost('/api/cms/parse-html', { html: htmlBuf, title: doc.title, slug: doc.slug, schemaType: doc.schema.type })) as { doc: CmsPageDoc };
    setBusy(''); setDoc({ ...r.doc, title: doc.title || r.doc.title, schema: doc.schema }); setTab('build');
    setNote('HTML adaptado a bloques. Revisa y guarda.');
  }

  async function loadSeo() {
    setBusy('Generando Schema.org y sitemap…');
    const r = (await jpost('/api/cms/preview-meta', { doc: { ...doc, slug: doc.slug || slugify(doc.title) } })) as typeof seo;
    setBusy(''); setSeo(r);
  }

  async function save() {
    setBusy('Guardando…');
    const finalSlug = doc.slug || slugify(doc.title);
    const payload: Record<string, unknown> = { doc: { ...doc, slug: finalSlug }, pageId: pageId ?? undefined, source: 'manual', note: 'Edición visual' };
    if (!pageId) {
      payload.binding = { kind: binding.kind, key: binding.key, urlPath: binding.kind === 'standalone' ? (binding.urlPath || `/p/${finalSlug}`) : binding.urlPath };
    } else if (binding.kind === 'standalone') {
      payload.urlPath = binding.urlPath || `/p/${finalSlug}`;
    }
    const r = (await jpost('/api/cms/pages', payload)) as { page?: CmsPage; error?: string };
    setBusy('');
    if (r.page) { await refreshList(); await loadPage(r.page.id); setNote(`Guardado v${r.page.currentVersion}.`); }
    else setNote('Error al guardar: ' + (r.error || 'desconocido'));
  }

  async function publish() {
    if (!pageId) { setNote('Guarda primero la página.'); return; }
    setBusy('Publicando…'); await jpost(`/api/cms/pages/${pageId}/publish`, {}); setBusy('');
    await loadPage(pageId); await refreshList();
  }
  async function rollback(v: number) {
    if (!pageId) return; setBusy('Restaurando…'); await jpost(`/api/cms/pages/${pageId}/rollback`, { version: v }); setBusy('');
    await loadPage(pageId);
  }
  async function aiAssist() {
    if (!aiPrompt) return; setBusy('El agente está adaptando…');
    const r = (await jpost('/api/cms/generate', { prompt: aiPrompt, pageId: pageId ?? undefined, currentDoc: doc, save: false })) as { result?: { doc: CmsPageDoc } };
    setBusy('');
    if (r.result) { setDoc(r.result.doc); setHtmlBuf(renderDoc(r.result.doc)); setTab('build'); setNote('El agente propuso cambios. Revísalos y guarda.'); }
    setAiPrompt('');
  }

  // --- mapa del sitio (interactivo: cada página real muestra su estado y se edita con un click) ---
  async function openMapNode(node: SiteNode) {
    if (node.kind === 'section') return;
    if (node.pageId) { await loadPage(node.pageId); return; }
    if (node.kind === 'bindable' && node.bindingKey) { await importExisting(node.bindingKey); return; }
  }
  function createUnder(node: SiteNode) {
    const prefix = node.childSlugPrefix || '';
    setPageId(null);
    setDoc({ slug: prefix, title: 'Nueva subpágina', description: '', blocks: [newBlock('heading')], schema: { type: 'WebPage', breadcrumb: [{ name: node.label, url: node.href || '/' }] } });
    setVersions([]); setStatus('draft'); setTab('build'); setHtmlBuf('');
    setBinding({ kind: 'standalone', key: null, urlPath: prefix ? `/p/${prefix}` : '' });
    setNote(`Nueva subpágina bajo "${node.label}". Prefijo de slug sugerido: "${prefix}".`);
  }
  function statusDot(node: SiteNode): { color: string; label: string } {
    if (node.status === 'published' && node.hasUnpublishedChanges) return { color: '#dd5a10', label: 'publicada · con cambios sin publicar' };
    if (node.status === 'published') return { color: '#3aa35a', label: 'publicada' };
    if (node.status === 'draft') return { color: '#c9a227', label: 'borrador sin publicar' };
    return { color: '#c8c6c0', label: 'sin tocar por el CMS' };
  }
  function renderMapNode(node: SiteNode, depth: number): React.ReactNode {
    const mini: React.CSSProperties = { border: '1px solid #ccc', background: '#fff', borderRadius: 7, padding: '2px 9px', fontSize: 12, cursor: 'pointer', textDecoration: 'none', color: '#333' };
    const dot = node.kind !== 'section' ? statusDot(node) : null;
    return (
      <div key={node.id} style={{ marginLeft: depth * 16, padding: '5px 0', borderLeft: depth ? '1px solid #eee' : undefined, paddingLeft: depth ? 10 : 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {dot && <span title={dot.label} style={{ width: 9, height: 9, borderRadius: '50%', background: dot.color, display: 'inline-block', flex: '0 0 auto' }} />}
          <span style={{ fontWeight: node.kind === 'section' ? 700 : 600, fontSize: 14 }}>{node.label}</span>
          {node.href && <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#999' }}>{node.href}</span>}
          {node.kind !== 'section' && <button style={mini} onClick={() => openMapNode(node)}>editar</button>}
          {node.href && <a style={mini} href={node.href} target="_blank" rel="noreferrer">ver</a>}
          {node.href && node.pageId && <a style={{ ...mini, borderColor: '#dd5a10', color: '#97400c' }} href={`${node.href}?cmsPreview=1`} target="_blank" rel="noreferrer">vista previa borrador</a>}
          {node.canCreateChild && <button style={{ ...mini, borderColor: '#dd5a10', color: '#97400c' }} onClick={() => createUnder(node)}>+ subpágina</button>}
        </div>
        {(node.children || []).map((c) => renderMapNode(c, depth + 1))}
      </div>
    );
  }

  // --- estilos ---
  const box: React.CSSProperties = { border: '1px solid #e2e2e2', borderRadius: 12, padding: 14, background: '#fff' };
  const btn: React.CSSProperties = { padding: '7px 12px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer', background: '#fff', fontSize: 13 };
  const btnPri: React.CSSProperties = { ...btn, background: '#dd5a10', color: '#fff', borderColor: '#dd5a10' };
  const inp: React.CSSProperties = { width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit' };
  const lbl: React.CSSProperties = { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', margin: '6px 0 3px' };

  function field(label: string, node: React.ReactNode) { return (<div><div style={lbl}>{label}</div>{node}</div>); }

  function BlockCard(b: CmsBlock, i: number) {
    return (
      <div key={i} style={{ ...box, marginBottom: 10, background: '#fbfbfa' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
          <select value={b.type} onChange={(e) => changeType(i, e.target.value as CmsBlockType)} style={{ ...inp, width: 'auto', fontWeight: 600 }}>
            {(Object.keys(BLOCK_LABELS) as CmsBlockType[]).map((t) => <option key={t} value={t}>{BLOCK_LABELS[t]}</option>)}
          </select>
          <span style={{ marginLeft: 'auto' }} />
          <button style={btn} onClick={() => move(i, -1)} title="Subir">↑</button>
          <button style={btn} onClick={() => move(i, 1)} title="Bajar">↓</button>
          <button style={{ ...btn, color: '#b23' }} onClick={() => remove(i)} title="Eliminar">✕</button>
        </div>
        {b.type === 'heading' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={b.level} onChange={(e) => updateBlock(i, { level: Number(e.target.value) as 1 | 2 | 3 })} style={{ ...inp, width: 70 }}>
              <option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option>
            </select>
            <input style={inp} value={b.text} onChange={(e) => updateBlock(i, { text: e.target.value })} />
          </div>
        )}
        {b.type === 'paragraph' && <textarea style={{ ...inp, minHeight: 60 }} value={b.html} onChange={(e) => updateBlock(i, { html: e.target.value })} />}
        {b.type === 'image' && (<div style={{ display: 'grid', gap: 6 }}>
          {field('URL', <input style={inp} value={b.url} onChange={(e) => updateBlock(i, { url: e.target.value })} />)}
          {field('Texto alternativo', <input style={inp} value={b.alt} onChange={(e) => updateBlock(i, { alt: e.target.value })} />)}
          {field('Pie (opcional)', <input style={inp} value={b.caption ?? ''} onChange={(e) => updateBlock(i, { caption: e.target.value })} />)}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {field('Tamaño', <select style={inp} value={b.width ?? 'auto'} onChange={(e) => updateBlock(i, { width: e.target.value as 'auto' | 'small' | 'medium' | 'large' | 'full' })}>
              <option value="auto">Auto (ancho completo)</option>
              <option value="small">Pequeña</option>
              <option value="medium">Mediana</option>
              <option value="large">Grande</option>
              <option value="full">Completa</option>
            </select>)}
            {field('Alineación', <select style={inp} value={b.align ?? 'center'} onChange={(e) => updateBlock(i, { align: e.target.value as 'left' | 'center' | 'right' })}>
              <option value="left">Izquierda</option>
              <option value="center">Centro</option>
              <option value="right">Derecha</option>
            </select>)}
            {field('Ajuste', <select style={inp} value={b.fit ?? 'contain'} onChange={(e) => updateBlock(i, { fit: e.target.value as 'contain' | 'cover' })}>
              <option value="contain">Mostrar completa</option>
              <option value="cover">Rellenar (recorta)</option>
            </select>)}
            {b.fit === 'cover' && field('Alto (px)', <input style={inp} type="number" min={40} value={b.height ?? ''} onChange={(e) => updateBlock(i, { height: e.target.value ? Number(e.target.value) : undefined })} />)}
          </div>
          {b.url && <img src={b.url} alt="" style={{ maxHeight: 90, borderRadius: 8, border: '1px solid #eee', objectFit: 'cover' }} />}
          <button style={btn} onClick={() => setImgPicker(imgPicker === i ? null : i)}>🖼 Elegir del bucket ({media.length})</button>
          {imgPicker === i && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(72px,1fr))', gap: 6, maxHeight: 220, overflow: 'auto', border: '1px solid #eee', borderRadius: 8, padding: 6 }}>
              {media.map((m, mi) => (
                <img key={mi} src={m.url} title={`${m.source} · ${m.name}`} loading="lazy" onClick={() => { updateBlock(i, { url: m.url, alt: b.alt || m.name }); setImgPicker(null); }} style={{ width: '100%', height: 62, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: '1px solid #ddd', background: '#f0f0f0' }} />
              ))}
              {!media.length && <span style={{ color: '#999', fontSize: 12 }}>Sin imágenes disponibles.</span>}
            </div>
          )}
        </div>)}
        {b.type === 'button' && (<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {field('Texto', <input style={inp} value={b.label} onChange={(e) => updateBlock(i, { label: e.target.value })} />)}
          {field('Enlace (escribe o elige)', <input style={inp} list="cms-links" placeholder="/motos, https://…" value={b.href} onChange={(e) => updateBlock(i, { href: e.target.value })} />)}
          {field('Estilo', <select style={inp} value={b.variant ?? 'primary'} onChange={(e) => updateBlock(i, { variant: e.target.value as 'primary' | 'secondary' })}><option value="primary">Primario</option><option value="secondary">Secundario</option></select>)}
        </div>)}
        {b.type === 'faq' && (<div style={{ display: 'grid', gap: 8 }}>
          {b.items.map((it, k) => (
            <div key={k} style={{ border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
              <input style={{ ...inp, fontWeight: 600, marginBottom: 4 }} value={it.q} onChange={(e) => updateBlock(i, { items: b.items.map((x, xi) => xi === k ? { ...x, q: e.target.value } : x) })} />
              <textarea style={{ ...inp, minHeight: 44 }} value={it.a} onChange={(e) => updateBlock(i, { items: b.items.map((x, xi) => xi === k ? { ...x, a: e.target.value } : x) })} />
              <button style={{ ...btn, marginTop: 4 }} onClick={() => updateBlock(i, { items: b.items.filter((_, xi) => xi !== k) })}>Quitar pregunta</button>
            </div>
          ))}
          <button style={btn} onClick={() => updateBlock(i, { items: [...b.items, { q: '¿Nueva pregunta?', a: 'Respuesta.' }] })}>+ Pregunta</button>
        </div>)}
        {b.type === 'input' && (<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {field('Tipo de campo', <select style={inp} value={b.inputType} onChange={(e) => updateBlock(i, { inputType: e.target.value as CmsBlock & { type: 'input' } extends never ? never : typeof b.inputType })}>{INPUT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select>)}
          {field('Etiqueta', <input style={inp} value={b.label} onChange={(e) => updateBlock(i, { label: e.target.value })} />)}
          {field('Nombre (name)', <input style={inp} value={b.name} onChange={(e) => updateBlock(i, { name: e.target.value })} />)}
          {field('Placeholder', <input style={inp} value={b.placeholder ?? ''} onChange={(e) => updateBlock(i, { placeholder: e.target.value })} />)}
          {b.inputType === 'select' && field('Opciones (coma)', <input style={inp} value={(b.options ?? []).join(', ')} onChange={(e) => updateBlock(i, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />)}
          <label style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}><input type="checkbox" checked={!!b.required} onChange={(e) => updateBlock(i, { required: e.target.checked })} /> Requerido</label>
        </div>)}
        {b.type === 'html' && <textarea style={{ ...inp, minHeight: 70, fontFamily: 'monospace' }} value={b.html} onChange={(e) => updateBlock(i, { html: e.target.value })} />}
      </div>
    );
  }

  const previewDoc = `<style>body{font-family:system-ui;max-width:720px;margin:auto;padding:26px;color:#1a1c21}h1{font-size:30px}.btn{display:inline-block;padding:10px 16px;border-radius:9px;text-decoration:none;margin:6px 8px 6px 0}.btn--primary{background:#dd5a10;color:#fff}.btn--secondary{border:1px solid #dd5a10;color:#dd5a10}figure{margin:1em 0}figure img{max-width:100%;border-radius:12px;background:#eee;min-height:120px}.cms-faq details{border:1px solid #e6e4de;border-radius:10px;padding:8px 12px;margin:6px 0}.cms-field{margin:10px 0;display:flex;flex-direction:column;gap:4px}.cms-field input,.cms-field select,.cms-field textarea{padding:8px;border:1px solid #ccc;border-radius:8px}label{font-weight:600;font-size:14px}</style>${renderDoc(doc)}`;

  return (
    <main style={{ display: 'grid', gridTemplateColumns: '230px 1fr 300px', gap: 14, padding: 16, minHeight: '100vh', fontSize: 14, background: '#f5f4f1' }}>
      <datalist id="cms-links">{links.map((l, li) => (<option key={li} value={l.href}>{l.group} · {l.label}</option>))}</datalist>
      <style>{`@keyframes cmsspin{to{transform:rotate(360deg)}}.cms-spin{animation:cmsspin .8s linear infinite}`}</style>
      {busy && (
        <div role="status" aria-live="polite" style={{ position: 'fixed', inset: 0, background: 'rgba(26,28,33,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '22px 28px', display: 'flex', gap: 14, alignItems: 'center', boxShadow: '0 12px 44px rgba(0,0,0,.28)' }}>
            <span className="cms-spin" style={{ width: 22, height: 22, border: '3px solid #eee', borderTopColor: '#dd5a10', borderRadius: '50%', display: 'inline-block' }} />
            <span style={{ fontWeight: 600, color: '#1a1c21' }}>{busy}</span>
          </div>
        </div>
      )}
      {/* IZQUIERDA: páginas + importar */}
      <aside style={{ ...box, overflowY: 'auto', maxHeight: '96vh' }}>
        {sessionUser && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 12, color: '#777' }}>
            <span>{sessionUser.email} · {sessionUser.role === 'admin' ? 'admin' : 'editor'}</span>
            <button style={{ ...btn, padding: '3px 8px', fontSize: 11 }} onClick={logout}>Salir</button>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong>Páginas</strong><button style={btnPri} onClick={newPage}>+ Nueva</button>
        </div>
        <div style={lbl}>Importar existente</div>
        <select value="" onChange={(e) => importExisting(e.target.value)} style={{ ...inp, marginBottom: 10 }}>
          <option value="">Elegir… ({existing.length})</option>
          {existing.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
        </select>
        {pages.map((p) => (
          <div key={p.id} onClick={() => loadPage(p.id)} style={{ padding: 8, borderRadius: 8, cursor: 'pointer', background: pageId === p.id ? '#f0e6dc' : 'transparent' }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.title}</div>
            <div style={{ fontSize: 11, color: '#999' }}>{p.urlPath} · {p.bindingKind !== 'standalone' ? p.bindingKind : 'standalone'} · {p.status} · v{p.currentVersion}</div>
          </div>
        ))}
      </aside>

      {/* CENTRO: constructor / html / preview / json */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ ...box, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {(['build', 'html', 'preview', 'json', 'seo', 'map'] as const).map((t) => (
            <button key={t} style={t === tab ? btnPri : btn} onClick={() => { if (t === 'html') setHtmlBuf(renderDoc(doc)); if (t === 'seo') loadSeo(); setTab(t); }}>
              {t === 'build' ? 'Constructor' : t === 'html' ? 'HTML' : t === 'preview' ? 'Vista previa' : t === 'json' ? 'JSON' : t === 'seo' ? 'Schema / SEO' : 'Mapa del sitio'}
            </button>
          ))}
          {busy && <span style={{ color: '#dd5a10', marginLeft: 8 }}>{busy}</span>}
          {note && !busy && <span style={{ color: '#40794a', marginLeft: 8, fontSize: 13 }}>{note}</span>}
        </div>

        {tab === 'build' && (
          <div style={box}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, paddingBottom: 12, borderBottom: '1px dashed #e0e0e0' }}>
              <span style={{ ...lbl, margin: '4px 8px 0 0' }}>Agregar módulo:</span>
              {(Object.keys(BLOCK_LABELS) as CmsBlockType[]).map((t) => <button key={t} style={btn} onClick={() => add(t)}>+ {BLOCK_LABELS[t]}</button>)}
            </div>
            {doc.blocks.length === 0 && <div style={{ color: '#999', fontStyle: 'italic' }}>Sin bloques. Agrega un módulo o importa HTML.</div>}
            {doc.blocks.map((b, i) => BlockCard(b, i))}
          </div>
        )}

        {tab === 'html' && (
          <div style={box}>
            <div style={lbl}>HTML de la página (edítalo y adáptalo a bloques)</div>
            <textarea style={{ ...inp, minHeight: 340, fontFamily: 'monospace', fontSize: 12 }} value={htmlBuf} onChange={(e) => setHtmlBuf(e.target.value)} />
            <button style={{ ...btnPri, marginTop: 8 }} onClick={applyHtml}>Adaptar HTML → bloques</button>
          </div>
        )}

        {tab === 'preview' && (
          <div style={{ ...box, padding: 0, overflow: 'hidden' }}>
            <iframe title="preview" style={{ width: '100%', height: '70vh', border: 0, background: '#fff' }} srcDoc={previewDoc} />
          </div>
        )}

        {tab === 'json' && <pre style={{ ...box, maxHeight: '70vh', overflow: 'auto', fontSize: 12, fontFamily: 'monospace' }}>{JSON.stringify(doc, null, 2)}</pre>}

        {tab === 'seo' && (
          <div style={box}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
              <strong>Schema.org &amp; sitemap de esta página</strong>
              <button style={{ ...btn, marginLeft: 'auto' }} onClick={loadSeo}>↻ Regenerar</button>
            </div>
            {!seo && <div style={{ color: '#999' }}>Generando…</div>}
            {seo && (<>
              <div style={{ fontSize: 12.5, color: '#666', marginBottom: 10 }}>
                Tipos generados: {(seo.nodes || []).map((n) => <span key={n} style={{ background: '#f6e6d7', color: '#97400c', borderRadius: 6, padding: '2px 8px', marginRight: 6, fontFamily: 'monospace', fontSize: 11 }}>{n}</span>)}
              </div>
              <div style={lbl}>Meta tags (title, description, Open Graph, Twitter)</div>
              <pre style={{ maxHeight: '30vh', overflow: 'auto', fontSize: 12, fontFamily: 'monospace', background: '#fbfbfa', border: '1px solid #eee', borderRadius: 8, padding: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{seo.metaTags}</pre>
              <div style={lbl}>Schema.org (JSON-LD que se inyecta en el &lt;head&gt; de /p/{doc.slug || slugify(doc.title)})</div>
              <pre style={{ maxHeight: '42vh', overflow: 'auto', fontSize: 12, fontFamily: 'monospace', background: '#fbfbfa', border: '1px solid #eee', borderRadius: 8, padding: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{seo.headTags}</pre>
              <div style={lbl}>Entrada de sitemap.xml</div>
              <pre style={{ fontSize: 12, fontFamily: 'monospace', background: '#fbfbfa', border: '1px solid #eee', borderRadius: 8, padding: 12, whiteSpace: 'pre-wrap' }}>{seo.sitemapXml}</pre>
              <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>Esto es exactamente lo que verán Google y los buscadores cuando la página esté publicada.</div>
            </>)}
          </div>
        )}
        {tab === 'map' && (
          <div style={box}>
            <strong>Mapa del sitio</strong>
            <p style={{ fontSize: 12.5, color: '#888', margin: '6px 0 14px' }}>Cada página real del sitio (motos, blog, legales, home) se puede editar aquí — el punto de color muestra si el CMS ya la tocó: <b>editar</b> la abre (importándola si es la primera vez), <b>ver</b> abre la página real, <b>vista previa del borrador</b> muestra cómo quedaría sin publicar. <b>+ subpágina</b> crea una página nueva en una URL propia.</p>
            {siteMap.map((n) => renderMapNode(n, 0))}
            {!siteMap.length && <div style={{ color: '#999' }}>Cargando mapa…</div>}
          </div>
        )}
      </section>

      {/* DERECHA: meta + guardar/publicar + versiones + IA opcional */}
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: '96vh' }}>
        <div style={box}>
          <div style={lbl}>Título</div>
          <input style={inp} value={doc.title} onChange={(e) => setDoc({ ...doc, title: e.target.value })} />
          <div style={lbl}>Slug</div>
          <input style={inp} value={doc.slug} placeholder={slugify(doc.title)} onChange={(e) => setDoc({ ...doc, slug: e.target.value })} disabled={!!pageId} />
          <div style={lbl}>URL {binding.kind !== 'standalone' && '(real — la controla la página de origen)'}</div>
          {binding.kind === 'standalone' ? (
            <input style={inp} value={binding.urlPath} placeholder={`/p/${doc.slug || slugify(doc.title)}`} onChange={(e) => { let v = e.target.value; if (v && !v.startsWith('/')) v = '/' + v; setBinding({ ...binding, urlPath: v }); }} />
          ) : (
            <input style={{ ...inp, background: '#f3f2ee', color: '#888' }} value={binding.urlPath} disabled />
          )}
          <div style={lbl}>Schema.org</div>
          <select style={inp} value={doc.schema.type} onChange={(e) => setDoc({ ...doc, schema: { ...doc.schema, type: e.target.value as CmsPageDoc['schema']['type'] } })}>
            {SCHEMA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button style={{ ...btnPri, width: '100%', marginTop: 10 }} onClick={save}>Guardar cambios</button>
          <button style={{ ...btn, width: '100%', marginTop: 6 }} onClick={publish} disabled={!pageId}>Revisar y publicar →</button>
          {pageId && <a href={binding.urlPath || `/p/${doc.slug}`} target="_blank" rel="noreferrer" style={{ ...btn, display: 'block', textAlign: 'center', marginTop: 6, textDecoration: 'none' }}>Ver página ({status})</a>}
          {pageId && <a href={`${binding.urlPath || `/p/${doc.slug}`}?cmsPreview=1`} target="_blank" rel="noreferrer" style={{ ...btn, display: 'block', textAlign: 'center', marginTop: 6, textDecoration: 'none', borderColor: '#dd5a10', color: '#97400c' }}>Vista previa del borrador</a>}
        </div>

        <div style={box}>
          <strong>Versiones</strong>
          <div style={{ maxHeight: 220, overflow: 'auto', marginTop: 8 }}>
            {!versions.length && <div style={{ color: '#999', fontSize: 12 }}>Guarda para crear la v1.</div>}
            {versions.map((v) => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: 12, borderBottom: '1px dashed #eee' }}>
                <span>v{v.version} · <span style={{ color: '#888' }}>{v.source}</span></span>
                <button style={{ ...btn, padding: '2px 8px' }} onClick={() => rollback(v.version)}>restaurar</button>
              </div>
            ))}
          </div>
        </div>

        <div style={box}>
          <button style={{ ...btn, width: '100%' }} onClick={() => setAiOpen(!aiOpen)}>{aiOpen ? '▾' : '▸'} Asistente IA (opcional)</button>
          {aiOpen && (<div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>El agente adapta tu pedido a bloques. Tú revisas y guardas.</div>
            <textarea style={{ ...inp, minHeight: 60 }} value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Ej: agrega una sección de garantía y un formulario de contacto." />
            <button style={{ ...btn, width: '100%', marginTop: 6 }} onClick={aiAssist}>Proponer con IA</button>
          </div>)}
        </div>
      </aside>
    </main>
  );
}
