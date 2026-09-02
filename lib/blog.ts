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

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const list = await getBlogPosts();
  return list.find((p) => p.slug === slug);
}
