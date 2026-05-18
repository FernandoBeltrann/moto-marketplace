import { NextRequest } from 'next/server';
import { isValidCurp } from '@/lib/credit-application/validation';
import { logApplicationPayload, mockCurpLookup, stubError, stubOk } from '@/lib/credit-application/server';

export async function GET(req: NextRequest) {
  const curp = req.nextUrl.searchParams.get('curp')?.trim() ?? '';
  if (!isValidCurp(curp)) return stubError('CURP inválido');
  const data = mockCurpLookup(curp);
  logApplicationPayload('curp', { curp });
  // TODO: consultar API CURP real
  return stubOk(data);
}
