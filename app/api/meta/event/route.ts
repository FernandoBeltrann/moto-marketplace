/**
 * FIN-151: copia por servidor de los eventos del pixel de Meta (ver lib/meta/capi.ts).
 */
import { handleMetaEventRequest } from '@/lib/meta/capi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return handleMetaEventRequest(request);
}
