# Nitro Garage 🔧🔥

Tienda web de **accesorios automotrices** con panel de administración,
importación de productos desde PDF y gestión de precios e imágenes.

**Stack:** React + Vite · **Supabase** (Postgres + Auth) · **Cloudinary**
(imágenes) · **Vercel** (deploy, con Serverless Functions) · **pnpm**.

## Arquitectura

```
┌──────────────┐   supabase-js (RLS)   ┌─────────────────┐
│  Cliente     │──────────────────────▶│  Supabase       │
│  React+Vite  │   auth + CRUD         │  Postgres+Auth  │
│  (Vercel)    │                       └─────────────────┘
│              │   /api/import                ▲
│              │   /api/upload  ┌─────────────┴───────┐
│              │───────────────▶│ Vercel Functions    │
└──────────────┘                │  · PDF → texto      │
                                │  · fotos ───────────┼──▶ Cloudinary
                                └─────────────────────┘
```

- El **cliente habla directo con Supabase** (protegido por Row Level Security).
- Las **Vercel Functions** son mínimas: solo procesan el PDF y suben a
  Cloudinary (operaciones que requieren secretos del servidor).

## Módulos

| Módulo | Descripción |
| --- | --- |
| **Tienda pública** | Landing de marca, catálogo con filtros y detalle de producto. |
| **Panel admin** | Login con Supabase Auth, dashboard, CRUD de productos. |
| **Importador de PDF** | Extrae los productos del PDF (texto): nombre, SKU y categoría, sin precio ni foto. |
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
- (El plan gratuito permite convertir PDF a imágenes por página.)

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

## Estructura

```
.
├── client/                 # Frontend React + Vite
│   └── src/
│       ├── lib/supabase.js  # cliente supabase-js
│       ├── lib/photos.js    # descarta las fotos viejas del catálogo PDF
│       ├── api.js           # CRUD (Supabase) + PDF/fotos (Functions)
│       ├── context/         # Supabase Auth
│       ├── components/      # layout, tarjetas, ruta protegida
│       └── pages/           # tienda pública + panel admin
├── api/                    # Vercel Serverless Functions
│   ├── import.js            # PDF → productos (solo texto)
│   ├── upload.js            # imagen de producto → Cloudinary
│   ├── cloudinary-photos.js # lista una carpeta del Media Library
│   └── _lib/                # pdf, cloudinary, multipart, auth
├── supabase/schema.sql     # tablas + RLS + RPC
├── vercel.json             # build + rutas + funciones
└── pnpm-workspace.yaml
```

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
- Los archivos del repo (`client/public/productos/`) y el selector de páginas se
  eliminaron. El PDF del catálogo sigue en `client/public/catalogos/` porque de
  ahí se extraen los productos por texto.
