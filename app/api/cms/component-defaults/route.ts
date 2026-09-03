import { NextRequest, NextResponse } from 'next/server';
import { getComponentDefaults } from '@/lib/cms/component-defaults';
import type { CmsBindingKind } from '@/types/cms';

export const runtime = 'nodejs';

const VALID_KINDS: CmsBindingKind[] = ['standalone', 'moto', 'blog', 'static'];

/**
 * GET /api/cms/component-defaults?kind=moto&key=moto:123
 * Valores reales actuales para pre-llenar la pestaña "Componentes" del
 * Studio — ver lib/cms/component-defaults.ts.
 */
export async function GET(req: NextRequest) {
  const kindParam = req.nextUrl.searchParams.get('kind') || 'standalone';
  const key = req.nextUrl.searchParams.get('key');
  const kind = (VALID_KINDS as string[]).includes(kindParam) ? (kindParam as CmsBindingKind) : 'standalone';
  const defaults = await getComponentDefaults(kind, key).catch(() => ({}));
  return NextResponse.json({ defaults });
}
