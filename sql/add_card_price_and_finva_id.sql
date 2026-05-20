-- Añade columnas a `motorcycles` para:
--   1) `card_price`: precio cobrado al pagar con tarjeta de crédito/débito
--      (precio de contado + comisión Mercado Pago). NULL → fallback a price.
--   2) `finva_motorcycle_id`: id numérico de la moto registrada en la DB de Finva.
--      Necesario para mapear `id_motorcycle` en /add_solicitud y para que el
--      portal Finva agrupe solicitudes correctamente.

alter table public.motorcycles
  add column if not exists card_price numeric,
  add column if not exists finva_motorcycle_id bigint;

comment on column public.motorcycles.card_price is
  'Precio cobrado al pagar con tarjeta (precio de contado + comisión Mercado Pago). NULL = usar price.';
comment on column public.motorcycles.finva_motorcycle_id is
  'ID numérico de la moto en la base de datos de Finva (id_motorcycle).';

create index if not exists idx_motorcycles_finva_motorcycle_id
  on public.motorcycles (finva_motorcycle_id);
