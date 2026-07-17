-- ============================================================
-- Migración: ficha técnica del producto (vehículos, años, medidas, material)
-- Ejecutar en Supabase → SQL Editor (una sola vez, sobre el esquema ya creado)
-- ============================================================

alter table public.products add column if not exists compatible_vehicles text; -- ej. "Toyota Hilux, Ford Ranger"
alter table public.products add column if not exists year_from  smallint;
alter table public.products add column if not exists year_to    smallint;
alter table public.products add column if not exists dimensions text; -- medidas, ej. "120 x 90 x 15 cm"
alter table public.products add column if not exists material   text;
alter table public.products add column if not exists specs      text; -- notas técnicas adicionales
