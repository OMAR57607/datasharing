-- ============================================================
-- TODAS las columnas nuevas en un solo bloque (correr una vez)
-- Supabase → SQL Editor → pegar esto → RUN
-- Es seguro: solo agrega columnas (IF NOT EXISTS) y no borra nada.
-- ============================================================

-- Ficha técnica
alter table public.products add column if not exists compatible_vehicles text;
alter table public.products add column if not exists vehicle_make text;
alter table public.products add column if not exists year_from smallint;
alter table public.products add column if not exists year_to   smallint;
alter table public.products add column if not exists dimensions text;
alter table public.products add column if not exists material  text;
alter table public.products add column if not exists specs     text;

-- Galería de hasta 4 fotos (image_url sigue siendo la portada = images[0])
alter table public.products add column if not exists images jsonb not null default '[]'::jsonb;

-- Rellena images con la foto actual de los productos que ya tienen una
update public.products
  set images = jsonb_build_array(image_url)
  where image_url is not null
    and image_url <> ''
    and (images is null or jsonb_array_length(images) = 0);
