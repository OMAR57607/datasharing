// Datos de contacto de la tienda.
// Formato wa.me: código de país + número, sin '+', espacios ni guiones.
// +52 238 290 0385  →  52 2382900385
export const WHATSAPP = '522382900385'
export const WHATSAPP_DISPLAY = '+52 238 290 0385'
export const STORE_NAME = 'Nitro Garage'
export const STORE_EMAIL = 'contacto@nitrogarage.com'

// Dominio canónico del sitio, sin barra final. Es el que se publica en los
// buscadores: de acá salen el <link rel="canonical"> y las og:url, así que
// una preview de Vercel no compite con producción por el mismo contenido.
// Se puede pisar con VITE_SITE_URL si el dominio cambia.
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || 'https://nitrogarage.mekanotek.com'
).replace(/\/+$/, '')
