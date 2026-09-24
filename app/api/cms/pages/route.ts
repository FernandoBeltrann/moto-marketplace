import { NextResponse } from 'next/server';
import { listPages, createDraft, updateDraft, type CmsBinding } from '@/lib/cms/pages';
import { normalizeDoc } from '@/lib/cms/blocks';
import type { CmsBindingKind } from '@/types/cms';

export const runtime = 'nodejs';

/** GET /api/cms/pages — lista de páginas (para el Studio). */
export async function GET() {
  const pages = await listPages().catch(() => []);
  return NextResponse.json({ pages });
}

/**
 * POST /api/cms/pages — guarda una edición MANUAL del doc (bloques o HTML editados).
 * body.binding (solo al CREAR desde "Importar existente" o el Mapa del sitio):
 * ata la página CMS a una página real — ver lib/cms/bindings.ts.
 * body.urlPath (solo páginas standalone existentes): permite reconfigurar dónde vive.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      doc?: unknown;
      pageId?: string;
      source?: 'manual' | 'agent' | 'rollback';
      note?: string;
      binding?: { kind: CmsBindingKind; key: string | null; urlPath: string };
      urlPath?: string;
    };
    if (!body.doc) return NextResponse.json({ error: 'Falta doc.' }, { status: 400 });
    const doc = normalizeDoc(body.doc);
    const source = body.source ?? 'manual';
    const binding: CmsBinding | undefined = body.binding
      ? { kind: body.binding.kind, key: body.binding.key, urlPath: body.binding.urlPath }
      : undefined;
    const page = body.pageId
      ? await updateDraft(body.pageId, doc, source, body.note ?? 'Edición', body.urlPath)
      : await createDraft(doc, source, body.note ?? 'Creación', binding);
    return NextResponse.json({ page });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
