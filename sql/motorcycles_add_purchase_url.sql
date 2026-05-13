-- URL del flujo de compra con agente (Finva, CRM, etc.) por moto.
alter table public.motorcycles add column if not exists purchase_url text;

comment on column public.motorcycles.purchase_url is 'Enlace externo para iniciar compra con agente (ej. Finva).';
