-- Snapshot del último estado conocido de cada pago Mercado Pago.
-- Se INSERTA desde /api/payments/process (al crear el pago con MP) y se
-- ACTUALIZA desde /api/payments/webhook a medida que cambia el estado.
-- Acceso únicamente con SUPABASE_SERVICE_ROLE_KEY desde el servidor.
create table if not exists public.motoclick_payments (
  id text primary key,
  status text,
  status_detail text,
  payment_type_id text,
  payment_method_id text,
  installments integer,
  transaction_amount numeric,
  external_reference text,
  -- Datos del comprador capturados ANTES del Brick.
  buyer_full_name text,
  buyer_email text,
  buyer_phone text,
  payer_email text,
  -- Moto vinculada (para reportes y para el correo al cliente).
  motorcycle_id text,
  motorcycle_name text,
  metadata jsonb,
  live_mode boolean,
  raw jsonb,
  -- Marca de tiempo del envío de correos para no duplicar (process y webhook
  -- pueden disparar la notificación; sólo el primero gana).
  notifications_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migración idempotente para tablas creadas con la versión previa.
alter table public.motoclick_payments
  add column if not exists buyer_full_name text,
  add column if not exists buyer_email text,
  add column if not exists buyer_phone text,
  add column if not exists motorcycle_id text,
  add column if not exists motorcycle_name text,
  add column if not exists notifications_sent_at timestamptz;

create index if not exists idx_motoclick_payments_status
  on public.motoclick_payments (status);
create index if not exists idx_motoclick_payments_external_ref
  on public.motoclick_payments (external_reference);
create index if not exists idx_motoclick_payments_updated_at
  on public.motoclick_payments (updated_at desc);
create index if not exists idx_motoclick_payments_motorcycle
  on public.motoclick_payments (motorcycle_id);
create index if not exists idx_motoclick_payments_buyer_email
  on public.motoclick_payments (buyer_email);

alter table public.motoclick_payments enable row level security;
-- No exponemos policies públicas: lectura/escritura sólo con service role.

create or replace function public.motoclick_payments_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_motoclick_payments_set_updated_at on public.motoclick_payments;
create trigger tr_motoclick_payments_set_updated_at
  before update on public.motoclick_payments
  for each row
  execute function public.motoclick_payments_set_updated_at();
