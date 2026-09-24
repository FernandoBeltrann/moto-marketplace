import { NextRequest, NextResponse } from 'next/server';

// Protege /studio y /api/cms/* — acceso al CMS para el equipo de marketing.
// Implementado con fetch directo a la API REST de Supabase (Auth + PostgREST)
// en vez del SDK, para que corra sin problemas en el runtime Edge del middleware.
// Misma lógica que app/auth/decorators.py::token_required del backend original
// (LoanCalculator2), pero contra el proyecto de Supabase propio de moto-marketplace.

const ACCESS_COOKIE = 'cms_access_token';
const REFRESH_COOKIE = 'cms_refresh_token';

const PUBLIC_STUDIO_PATHS = ['/studio/login'];
const PUBLIC_API_PATHS = ['/api/cms/auth/login', '/api/cms/auth/refresh'];

function isProtected(pathname: string) {
  return pathname.startsWith('/studio') || pathname.startsWith('/api/cms');
}

function isPublic(pathname: string) {
  return (
    PUBLIC_STUDIO_PATHS.some((p) => pathname === p) ||
    PUBLIC_API_PATHS.some((p) => pathname === p)
  );
}

async function getSupabaseUser(accessToken: string, supabaseUrl: string, serviceKey: string) {
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${accessToken}`, apikey: serviceKey },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.id ? (data as { id: string; email?: string }) : null;
}

async function getCmsRole(userId: string, supabaseUrl: string, serviceKey: string) {
  const res = await fetch(`${supabaseUrl}/rest/v1/cms_users?id=eq.${userId}&select=role`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) return null;
  const rows = (await res.json().catch(() => [])) as { role?: string }[];
  return rows[0]?.role ?? null;
}

async function tryRefresh(refreshToken: string, supabaseUrl: string, serviceKey: string) {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: serviceKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data?.access_token || !data?.refresh_token) return null;
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresIn: (data.expires_in as number) ?? 3600,
  };
}

function denyResponse(req: NextRequest, reason: string) {
  if (req.nextUrl.pathname.startsWith('/api/cms')) {
    return NextResponse.json({ error: reason }, { status: 401 });
  }
  const loginUrl = new URL('/studio/login', req.url);
  loginUrl.searchParams.set('next', req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!isProtected(pathname) || isPublic(pathname)) return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'CMS auth no configurado en el servidor.' }, { status: 500 });
  }

  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  if (accessToken) {
    const user = await getSupabaseUser(accessToken, supabaseUrl, serviceKey);
    if (user) {
      const role = await getCmsRole(user.id, supabaseUrl, serviceKey);
      if (role) return NextResponse.next();
      return denyResponse(req, 'Este usuario no tiene acceso al Studio.');
    }
  }

  // access_token ausente/expirado — intenta refrescar con el refresh_token.
  if (refreshToken) {
    const refreshed = await tryRefresh(refreshToken, supabaseUrl, serviceKey);
    if (refreshed) {
      const user = await getSupabaseUser(refreshed.accessToken, supabaseUrl, serviceKey);
      const role = user ? await getCmsRole(user.id, supabaseUrl, serviceKey) : null;
      if (role) {
        const res = NextResponse.next();
        const isProd = process.env.NODE_ENV === 'production';
        res.cookies.set(ACCESS_COOKIE, refreshed.accessToken, {
          httpOnly: true, secure: isProd, sameSite: 'strict', path: '/', maxAge: refreshed.expiresIn,
        });
        res.cookies.set(REFRESH_COOKIE, refreshed.refreshToken, {
          httpOnly: true, secure: isProd, sameSite: 'strict', path: '/', maxAge: 60 * 60 * 24 * 7,
        });
        return res;
      }
    }
  }

  return denyResponse(req, 'No autenticado.');
}

export const config = {
  matcher: ['/studio/:path*', '/api/cms/:path*'],
};
