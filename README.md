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
                                │  · PDF/imgs → ──────┼──▶ Cloudinary
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
| **Importador de PDF** | Extrae productos del PDF (texto) y sube cada página como imagen a Cloudinary para asignarla. |
| **Precios** | Carga individual o masiva por SKU, con historial (RPC `set_price`). |
| **Imágenes** | Subida manual por producto a Cloudinary o asignación de páginas del catálogo. |
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
│       ├── api.js           # CRUD (Supabase) + PDF/imágenes (Functions)
│       ├── context/         # Supabase Auth
│       ├── components/      # layout, tarjetas, ruta protegida
│       └── pages/           # tienda pública + panel admin
├── api/                    # Vercel Serverless Functions
│   ├── import.js            # PDF → productos + páginas a Cloudinary
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
2. La pantalla cruza cada imagen con el producto cuyo `sku` coincide con el
   nombre del archivo. La comparación ignora mayúsculas y separadores
   (`acc 001` = `ACC-001`) y reconoce las fotos extra de un mismo producto
   (`ACC-001-2.jpg`) y el sufijo que agrega Cloudinary si el nombre se repite.
3. Elegís qué hacer: sumar las fotos a la galería o reemplazar la actual, y si
   los códigos que **no** existen se dan de alta como productos nuevos (con ese
   código como SKU y nombre, inactivos salvo que marques lo contrario).
4. Revisás la tabla, desmarcás lo que no quieras y tocás **Aplicar**.

Cada producto guarda hasta 4 fotos (`images`); la primera es la portada
(`image_url`). No hacen falta variables de entorno nuevas: se usan las
credenciales de Cloudinary que ya están configuradas.

## Nota sobre las imágenes del catálogo
Los catálogos gráficos tienen **cada página como una sola imagen compuesta**
(varios productos dibujados dentro), por lo que **no** es posible recortar de
forma fiable la imagen de cada producto por separado. Por eso el flujo sube el
PDF a Cloudinary —que genera una imagen por página— y el admin **asigna la
página** a cada producto, o sube una imagen propia. Los precios se cargan aparte.
