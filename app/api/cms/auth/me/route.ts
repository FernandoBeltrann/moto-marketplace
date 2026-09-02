import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyCmsAccessToken, CMS_ACCESS_COOKIE } from '@/lib/cms/auth';

export const runtime = 'nodejs';

/** GET /api/cms/auth/me — usuario CMS actual (o 401). Lo usa el Studio para pintar "sesión de …". */
export async function GET() {
  const token = (await cookies()).get(CMS_ACCESS_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const user = await verifyCmsAccessToken(token);
  if (!user) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });

  return NextResponse.json({ user });
}
