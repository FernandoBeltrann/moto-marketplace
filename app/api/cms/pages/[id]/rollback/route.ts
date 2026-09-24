import { NextResponse } from 'next/server';
import { rollbackToVersion } from '@/lib/cms/pages';

export const runtime = 'nodejs';

/** POST /api/cms/pages/:id/rollback { version } — restaura una versión previa como borrador. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { version?: number };
    if (typeof body.version !== 'number') {
      return NextResponse.json({ error: 'Falta version.' }, { status: 400 });
    }
    const page = await rollbackToVersion(id, body.version);
    return NextResponse.json({ page });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
