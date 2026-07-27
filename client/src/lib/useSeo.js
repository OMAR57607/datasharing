import { useEffect } from 'react'
import { SITE_URL } from './config.js'

const BRAND = 'Nitro Garage'
const DEFAULT_TITLE = `${BRAND} | Accesorios Off-Road y 4x4 para Pickups`
const DEFAULT_DESCRIPTION =
  'Accesorios off-road y 4x4 para pickups y camionetas: roll bars, racks de batea, bumpers, tumbaburros, tapas y casetas, estribos, tool box y bedliners. Busca por marca, modelo y año. Envíos a todo México.'
const DEFAULT_ROBOTS = 'index, follow, max-image-preview:large'

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

const absUrl = (src) => {
  if (!src) return `${SITE_URL}/logo.jpg`
  return src.startsWith('http') ? src : SITE_URL + src
}

// Las previews de Vercel sirven el sitio entero en otro dominio. Si se indexan,
// Google ve contenido duplicado y reparte la autoridad entre las dos. Se marcan
// noindex por host, sin tocar producción ni el desarrollo local.
function isPreviewHost() {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host.endsWith('.vercel.app') && `https://${host}` !== SITE_URL
}

/**
 * Actualiza el <head> por página (SPA): título, descripción, canonical,
 * Open Graph, Twitter, robots y, opcionalmente, datos estructurados (JSON-LD).
 *
 * Todas las páginas públicas deben llamarlo: en una SPA el <head> es uno solo y
 * sobrevive a la navegación, así que una página que no lo llama se queda con
 * los metadatos de la anterior.
 *
 * @param {string}  [title]       Título de la página (se le agrega la marca).
 * @param {string}  [description] Descripción; si falta, vuelve a la general.
 * @param {string}  [image]       Imagen para compartir (relativa o absoluta).
 * @param {object}  [jsonLd]      Datos estructurados de esta página.
 * @param {string}  [robots]      Ej. 'noindex, nofollow' para el panel admin.
 */
export function useSeo({ title, description, image, jsonLd, robots } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${BRAND}` : DEFAULT_TITLE
    // El canonical apunta siempre al dominio real, no al host que se esté
    // sirviendo (preview, *.vercel.app, localhost).
    const url = SITE_URL + window.location.pathname
    const desc = description || DEFAULT_DESCRIPTION
    const img = absUrl(image)

    document.title = fullTitle
    upsertMeta('name', 'description', desc)
    upsertMeta('name', 'robots', isPreviewHost() ? 'noindex, nofollow' : robots || DEFAULT_ROBOTS)
    upsertLink('canonical', url)

    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', desc)
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:image', img)

    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', desc)
    upsertMeta('name', 'twitter:image', img)

    // Datos estructurados específicos de la página (se limpian al salir).
    const ID = 'page-jsonld'
    let script = document.getElementById(ID)
    if (jsonLd) {
      if (!script) {
        script = document.createElement('script')
        script.type = 'application/ld+json'
        script.id = ID
        document.head.appendChild(script)
      }
      script.textContent = JSON.stringify(jsonLd)
    } else if (script) {
      script.remove()
    }

    return () => {
      const s = document.getElementById(ID)
      if (s) s.remove()
    }
  }, [title, description, image, jsonLd, robots])
}
