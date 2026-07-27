# Nitro Garage 🔧🔥

Tienda web de **accesorios automotrices** con panel de administración,
carga masiva de fotos desde Cloudinary y gestión de precios.

**Stack:** React + Vite · **Supabase** (Postgres + Auth) · **Cloudinary**
(imágenes) · **Vercel** (deploy, con Serverless Functions) · **pnpm**.

## Arquitectura

```
┌──────────────┐   supabase-js (RLS)   ┌─────────────────┐
│  Cliente     │──────────────────────▶│  Supabase       │
│  React+Vite  │   auth + CRUD         │  Postgres+Auth  │
│  (Vercel)    │                       └─────────────────┘
│              │   /api/upload  ┌─────────────┴───────┐
│              │───────────────▶│ Vercel Functions    │
└──────────────┘                │  · sube fotos       │
                                │  · lee la carpeta ──┼──▶ Cloudinary
                                └─────────────────────┘
```

- El **cliente habla directo con Supabase** (protegido por Row Level Security).
- Las **Vercel Functions** son mínimas: suben fotos y leen el Media Library
  (lo único que necesita los secretos de Cloudinary).

## Módulos

| Módulo | Descripción |
| --- | --- |
| **Tienda pública** | Landing de marca, catálogo con filtros y detalle de producto. |
| **Panel admin** | Login con Supabase Auth, dashboard, CRUD de productos. |
| **Precios** | Carga individual o masiva por SKU, con historial (RPC `set_price`). |
| **Imágenes** | Subida manual por producto a Cloudinary, hasta 4 fotos por SKU. |
| **Fotos desde Cloudinary** | Lee una carpeta del Media Library y asigna cada imagen al producto cuyo SKU es el nombre del archivo (o lo crea). |

## Puesta en marcha

### 1. Requisitos
- Node.js 18+ y **pnpm** (`corepack enable` o `npm i -g pnpm`).
- Una cuenta de **Supabase** y una de **Cloudinary**.

### 2. Base de datos (Supabase)
1. Creá un proyecto en Supabase.
2. En **SQL Editor**, ejecutá el contenido de [`supabase/schema.sql`](supabase/schema.sql).
3. En **Authentication → Providers**, dejá Email activo y **desactivá el registro
   público** ("Allow new users to sign up") para que solo el admin pueda entrar.
4. Creá el usuario admin en **Authentication → Users → Add user** (email + contraseña).

### 3. Cloudinary
- Tomá `cloud name`, `api key` y `api secret` del dashboard.
- Subí las fotos a una carpeta (por defecto `nitro-garage/productos`) usando el
  SKU como nombre de archivo.

### 4. Variables de entorno
Copiá los ejemplos y completá:

```bash
cp .env.example .env                 # credenciales del servidor (Functions)
cp client/.env.example client/.env.local   # credenciales públicas del cliente
```

| Variable | Dónde | Qué es |
| --- | --- | --- |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | cliente | URL y anon key de Supabase |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | funciones | idem (para validar el token) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | funciones | credenciales de Cloudinary |

### 5. Desarrollo local
```bash
pnpm install

# Opción A — todo junto (frontend + funciones), requiere Vercel CLI:
pnpm dev            # = vercel dev

# Opción B — solo frontend (sin funciones /api):
pnpm dev:client
```

## Despliegue en Vercel
1. Importá el repo en Vercel. Detecta `vercel.json` automáticamente.
2. Cargá **todas** las variables de entorno (cliente + servidor) en
   **Settings → Environment Variables**.
3. Deploy. La build corre `pnpm --filter nitro-garage-client build` y publica
   `client/dist`; las funciones de `api/` se despliegan como Serverless Functions.

> **Si tocás las dependencias, regenerá el lockfile.** Vercel instala con
> `pnpm install --frozen-lockfile`: si `package.json` y `pnpm-lock.yaml` no
> coinciden, el deploy corta con `ERR_PNPM_OUTDATED_LOCKFILE` y el sitio se
> queda sirviendo la build anterior (sin avisar en la web). Después de agregar
> o quitar un paquete, corré `pnpm install --lockfile-only` y commiteá el
> lockfile. El CI verifica exactamente esto.

## Integración continua

`.github/workflows/ci.yml` corre en cada push a `master` y en cada pull request,
reproduciendo lo que hace Vercel para que un error de build no aparezca recién
en producción:

