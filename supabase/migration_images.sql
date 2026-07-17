-- ============================================================
-- Migración: galería de hasta 4 fotos por producto
-- Ejecutar en Supabase → SQL Editor (una sola vez, sobre el esquema ya creado)
-- ============================================================

-- Arreglo de URLs de imágenes (la primera es la portada = image_url).
-- Se mantiene image_url por compatibilidad: siempre igual a images[0].
alter table public.products
  add column if not exists images jsonb not null default '[]'::jsonb;

-- Rellena images con la foto actual para los productos que ya tienen una.
update public.products
  set images = jsonb_build_array(image_url)
  where image_url is not null
    and image_url <> ''
    and (images is null or jsonb_array_length(images) = 0);
