import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyCmsAccessToken, inviteCmsUser, CMS_ACCESS_COOKIE, type CmsRole } from '@/lib/cms/auth';

export const runtime = 'nodejs';

/** POST /api/cms/auth/invite — { email, role } — solo admins pueden dar de alta gente de marketing. */
export async function POST(req: Request) {
  const token = (await cookies()).get(CMS_ACCESS_COOKIE)?.value;
  const caller = token ? await verifyCmsAccessToken(token) : null;
  if (!caller) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  if (caller.role !== 'admin') {
    return NextResponse.json({ error: 'Solo un admin puede invitar usuarios.' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { email?: string; role?: CmsRole } | null;
  if (!body?.email || !body?.role) {
    return NextResponse.json({ error: 'email y role son requeridos.' }, { status: 400 });
  }
  if (body.role !== 'admin' && body.role !== 'editor') {
    return NextResponse.json({ error: "role debe ser 'admin' o 'editor'." }, { status: 400 });
  }

  const result = await inviteCmsUser(body.email, body.role);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
