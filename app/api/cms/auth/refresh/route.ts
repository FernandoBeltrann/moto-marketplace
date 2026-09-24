import { NextResponse } from 'next/server';
import { refreshCmsSession, CMS_ACCESS_COOKIE, CMS_REFRESH_COOKIE } from '@/lib/cms/auth';

export const runtime = 'nodejs';

/** POST /api/cms/auth/refresh — usa la cookie de refresh_token para renovar la sesión. */
export async function POST(req: Request) {
  const refreshToken = req.headers
    .get('cookie')
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CMS_REFRESH_COOKIE}=`))
    ?.split('=')[1];

  if (!refreshToken) {
    return NextResponse.json({ error: 'No hay sesión que renovar.' }, { status: 401 });
  }

  const result = await refreshCmsSession(refreshToken);
  if (!result.ok) {
    const res = NextResponse.json({ error: 'Sesión expirada, vuelve a iniciar sesión.' }, { status: 401 });
    res.cookies.set(CMS_ACCESS_COOKIE, '', { path: '/', maxAge: 0 });
    res.cookies.set(CMS_REFRESH_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  }

  const res = NextResponse.json({ ok: true });
  const isProd = process.env.NODE_ENV === 'production';
  res.cookies.set(CMS_ACCESS_COOKIE, result.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: result.expiresIn,
  });
  res.cookies.set(CMS_REFRESH_COOKIE, result.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
