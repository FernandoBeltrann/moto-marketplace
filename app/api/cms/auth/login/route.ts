import { NextResponse } from 'next/server';
import { signInCmsUser, CMS_ACCESS_COOKIE, CMS_REFRESH_COOKIE } from '@/lib/cms/auth';

export const runtime = 'nodejs';

/** POST /api/cms/auth/login — { email, password } → cookies httpOnly + datos del usuario. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: 'Email y contraseña son requeridos.' }, { status: 400 });
  }

  const result = await signInCmsUser(body.email, body.password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const res = NextResponse.json({ user: result.user });
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
    maxAge: 60 * 60 * 24 * 7, // 7 días, igual que login-portal del backend original
  });
  return res;
}
