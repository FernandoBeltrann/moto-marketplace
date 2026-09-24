import { createServiceSupabase } from '@/lib/supabase/server';
import type { BlogPost } from '@/types/blog';

function blogPostsTable() {
  return process.env.SUPABASE_BLOG_POSTS_TABLE || 'blog_posts';
}

function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : String(v ?? '');
}

function asNullableString(v: unknown): string | null {
  return v == null || v === '' ? null : asString(v);
}

export function mapBlogPostRow(row: Record<string, unknown>): BlogPost {
  return {
    id: asString(row.id),
    title: asString(row.title),
    slug: asString(row.slug),
    author: asNullableString(row.author),
    excerpt: asNullableString(row.excerpt),
    body: asString(row.body),
    coverImageUrl: asNullableString(row.cover_image_url),
    published: row.published === true,
    publishedAt: asNullableString(row.published_at),
    updatedAt: asString(row.updated_at),
    createdAt: asString(row.created_at),
  };
}

/** URL pública de un post: `/blog/<slug>`. */
export function blogPostPath(post: Pick<BlogPost, 'slug'>) {
  return `/blog/${post.slug}`;
}

/** Fecha a mostrar/ordenar: `publishedAt` si existe, si no `createdAt`. */
export function blogPostDate(post: Pick<BlogPost, 'publishedAt' | 'createdAt'>): string {
  return post.publishedAt || post.createdAt;
}

/**
 * Lista de posts publicados, más recientes primero. Si Supabase no está
 * configurado, degrada a una lista vacía en desarrollo (igual de seguro que
 * mostrar "todavía no hay artículos") en vez de tumbar el build — el blog
 * es un módulo nuevo, no hay semilla local que mantener en sync.
 */
export async function getBlogPosts(): Promise<BlogPost[]> {
  if (!supabaseConfigured()) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[blog] Sin NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: blog vacío en desarrollo.'
      );
      return [];
    }
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para leer el blog desde Supabase.'
    );
  }
  const supabase = createServiceSupabase();
  const { data, error } = await supabase
    .from(blogPostsTable())
    .select('*')
    .eq('published', true)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapBlogPostRow(row as Record<string, unknown>));
}

/**
 * Todos los posts (publicados o no), para uso INTERNO del Studio (Mapa del
 * sitio / "Importar existente" — ver lib/cms/bindings.ts): un artículo
 * recién creado con "+ nuevo artículo" nace sin publicar, y necesita
 * aparecer ahí con su punto de estado en borrador aunque getBlogPosts()
 * (la lista PÚBLICA de /blog) todavía no lo incluya.
 */
export async function getBlogPostsAny(): Promise<BlogPost[]> {
  if (!supabaseConfigured()) return [];
  const supabase = createServiceSupabase();
  const { data, error } = await supabase
    .from(blogPostsTable())
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map((row) => mapBlogPostRow(row as Record<string, unknown>));
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const list = await getBlogPosts();
  return list.find((p) => p.slug === slug);
}

/**
 * Como getBlogPostBySlug, pero sin filtrar por `published` — para la vista
 * previa del borrador (?cmsPreview=1) de un artículo recién creado desde
 * "+ nuevo artículo" (nace sin publicar). SOLO se debe llamar después de
 * confirmar sesión válida del Studio (ver lib/cms/overrides.ts) — nunca
 * expuesto a un visitante normal, o cualquiera podría ver un artículo sin
 * publicar adivinando su slug.
 */
export async function getBlogPostBySlugAny(slug: string): Promise<BlogPost | undefined> {
  if (!supabaseConfigured()) return undefined;
  const supabase = createServiceSupabase();
  const { data, error } = await supabase.from(blogPostsTable()).select('*').eq('slug', slug).maybeSingle();
  if (error || !data) return undefined;
  return mapBlogPostRow(data as Record<string, unknown>);
}

/**
 * Crea un post en borrador (`published: false`) para que el Studio pueda
 * abrirlo de inmediato como página CMS bound (`blog:<id>`) — ver
 * `app/api/cms/blog-posts/route.ts` y el botón "+ Nuevo artículo" del Mapa
 * del sitio. El contenido real se escribe después en el Studio; esta fila
 * es solo el ancla en `blog_posts` (id + slug estables) que necesita el
 * binding. No aparece en `/blog` ni es alcanzable por URL hasta publicarse
 * (ver `publishBlogPostIfDraft`).
 */
export async function createBlogPostDraft(title: string): Promise<BlogPost> {
  const supabase = createServiceSupabase();
  const slug = `${title ? slugifyForBlog(title) : 'nuevo-articulo'}-${Date.now().toString(36)}`;
  const { data, error } = await supabase
    .from(blogPostsTable())
    .insert({ title: title || 'Nuevo artículo', slug, body: '', published: false })
    .select('*')
    .single();
  if (error) throw error;
  return mapBlogPostRow(data as Record<string, unknown>);
}

/** Publica el post subyacente si todavía estaba en borrador (no lo despublica nunca). */
export async function publishBlogPostIfDraft(id: string): Promise<void> {
  const supabase = createServiceSupabase();
  const { data } = await supabase.from(blogPostsTable()).select('published, published_at').eq('id', id).single();
  if (!data || data.published) return;
  await supabase
    .from(blogPostsTable())
    .update({ published: true, published_at: data.published_at || new Date().toISOString() })
    .eq('id', id);
}

/**
 * Sincroniza el título (y opcionalmente el excerpt) REALES del post con lo
 * que quedó publicado en el CMS. Sin esto, /blog (el listado público) y
 * cualquier otro lugar que lea blog_posts directo (no vía override) se
 * quedaban pegados en el título con el que nació el post — ej. "Nuevo
 * artículo" — aunque ya se hubiera publicado un título real desde el
 * Studio. Se llama en cada publicación, no solo en la primera.
 */
export async function syncBlogPostMeta(id: string, title: string, excerpt?: string | null): Promise<void> {
  if (!title) return;
  const supabase = createServiceSupabase();
  const update: Record<string, unknown> = { title };
  if (excerpt) update.excerpt = excerpt;
  await supabase.from(blogPostsTable()).update(update).eq('id', id);
}

export type RenameBlogSlugResult = { slug: string } | { error: string };

/**
 * Cambia el slug REAL de un post (y por lo tanto su URL pública,
 * /blog/<slug>) — para que marketing pueda limpiar el sufijo aleatorio con
 * el que nace un artículo creado desde "+ nuevo artículo". Normaliza el
 * slug propuesto y rechaza si ya lo usa otro post.
 */
export async function renameBlogPostSlug(id: string, desiredSlug: string): Promise<RenameBlogSlugResult> {
  const supabase = createServiceSupabase();
  const slug = slugifyForBlog(desiredSlug);
  const { data: clash } = await supabase.from(blogPostsTable()).select('id').eq('slug', slug).neq('id', id).maybeSingle();
  if (clash) return { error: `Ese slug ya lo usa otro artículo: "${slug}".` };
  const { error } = await supabase.from(blogPostsTable()).update({ slug }).eq('id', id);
  if (error) return { error: error.message };
  return { slug };
}

function slugifyForBlog(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'articulo';
}
