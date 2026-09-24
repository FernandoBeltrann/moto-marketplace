import { NextResponse } from 'next/server';
import { renameBlogPostSlug, blogPostPath } from '@/lib/blog';

export const runtime = 'nodejs';

/**
 * POST /api/cms/blog-posts/:id/slug — cambia el slug REAL de un post (y su
 * URL pública) desde el campo "Slug" del Studio. Ver lib/blog.ts::renameBlogPostSlug.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { slug?: string };
    if (!body.slug) return NextResponse.json({ error: 'Falta slug.' }, { status: 400 });
    const result = await renameBlogPostSlug(id, body.slug);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ slug: result.slug, urlPath: blogPostPath({ slug: result.slug }) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
