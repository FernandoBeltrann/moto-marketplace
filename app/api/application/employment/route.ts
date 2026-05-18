import { NextRequest } from 'next/server';
import { logApplicationPayload, stubError, stubOk } from '@/lib/credit-application/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.applicationId || !body?.employment?.company) {
    return stubError('applicationId y employment son requeridos');
  }
  logApplicationPayload('employment', body);
  return stubOk();
}
