import { NextRequest } from 'next/server';
import { isValidNip } from '@/lib/credit-application/validation';
import { logApplicationPayload, stubError, stubOk } from '@/lib/credit-application/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.applicationId) return stubError('applicationId es requerido');
  if (!isValidNip(body?.nip ?? '')) return stubError('NIP debe ser 6 dígitos');
  logApplicationPayload('buro/verify', { applicationId: body.applicationId });
  // TODO: verificar NIP con Buró
  return stubOk();
}
