/**
 * Lookup en vivo del código postal usado por `StepAddress`. Llama a
 * `/get_neighborhoods/{cp}` (Finva) y devuelve `{ ciudad, estado, neighborhoods }`
 * ya normalizado. Si Finva no está configurado en dev, devuelve un stub vacío
 * para que la UI caiga al modo "texto libre".
 */
import { NextRequest } from 'next/server';
import { isValidPostalCode } from '@/lib/credit-application/validation';
import { isFinvaConfigured, stubError, stubOk } from '@/lib/credit-application/server';
import { getNeighborhoods, unwrapNeighborhoods } from '@/lib/finva/client';

export async function GET(req: NextRequest) {
  const zip = req.nextUrl.searchParams.get('zip')?.trim() ?? '';
  if (!isValidPostalCode(zip)) return stubError('Código postal inválido');

  if (!isFinvaConfigured()) {
    return stubOk({ zip, ciudad: '', estado: '', neighborhoods: [] as string[] });
  }

  const res = await getNeighborhoods(zip);
  if (!res.ok) {
    return stubError(res.error || 'No pudimos consultar tu código postal', res.status || 502, {
      label: 'zip get_neighborhoods',
      details: res.details,
    });
  }

  const normalized = unwrapNeighborhoods(res.data);
  return stubOk({
    zip,
    ciudad: normalized.city ?? '',
    estado: normalized.state ?? '',
    neighborhoods: normalized.neighborhoods ?? [],
  });
}
