-- ============================================================
-- Migración: catálogo inteligente (vistas + destacados)
-- Ejecutar en Supabase → SQL Editor (una sola vez, sobre el esquema ya creado)
-- ============================================================

-- Contador de "solicitudes" (vistas) y bandera de destacado manual.
alter table public.products add column if not exists views    integer not null default 0;
alter table public.products add column if not exists featured boolean not null default false;

create index if not exists idx_products_views on public.products (views desc);

-- Incremento de vistas desde el público (anon). SECURITY DEFINER para que
-- pueda actualizar el contador sin abrir una política de escritura general.
create or replace function public.increment_product_views(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.products set views = views + 1 where id = p_id and active = true;
$$;

grant execute on function public.increment_product_views(uuid) to anon, authenticated;
