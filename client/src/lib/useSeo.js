import { useEffect } from 'react'

const BRAND = 'Nitro Garage'
const DEFAULT_TITLE = `${BRAND} | Accesorios Off-Road y 4x4 para Pickups`

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
  if (!src) return `${window.location.origin}/logo.jpg`
  return src.startsWith('http') ? src : window.location.origin + src
}

// Actualiza el <head> por página (SPA): título, descripción, canonical,
// Open Graph, Twitter y, opcionalmente, datos estructurados (JSON-LD).
export function useSeo({ title, description, image, jsonLd } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${BRAND}` : DEFAULT_TITLE
    const url = window.location.origin + window.location.pathname
    const img = absUrl(image)

    document.title = fullTitle
    if (description) upsertMeta('name', 'description', description)
    upsertLink('canonical', url)

    upsertMeta('property', 'og:title', fullTitle)
    if (description) upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:image', img)

    upsertMeta('name', 'twitter:title', fullTitle)
    if (description) upsertMeta('name', 'twitter:description', description)
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
  }, [title, description, image, jsonLd])
}
