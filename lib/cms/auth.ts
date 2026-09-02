import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServiceSupabase } from '@/lib/supabase/server';

export type CmsRole = 'admin' | 'editor';

export type CmsSessionUser = {
  id: string;
  email: string;
  role: CmsRole;
};

/**
 * Cliente de Supabase dedicado EXCLUSIVAMENTE a operaciones de auth
 * (signInWithPassword, refreshSession, admin.inviteUserByEmail, getUser).
 *
 * Importante — misma lección que el backend original (LoanCalculator2,
 * app/extensions/supabase.py): signInWithPassword/refreshSession mutan el
 * header de Authorization del cliente al JWT del usuario autenticado. Si ese
 * cliente se comparte con el de lectura/escritura de datos (createServiceSupabase),
 * las siguientes queries dejarían de usar el service_role y quedarían sujetas a
 * RLS silenciosamente. Por eso este cliente vive separado y NUNCA se usa para
 * leer/escribir tablas — solo para las llamadas a supabase.auth.*.
 */
let authClient: SupabaseClient | null = null;
function getAuthSupabase(): SupabaseClient {
  if (authClient) return authClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para el login del Studio.');
  }
  authClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return authClient;
}

/** Busca el rol CMS de un usuario ya autenticado (tabla cms_users, propia de moto-marketplace). */
export async function getCmsRole(userId: string): Promise<CmsRole | null> {
  const db = createServiceSupabase();
  const { data, error } = await db.from('cms_users').select('role').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  return data.role as CmsRole;
}

export type SignInResult =
  | { ok: true; accessToken: string; refreshToken: string; expiresIn: number; user: CmsSessionUser }
  | { ok: false; status: number; error: string };

/** Login con email + password contra el Supabase Auth del PROPIO proyecto de moto-marketplace. */
export async function signInCmsUser(email: string, password: string): Promise<SignInResult> {
  const supabase = getAuthSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data?.user || !data.session) {
    return { ok: false, status: 401, error: 'Credenciales inválidas.' };
  }

  const role = await getCmsRole(data.user.id);
  if (!role) {
    return { ok: false, status: 403, error: 'Este usuario no tiene acceso al Studio. Pide que un admin lo invite.' };
  }

  return {
    ok: true,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in,
    user: { id: data.user.id, email: data.user.email ?? email, role },
  };
}

/** Valida un access_token y devuelve el usuario CMS (o null si no es válido / no tiene rol). */
export async function verifyCmsAccessToken(accessToken: string): Promise<CmsSessionUser | null> {
  const supabase = getAuthSupabase();
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) return null;
  const role = await getCmsRole(data.user.id);
  if (!role) return null;
  return { id: data.user.id, email: data.user.email ?? '', role };
}

export type RefreshResult =
  | { ok: true; accessToken: string; refreshToken: string; expiresIn: number }
  | { ok: false };

export async function refreshCmsSession(refreshToken: string): Promise<RefreshResult> {
  const supabase = getAuthSupabase();
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data?.session) return { ok: false };
  return {
    ok: true,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in,
  };
}

/** Invita a un usuario nuevo (equipo de marketing) por email. Solo lo debe llamar un admin. */
export async function inviteCmsUser(email: string, role: CmsRole): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getAuthSupabase();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);
  if (error || !data?.user) {
    return { ok: false, error: error?.message ?? 'No se pudo invitar al usuario.' };
  }
  const db = createServiceSupabase();
  const { error: upsertError } = await db
    .from('cms_users')
    .upsert({ id: data.user.id, email, role }, { onConflict: 'id' });
  if (upsertError) {
    return { ok: false, error: `Usuario invitado pero no se pudo guardar el rol: ${upsertError.message}` };
  }
  return { ok: true };
}

export const CMS_ACCESS_COOKIE = 'cms_access_token';
export const CMS_REFRESH_COOKIE = 'cms_refresh_token';
