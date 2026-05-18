import { NextRequest } from 'next/server';
import { logApplicationPayload, stubError, stubOk } from '@/lib/credit-application/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.applicationId || !body?.address?.street || !body?.address?.postalCode) {
    return stubError('applicationId y address incompletos');
  }
  logApplicationPayload('address', body);
  return stubOk();
}
