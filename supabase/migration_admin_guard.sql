-- ============================================================
-- Migración: blindaje del panel de administración
-- Ejecutar en Supabase → SQL Editor, de arriba hacia abajo, UNA SOLA VEZ.
--
-- QUÉ ARREGLA
--   Las políticas originales daban permiso total a `authenticated`, es decir a
--   CUALQUIER usuario logueado. Si el registro público quedaba abierto (o se
--   reactivaba por error), cualquiera podía crearse una cuenta y quedar con
--   permiso de admin: editar precios, borrar productos y leer las cotizaciones
--   con los datos personales de los clientes.
--
--   A partir de acá "admin" deja de ser "estar logueado" y pasa a ser una fila
--   en public.admins. Aunque se abra el registro público, un usuario nuevo no
--   ve ni toca nada.
--
-- ⚠️ IMPORTANTE: el PASO 2 carga tu usuario en la lista de admins. Si saltás
--    ese paso y corrés el 3, te quedás afuera de tu propio panel.
-- ============================================================


-- ------------------------------------------------------------
-- PASO 1 — Lista de administradores
-- ------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  note       text,
  created_at timestamptz not null default now()
);

-- RLS activo y SIN políticas: nadie puede leer ni escribir esta tabla desde el
-- cliente (ni siquiera un admin). Solo se administra desde el SQL Editor.
alter table public.admins enable row level security;

-- Devuelve true si el usuario de la sesión actual está en la lista.
-- SECURITY DEFINER para que pueda leer public.admins pese al RLS de arriba.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;


-- ------------------------------------------------------------
-- PASO 2 — Cargá TU usuario como admin  ⚠️ ANTES DE SEGUIR
--   Cambiá el email por el de tu usuario de Supabase → Authentication → Users.
-- ------------------------------------------------------------
insert into public.admins (user_id, email, note)
select id, email, 'admin principal'
  from auth.users
 where lower(email) = lower('TU-EMAIL-ADMIN@dominio.com')   -- 👈 CAMBIAR
on conflict (user_id) do nothing;

-- Verificación: tiene que devolver exactamente tu usuario. Si sale vacío,
-- el email no coincide con ninguno de auth.users: corregilo y volvé a correr
-- el insert. NO sigas al paso 3 con esto vacío.
select a.user_id, a.email, a.created_at
  from public.admins a;


-- ------------------------------------------------------------
-- PASO 3 — Cerrar las políticas (solo admins escriben)
--   La lectura pública del catálogo NO se toca: `public_read_active` sigue
--   aparte y las políticas permisivas se suman (OR), así que la tienda y el
--   panel siguen funcionando igual.
-- ------------------------------------------------------------

-- Nota: is_admin() va envuelta en (select ...) a propósito. Así Postgres la
-- evalúa UNA vez por consulta en vez de una vez por fila — es la diferencia
-- entre que el listado de productos vuele o se arrastre.

-- Productos ---------------------------------------------------
drop policy if exists "auth_all_products"  on public.products;
drop policy if exists "admin_all_products" on public.products;
create policy "admin_all_products" on public.products
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Historial de precios ---------------------------------------
drop policy if exists "auth_all_prices"  on public.price_history;
drop policy if exists "admin_all_prices" on public.price_history;
create policy "admin_all_prices" on public.price_history
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Cotizaciones ------------------------------------------------
-- El público sigue pudiendo CREARLAS (captura de lead), pero solo el admin
-- las lee, edita y borra. Antes no había policy de delete: se agrega acá.
drop policy if exists "auth_read_quotes"    on public.quotes;
drop policy if exists "auth_manage_quotes"  on public.quotes;
drop policy if exists "admin_manage_quotes" on public.quotes;
create policy "admin_manage_quotes" on public.quotes
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- La de insert público se recrea igual, para dejarla explícita.
drop policy if exists "public_insert_quotes" on public.quotes;
create policy "public_insert_quotes" on public.quotes
  for insert to anon, authenticated
  with check (true);


-- ------------------------------------------------------------
-- PASO 4 — Anti-spam en el formulario de cotización
--   La tabla es escribible por anónimos: sin límites, un bot puede llenarla
--   con basura o payloads enormes. Estos CHECK acotan el daño.
--   (No rompen nada: los valores reales del formulario entran holgados.)
--
--   Van como NOT VALID: se aplican a todo lo que entre de ahora en adelante,
--   pero no revisan las filas que ya están. Si la tabla tuviera una cotización
--   vieja fuera de rango, un CHECK normal haría fallar toda la migración.
-- ------------------------------------------------------------
alter table public.quotes drop constraint if exists quotes_sane_input;
alter table public.quotes add  constraint quotes_sane_input check (
      length(customer_name)          between 1 and 120
  and length(phone)                  between 1 and 40
  and length(coalesce(email,   ''))  <= 160
  and length(coalesce(vehicle, ''))  <= 160
  and length(coalesce(notes,   ''))  <= 2000
  and jsonb_array_length(items)      <= 100
  and total >= 0
) not valid;

-- El estado solo puede ser uno de los tres que maneja el panel.
alter table public.quotes drop constraint if exists quotes_status_valid;
alter table public.quotes add  constraint quotes_status_valid
  check (status in ('nuevo', 'atendido', 'cerrado')) not valid;

-- Opcional: una vez que revisaste que los datos viejos cumplen, podés
-- validarlos para que Postgres los dé por buenos también hacia atrás.
--   alter table public.quotes validate constraint quotes_sane_input;
--   alter table public.quotes validate constraint quotes_status_valid;


-- ------------------------------------------------------------
-- PASO 5 — Verificación final
--   Revisá que la columna `condicion` diga is_admin() en todo lo de escritura.
-- ------------------------------------------------------------
select tablename,
       policyname,
       cmd,
       roles,
       coalesce(qual, with_check) as condicion
  from pg_policies
 where schemaname = 'public'
   and tablename in ('products', 'price_history', 'quotes', 'admins')
 order by tablename, policyname;

-- Prueba rápida: logueado como admin desde el panel tiene que devolver true.
-- (Acá en el SQL Editor devuelve false o null: no hay sesión de usuario.)
-- select public.is_admin();


-- ============================================================
-- CÓMO AGREGAR O QUITAR UN ADMIN MÁS ADELANTE
--
--   -- alta (el usuario tiene que existir ya en Authentication → Users)
--   insert into public.admins (user_id, email, note)
--   select id, email, 'segundo admin' from auth.users
--    where lower(email) = lower('otro@dominio.com')
--   on conflict (user_id) do nothing;
--
--   -- baja (queda sin permisos al instante, no hace falta tocar políticas)
--   delete from public.admins where lower(email) = lower('otro@dominio.com');
-- ============================================================
