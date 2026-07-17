-- ============================================================
-- Migración: marca de vehículo editable (override del filtro del catálogo)
-- Ejecutar en Supabase → SQL Editor (una sola vez, sobre el esquema ya creado)
-- ============================================================

-- Marca de vehículo manual. Si está vacía, el catálogo la detecta sola del
-- nombre del producto (comportamiento actual). Si se carga, manda sobre la
-- detección automática.
alter table public.products add column if not exists vehicle_make text;