| Paso | Qué cubre |
| --- | --- |
| `pnpm install --frozen-lockfile` | Que el lockfile esté al día con `package.json`. |
| `node --check` sobre `api/**/*.js` | Sintaxis de las Functions, que no pasan por el bundler. |
| `pnpm --filter nitro-garage-client build` | Que el cliente compile (imports rotos, JSX inválido). |

No hay suite de tests: el proyecto no tiene runner configurado, así que el CI
verifica que todo instale y compile, no el comportamiento.

## Estructura

```
.
├── client/                 # Frontend React + Vite
│   └── src/
│       ├── lib/supabase.js  # cliente supabase-js
│       ├── lib/photos.js    # descarta las fotos viejas del catálogo PDF
│       ├── api.js           # CRUD (Supabase) + fotos (Functions)
│       ├── context/         # Supabase Auth
│       ├── components/      # layout, tarjetas, esqueletos, selector de portada
│       └── pages/           # tienda pública + panel admin
├── api/                    # Vercel Serverless Functions
│   ├── upload.js            # imagen de producto → Cloudinary
│   ├── cloudinary-photos.js # lista una carpeta del Media Library
│   └── _lib/                # cloudinary, multipart, auth
├── supabase/               # schema.sql + migraciones (SQL Editor)
├── .github/workflows/ci.yml # instala y compila en cada PR
├── vercel.json             # build + rutas + funciones
└── pnpm-workspace.yaml
```

## Panel de administración

| Sección | Para qué |
| --- | --- |
| **Dashboard** | Totales: productos, con y sin precio, sin foto, categorías. |
| **Productos** | ABM completo, con filtros por sin precio / sin foto / inactivos y carga rápida de precio. |
| **Fotos de Cloudinary** | Carga masiva de fotos por SKU y limpieza del catálogo viejo. |
| **Carga de precios** | Pegar `SKU precio` en lote. |
| **Armar cotización** / **Cotizaciones** | Armado asistido y seguimiento de los pedidos. |

Se quitaron dos secciones que quedaron sin función cuando las fotos pasaron a
salir de Cloudinary: *Importar PDF* (los productos del catálogo viejo no
servían) y *Asignar fotos* (la carga por producto ya está dentro de la ficha, y
la masiva en Fotos de Cloudinary).

## Cargar fotos que ya están en Cloudinary

Si subiste las fotos a una carpeta del **Media Library** poniéndole a cada
archivo el **código del producto** (por ejemplo `ACC-001.jpg`), no hace falta
volver a subirlas una por una: entrá a **Admin → Fotos de Cloudinary**.

1. Escribí la carpeta (por defecto `nitro-garage/productos`) y tocá **Leer carpeta**.
2. La pantalla toma **el nombre del archivo como el SKU** (es la fuente de la
   verdad) y busca ese producto. Si no encuentra el SKU idéntico, lo busca
   ignorando mayúsculas y separadores: ahí el producto es el mismo pero está
   mal escrito en la base, así que **le corrige el SKU** (`acc 001` → `ACC-001`).
3. Elegís qué hacer: sumar las fotos a la galería o reemplazar la actual, y si
   los códigos que **no** existen se dan de alta como productos nuevos (con ese
   código como SKU y nombre, inactivos salvo que marques lo contrario).
4. Revisás la tabla, desmarcás lo que no quieras y tocás **Aplicar**.

### Varias fotos del mismo producto

Numerá los archivos con un punto: `STEP2`, `STEP2.2`, `STEP2.3` van todos al SKU
`STEP2`, en ese orden, y el que no tiene número (o el `.1`) queda de portada.
Cada producto guarda hasta 4 fotos (`images`); la primera es la portada
(`image_url`).

### El sufijo que agrega Cloudinary

Cloudinary le suma un sufijo aleatorio de 6 caracteres en minúscula a los
archivos que subís: `XBARRAV4_pbgioe` es el SKU `XBARRAV4`, y `STEP2.2_huvrdu`
es la foto 2 de `STEP2`. Se ignora por defecto, tanto para encontrar el producto
como para darlo de alta. Un SKU que de verdad termine parecido (`KIT_ABC123`) no
se toca, porque el sufijo real siempre viene en minúscula.

No hacen falta variables de entorno nuevas: se usan las credenciales de
Cloudinary que ya están configuradas.

