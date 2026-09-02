-- CMS auth: quién puede entrar a /studio y usar /api/cms/*.
-- Reusa el mismo patrón de LoanCalculator2 (Supabase Auth + tabla de roles propia),
-- pero contra el proyecto de Supabase de moto-marketplace, que es independiente
-- del de LoanCalculator2/Finva.
--
-- Requiere que el usuario ya exista en Supabase Auth (auth.users) de ESTE proyecto
-- — se crea invitándolo por email (ver /api/cms/auth/invite, requiere rol 'admin').

create table if not exists public.cms_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

comment on table public.cms_users is
  'Usuarios con acceso al Studio/CMS. admin: gestiona usuarios + todo lo de editor. editor: crea/edita/publica/rollback de páginas (equipo de marketing).';

alter table public.cms_users enable row level security;
-- Sin policies públicas a propósito: solo el service_role (backend de Next.js) puede leer/escribir esta tabla.

-- Bootstrap: da de alta al primer admin manualmente (reemplaza el uuid y el email).
-- El uuid debe ser el id de un usuario ya existente en Supabase Auth de ESTE proyecto
-- (Authentication → Users en el dashboard de Supabase de moto-marketplace, o créalo ahí mismo).
--
-- insert into public.cms_users (id, email, role)
-- values ('00000000-0000-0000-0000-000000000000', 'diego@finva-app.com', 'admin')
-- on conflict (id) do update set role = excluded.role;
