# Mi App React

Aplicación web construida con **React + Vite**.

## Requisitos

- Node.js 18 o superior

## Instalación

```bash
npm install
```

## Desarrollo

Arranca el servidor de desarrollo con recarga en caliente:

```bash
npm run dev
```

La app estará disponible en `http://localhost:5173`.

## Producción

Genera la versión optimizada en la carpeta `dist/`:

```bash
npm run build
```

Y para previsualizar el build de producción localmente:

```bash
npm run preview
```

## Estructura

```
.
├── index.html          # Punto de entrada HTML
├── vite.config.js      # Configuración de Vite
├── public/             # Archivos estáticos
└── src/
    ├── main.jsx        # Punto de montaje de React
    ├── App.jsx         # Componente principal
    ├── App.css         # Estilos del componente
    └── index.css       # Estilos globales
```
