import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { publishPage } from '@/lib/cms/pages';

export const runtime = 'nodejs';

/**
 * POST /api/cms/pages/:id/publish — despliegue semimanual: copia el
 * borrador revisado a published_doc y revalida la ruta pública (ISR).
 * "Push a prod" sin deploy de código: para páginas standalone es su
 * urlPath (antes fijo en /p/[slug], ahora configurable); para páginas con
 * binding (moto/blog/estática) es la URL REAL que ya existía en el
 * sitio — así el cambio se refleja ahí mismo, no en una copia aparte.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const page = await publishPage(id);
    if (!page) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    revalidatePath(page.urlPath);
    return NextResponse.json({ page });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
