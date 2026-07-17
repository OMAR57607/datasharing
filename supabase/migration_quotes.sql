-- ============================================================
-- Migración: cotizaciones (leads guardados desde la tienda)
-- Ejecutar en Supabase → SQL Editor (una sola vez)
-- ============================================================

create table if not exists public.quotes (
  id            uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone         text not null,
  email         text,
  vehicle       text,
  notes         text,
  items         jsonb not null default '[]',   -- [{id,name,sku,qty,price}]
  total         numeric(12,2) not null default 0,
  status        text not null default 'nuevo', -- nuevo | atendido | cerrado
  created_at    timestamptz not null default now()
);

create index if not exists idx_quotes_created on public.quotes (created_at desc);

alter table public.quotes enable row level security;

-- El público puede crear cotizaciones (captura de lead)...
drop policy if exists "public_insert_quotes" on public.quotes;
create policy "public_insert_quotes" on public.quotes
  for insert to anon, authenticated with check (true);

-- ...pero solo el admin (autenticado) puede verlas y gestionarlas.
drop policy if exists "auth_read_quotes" on public.quotes;
create policy "auth_read_quotes" on public.quotes
  for select to authenticated using (true);

drop policy if exists "auth_manage_quotes" on public.quotes;
create policy "auth_manage_quotes" on public.quotes
  for update to authenticated using (true) with check (true);
