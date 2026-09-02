import { NextResponse } from 'next/server';
import { listPages, createDraft, updateDraft } from '@/lib/cms/pages';
import { normalizeDoc } from '@/lib/cms/blocks';

export const runtime = 'nodejs';

/** GET /api/cms/pages — lista de páginas (para el Studio). */
export async function GET() {
  const pages = await listPages().catch(() => []);
  return NextResponse.json({ pages });
}

/** POST /api/cms/pages — guarda una edición MANUAL del doc (bloques o HTML editados). */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { doc?: unknown; pageId?: string; source?: 'manual' | 'agent' | 'rollback'; note?: string };
    if (!body.doc) return NextResponse.json({ error: 'Falta doc.' }, { status: 400 });
    const doc = normalizeDoc(body.doc);
    const source = body.source ?? 'manual';
    const page = body.pageId
      ? await updateDraft(body.pageId, doc, source, body.note ?? 'Edición')
      : await createDraft(doc, source, body.note ?? 'Creación');
    return NextResponse.json({ page });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