### Elegir la portada de un producto

La portada es la primera foto de `images` (y se copia en `image_url` por
compatibilidad). Se puede cambiar de dos formas:

- **Productos** → la miniatura de los que tienen más de una foto muestra el
  contador y abre un selector: tocás la que quieras y pasa a ser la portada.
- **Ficha del producto** → botón *Portada* sobre cada foto de la galería.

En la carga masiva la portada sale de la numeración del archivo (`STEP2` o
`STEP2.1` antes que `STEP2.2`), así que el selector sirve para corregir casos
puntuales sin volver a subir nada.

## Dar de baja lo que quedó del catálogo viejo

Si la carpeta de Cloudinary es el catálogo curado, todo producto cuyo SKU no
aparezca ahí quedó de la importación del PDF. Al final de **Fotos de Cloudinary**
se listan esos productos, marcando cuáles están activos y cuáles tienen precio
cargado, con un checkbox por fila para salvar los que quieras conservar.

| Acción | Qué hace |
| --- | --- |
| **Desactivar** | `active = false`: dejan de verse en la tienda, siguen en el panel y se pueden reactivar. |
| **Borrar** | Definitivo. Se lleva el historial de precios (`price_history` tiene `on delete cascade`). |

Las cotizaciones ya emitidas no se ven afectadas en ningún caso: `quotes.items`
guarda su propia copia de cada ítem, sin clave foránea a `products`.

Conviene hacerlo al final: primero **Aplicar** las fotos (así los SKU de la
carpeta que faltaban quedan creados) y después la baja.

## Las fotos viejas del catálogo en PDF

Antes cada página del PDF se subía como imagen y el admin le asignaba una página
a cada producto. Eso quedó sin efecto: **las fotos salen del Media Library**, con
el SKU como nombre de archivo.

- Las páginas del catálogo (`/productos/pagXX_YYY.jpg` y la carpeta
  `nitro-garage/catalogos` de Cloudinary) **no se muestran** aunque sigan
  guardadas en un producto: `client/src/lib/photos.js` las descarta al leer.
- Para sacarlas de la base hay un botón al final de **Fotos de Cloudinary**.
  Conviene usarlo *después* de aplicar las fotos nuevas: el producto que no tenga
  otra foto queda sin foto.
- Se eliminaron los archivos del repo (`client/public/productos/`), el selector
  de páginas, el importador de PDF y el propio catálogo en PDF (23 MB). Todo eso
  sigue en el historial de git si alguna vez hiciera falta.

## API (Vercel Functions)

Las dos requieren sesión de admin: mandan `Authorization: Bearer <token>` de
Supabase y la Function lo valida con `api/_lib/auth.js`. Son las únicas
operaciones que necesitan los secretos de Cloudinary.

| Endpoint | Método | Cuerpo / parámetros | Devuelve |
| --- | --- | --- | --- |
| `/api/upload` | POST | `multipart/form-data` con el archivo, o JSON `{ url }` | `{ url, publicId }` |
| `/api/cloudinary-photos` | GET | `?folder=nitro-garage/productos` | `{ folder, source, count, photos[] }` |

`cloudinary-photos` valida el nombre de carpeta y prueba tres formas de
consultarla (Search API por `folder`, por `asset_folder`, y Admin API por
prefijo), porque Cloudinary tiene dos modos de carpeta según la cuenta. Cada
foto viene como `{ publicId, name, url, format, bytes, width, height }`, donde
`name` es el nombre del archivo: el SKU.

## Datos

Todo el CRUD lo hace el cliente contra Supabase, protegido por Row Level
Security: lectura pública solo de `active = true`, escritura solo autenticado.

| Tabla | Para qué |
| --- | --- |
| `products` | Catálogo. `images` (jsonb) es la galería de hasta 4 fotos; `image_url` es la portada. `sku` es único. |
| `price_history` | Historial de precios. `on delete cascade`: borrar un producto borra su historial. |
| `quotes` | Cotizaciones. `items` (jsonb) guarda una copia de cada ítem, **sin** clave foránea a `products`: por eso borrar productos no afecta las cotizaciones ya emitidas. |

RPC: `set_price` (precio + historial, atómico) e `increment_product_views`
(cuenta solicitudes desde el público, con `security definer`).

Las migraciones están en `supabase/`, para correr una sola vez en el SQL Editor
sobre el esquema ya creado.
