import { NextResponse } from 'next/server';
import { getPageById, listVersions } from '@/lib/cms/pages';

export const runtime = 'nodejs';

/** GET /api/cms/pages/:id — página + historial de versiones. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await getPageById(id);
  if (!page) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  const versions = await listVersions(id);
  return NextResponse.json({ page, versions });
}
