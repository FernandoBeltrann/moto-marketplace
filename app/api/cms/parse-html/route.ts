import { NextResponse } from 'next/server';
import { htmlToBlocks } from '@/lib/cms/html-to-blocks';
import { normalizeDoc, slugify } from '@/lib/cms/blocks';
import { renderDocHtml } from '@/lib/cms/render';

export const runtime = 'nodejs';

/**
 * POST /api/cms/parse-html — "adaptar al framework" SIN LLM: HTML -> bloques
 * canónicos -> render. Es el flujo por defecto (HTML primero).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { html?: string; title?: string; slug?: string; schemaType?: string };
    if (!body.html) return NextResponse.json({ error: 'Falta html.' }, { status: 400 });
    const blocks = htmlToBlocks(body.html);
    const title = body.title || (blocks.find((b) => b.type === 'heading') as { text?: string } | undefined)?.text || 'Nueva página';
    const doc = normalizeDoc(
      { slug: body.slug || slugify(title), title, blocks, schema: { type: body.schemaType || 'WebPage' } },
      slugify(title)
    );
    return NextResponse.json({ doc, html: renderDocHtml(doc) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
