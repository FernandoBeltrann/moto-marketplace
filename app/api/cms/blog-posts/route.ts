import { NextRequest, NextResponse } from 'next/server';
import { createBlogPostDraft, blogPostPath } from '@/lib/blog';

export const runtime = 'nodejs';

/**
 * POST /api/cms/blog-posts — crea un post ancla (published: false) para el
 * botón "+ Nuevo artículo" del Mapa del sitio del Studio. El Studio abre de
 * inmediato una página CMS bound (`blog:<id>`) sobre este post; el contenido
 * real se escribe ahí. Ver lib/blog.ts::createBlogPostDraft.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { title?: string };
    const post = await createBlogPostDraft(body.title || 'Nuevo artículo');
    return NextResponse.json({ post: { id: post.id, slug: post.slug, title: post.title, urlPath: blogPostPath(post) } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
