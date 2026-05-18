import { NextRequest } from 'next/server';
import { logApplicationPayload, stubError, stubOk } from '@/lib/credit-application/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.applicationId) return stubError('applicationId es requerido');
  logApplicationPayload('buro/request', body);
  // TODO: disparar solicitud NIP Buró manualmente en backend
  return stubOk({ message: 'NIP solicitado (stub). Revisa tu app o SMS de Buró.' });
}
