/**
 * Alta manual de usuarios del Studio/CMS (sin pasar por la API /invite,
 * útil para dar de alta al primer admin — antes de que exista ningún
 * admin que pueda llamar a esa ruta).
 *
 * Uso:
 *   node --env-file=.env scripts/cms-invite.mjs diego@finva-app.com admin
 *   node --env-file=.env scripts/cms-invite.mjs marketing@agencia.com editor
 *
 * Requiere en .env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Envía un correo de invitación de Supabase Auth (definir contraseña) y
 * guarda el rol en cms_users. No usa lib/cms/auth.ts (evita depender del
 * loader de módulos TS de Next) — llama directo a la API REST de Supabase.
 */
const [, , email, role] = process.argv;
if (!email || (role !== 'admin' && role !== 'editor')) {
  console.error('Uso: node --env-file=.env scripts/cms-invite.mjs <email> <admin|editor>');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const inviteRes = await fetch(`${url}/auth/v1/invite`, {
  method: 'POST',
  headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email }),
});
const invited = await inviteRes.json();
if (!inviteRes.ok || !invited?.id) {
  console.error('Error invitando:', invited?.msg || invited?.error_description || JSON.stringify(invited));
  process.exit(1);
}

const upsertRes = await fetch(`${url}/rest/v1/cms_users?on_conflict=id`, {
  method: 'POST',
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates',
  },
  body: JSON.stringify({ id: invited.id, email, role }),
});
if (!upsertRes.ok) {
  console.error('Usuario invitado pero no se pudo guardar el rol:', await upsertRes.text());
  process.exit(1);
}

console.log(`Invitado ${email} como ${role}. Revisa su correo para definir contraseña.`);
