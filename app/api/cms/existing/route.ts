import { NextResponse } from 'next/server';
import { getExistingPages } from '@/lib/cms/existing';

export const runtime = 'nodejs';

/** GET /api/cms/existing — páginas del sitio para importar al Studio con su HTML pre-cargado. */
export async function GET() {
  const pages = await getExistingPages().catch(() => []);
  return NextResponse.json({ pages });
}
