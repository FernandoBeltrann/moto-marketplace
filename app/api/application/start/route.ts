import { NextRequest } from 'next/server';
import { logApplicationPayload, stubOk } from '@/lib/credit-application/server';
import { randomUUID } from 'node:crypto';

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.motorcycleId || !body?.quote) {
    return Response.json({ ok: false, error: 'motorcycleId y quote son requeridos' }, { status: 400 });
  }
  const applicationId = randomUUID();
  logApplicationPayload('start', { applicationId, ...body });
  // TODO: persistir en Supabase / Finva CRM
  return stubOk({ applicationId });
}
