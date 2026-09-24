-- CMS agéntico — páginas creadas/editadas por marketing vía el Studio.
--
-- Mismo patrón que blog_posts: tabla nueva, RLS activado sin policy pública
-- (el sitio lee con SUPABASE_SERVICE_ROLE_KEY desde el servidor, que no pasa
-- por RLS), trigger que mantiene updated_at y fija published_at la primera
-- vez que se publica.
--
-- Fuente de verdad = JSON de bloques (columnas jsonb `draft_doc` /
-- `published_doc`, forma = CmsPageDoc en types/cms.ts). El sitio público solo
-- lee `published_doc`; el Studio edita `draft_doc`. Publicar = copiar
-- draft_doc -> published_doc (ver lib/cms/pages.ts::publishPage).

create table if not exists public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  draft_doc jsonb not null,
  published_doc jsonb,
  current_version integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_cms_pages_slug on public.cms_pages (slug);
create index if not exists idx_cms_pages_status on public.cms_pages (status, updated_at desc);

-- Historial append-only: una fila por cada guardado (agente, edición manual o
-- rollback). Habilita diff y rollback en cualquier momento.
create table if not exists public.cms_page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.cms_pages (id) on delete cascade,
  version integer not null,
  doc jsonb not null,
  source text not null default 'agent' check (source in ('agent', 'manual', 'rollback')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_cms_page_versions_page on public.cms_page_versions (page_id, version desc);

-- Feedback de marketing sobre generaciones — el orquestador lo relee y lo
-- dobla en su propio prompt (aprendizaje), igual que
-- studio_conversation_feedback del hackathon. page_id null = feedback global.
create table if not exists public.cms_agent_feedback (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.cms_pages (id) on delete cascade,
  score integer not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_cms_agent_feedback_recent on public.cms_agent_feedback (created_at desc);

alter table public.cms_pages enable row level security;
alter table public.cms_page_versions enable row level security;
alter table public.cms_agent_feedback enable row level security;

create or replace function public.cms_pages_set_timestamps()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if new.status = 'published' and (TG_OP = 'INSERT' or OLD.status <> 'published') then
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cms_pages_set_timestamps on public.cms_pages;
create trigger trg_cms_pages_set_timestamps
  before insert or update on public.cms_pages
  for each row
  execute function public.cms_pages_set_timestamps();
