# Nitro Garage 🔧🔥

Tienda web de **accesorios automotrices** con panel de administración, importación de productos desde PDF y carga de precios.

- **Frontend:** React + Vite (`client/`)
- **Backend:** Node/Express + SQLite (`server/`)

## Módulos

| Módulo | Descripción |
| --- | --- |
| **Tienda pública** | Landing de marca, catálogo con filtros y detalle de producto. |
| **Panel admin** | Login con JWT, dashboard, CRUD de productos. |
| **Importador de PDF** | Sube un catálogo en PDF y extrae los productos (sin precio) para revisarlos e importarlos. |
| **Carga de precios** | Precio individual por producto o carga masiva por SKU, con historial de precios. |

## Requisitos

- Node.js 18 o superior

## Instalación

Desde la raíz del proyecto (usa workspaces de npm, instala cliente y servidor):

```bash
npm install
```

## Puesta en marcha

1. **Crear el usuario admin y datos de ejemplo** (una sola vez):

   ```bash
   npm run seed
   ```

   Usuario por defecto: `admin` / `admin123` (cambialo con las variables
   `ADMIN_USER` y `ADMIN_PASS`).

2. **Arrancar backend + frontend juntos:**

   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:5173
   - API: http://localhost:4000
   - Panel admin: http://localhost:5173/admin

## Producción

```bash
npm run build      # genera client/dist
npm start          # arranca la API (sirve la lógica de negocio)
```

En producción, definí las variables de entorno:

- `JWT_SECRET` — secreto para firmar los tokens.
- `PORT` — puerto de la API (por defecto 4000).
- `ADMIN_USER` / `ADMIN_PASS` — credenciales del admin al hacer seed.

## Estructura

```
.
├── client/                 # Frontend React + Vite
│   ├── index.html          # Meta tags, SEO, Open Graph, JSON-LD
│   ├── public/logo.jpg     # Logo de la marca (favicon + og:image)
│   └── src/
│       ├── api.js          # Cliente HTTP
│       ├── context/        # Autenticación
│       ├── components/     # Layout, tarjetas, rutas protegidas
│       └── pages/          # Tienda pública + panel admin
└── server/                 # Backend Express + SQLite
    └── src/
        ├── index.js        # Servidor y rutas
        ├── db.js           # Esquema SQLite
        ├── routes/         # auth, products, prices, import
        └── services/pdf.js # Extracción de productos de PDF
```

## API (resumen)

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | — | Login, devuelve token JWT |
| GET | `/api/products` | — | Lista de productos (filtros: `category`, `search`) |
| GET | `/api/products/:id` | — | Detalle de producto |
| POST | `/api/products` | ✔ | Crear producto |
| PUT | `/api/products/:id` | ✔ | Editar producto |
| DELETE | `/api/products/:id` | ✔ | Eliminar producto |
| POST | `/api/products/:id/price` | ✔ | Cargar/actualizar precio |
| GET | `/api/products/:id/prices` | ✔ | Historial de precios |
| POST | `/api/prices/bulk` | ✔ | Carga masiva de precios por SKU |
| POST | `/api/import/pdf` | ✔ | Analizar PDF y extraer productos |
| POST | `/api/import/confirm` | ✔ | Guardar productos importados |
