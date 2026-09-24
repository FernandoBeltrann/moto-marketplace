import { NextResponse } from 'next/server';
import { CMS_ACCESS_COOKIE, CMS_REFRESH_COOKIE } from '@/lib/cms/auth';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CMS_ACCESS_COOKIE, '', { path: '/', maxAge: 0 });
  res.cookies.set(CMS_REFRESH_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
