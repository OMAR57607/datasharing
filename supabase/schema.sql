-- ============================================================
-- Nitro Garage — Esquema de base de datos (Supabase / Postgres)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ---------- Tablas ----------
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  sku           text unique,
  name          text not null,
  description   text,
  category      text,
  brand         text,
  image_url     text,               -- URL de Cloudinary (portada = images[0])
  images        jsonb not null default '[]'::jsonb, -- galería, hasta 4 fotos
  current_price numeric(12,2),
  compatible_vehicles text,         -- ej. "Toyota Hilux, Ford Ranger"
  vehicle_make  text,               -- marca de vehículo para el filtro (override del auto)
  year_from     smallint,
  year_to       smallint,
  dimensions    text,               -- medidas, ej. "120 x 90 x 15 cm"
  material      text,
  specs         text,               -- notas técnicas adicionales
  active        boolean not null default true,
  views         integer not null default 0,      -- "solicitudes" para ordenar
  featured      boolean not null default false,  -- destacado manual (pin)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.price_history (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  price      numeric(12,2) not null,
  currency   text not null default 'USD',
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_views on public.products(views desc);
create index if not exists idx_price_history_product on public.price_history(product_id);

-- ---------- RPC: contar vistas desde el público (anon) ----------
create or replace function public.increment_product_views(p_id uuid)
returns void
language sql security definer
set search_path = public as $$
  update public.products set views = views + 1 where id = p_id and active = true;
$$;

grant execute on function public.increment_product_views(uuid) to anon, authenticated;

-- ---------- Trigger updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------- RPC: cargar precio (historial + precio actual, atómico) ----------
create or replace function public.set_price(
  p_product_id uuid,
  p_price      numeric,
  p_currency   text default 'USD',
  p_note       text default null
) returns public.products
language plpgsql security invoker as $$
declare
  result public.products;
begin
  insert into public.price_history (product_id, price, currency, note)
    values (p_product_id, p_price, coalesce(p_currency, 'USD'), p_note);
  update public.products
    set current_price = p_price
    where id = p_product_id
    returning * into result;
  return result;
end $$;

-- ============================================================
-- Row Level Security
--   • Lectura pública: solo productos activos.
--   • Escritura / lectura total: solo usuarios autenticados (admin).
--   Recordá DESACTIVAR el registro público en Supabase → Auth → Providers
--   para que "authenticated" equivalga a "admin".
-- ============================================================
alter table public.products enable row level security;
alter table public.price_history enable row level security;

drop policy if exists "public_read_active" on public.products;
create policy "public_read_active" on public.products
  for select using (active = true);

drop policy if exists "auth_all_products" on public.products;
create policy "auth_all_products" on public.products
  for all to authenticated using (true) with check (true);

drop policy if exists "auth_all_prices" on public.price_history;
create policy "auth_all_prices" on public.price_history
  for all to authenticated using (true) with check (true);
