import { NextRequest } from 'next/server';
import { logApplicationPayload, stubError, stubOk } from '@/lib/credit-application/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.applicationId || !body?.contact?.email || !body?.contact?.phone) {
    return stubError('applicationId, email y phone son requeridos');
  }
  logApplicationPayload('contact', body);
  // TODO: Finva / Supabase
  return stubOk();
}
