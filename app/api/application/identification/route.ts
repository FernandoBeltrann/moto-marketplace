import { NextRequest } from 'next/server';
import { logApplicationPayload, stubError, stubOk } from '@/lib/credit-application/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.applicationId || !body?.identity?.curp) {
    return stubError('applicationId e identity son requeridos');
  }
  logApplicationPayload('identification', body);
  return stubOk();
}
