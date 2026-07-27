// ============================================================
// Genera dist/sitemap.xml con las páginas fijas + una entrada por producto
// activo. Corre después de `vite build` (ver "build" en client/package.json).
//
// Por qué: el sitemap estático solo listaba 3 URLs, así que las fichas de
// producto —que son las que pueden posicionar por modelo y accesorio— no se le
// declaraban a ningún buscador. Al ser una SPA tampoco hay enlaces en el HTML
// inicial para que las descubra solo.
//
// Nunca corta el build: si faltan credenciales o Supabase no responde, escribe
// igual el sitemap con las páginas fijas y avisa por consola.
// ============================================================
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/sitemap.xml')

const SITE_URL = (process.env.VITE_SITE_URL || 'https://nitrogarage.mekanotek.com').replace(
  /\/+$/,
  ''
)
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(
  /\/+$/,
  ''
)
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

// Páginas fijas. /cotizacion queda afuera a propósito: es el carrito, para un
// buscador se ve siempre vacío (va con noindex desde el cliente).
const STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/catalogo', changefreq: 'daily', priority: '0.9' },
]

const esc = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => `&${{ '<': 'lt', '>': 'gt', '&': 'amp', "'": 'apos', '"': 'quot' }[c]};`)

async function fetchProducts() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn(
      '[sitemap] Sin VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY: se generan solo las páginas fijas.'
    )
    return []
  }
  // Lectura anónima: la política RLS `public_read_active` ya limita el
  // resultado a los productos publicados.
  const url =
    `${SUPABASE_URL}/rest/v1/products` +
    `?select=id,updated_at&active=eq.true&order=updated_at.desc&limit=5000`

  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`)
  return res.json()
}

function buildXml(products) {
  const today = new Date().toISOString().slice(0, 10)

  const urls = STATIC_ROUTES.map(
    ({ path, changefreq, priority }) => `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  )

  for (const p of products) {
    if (!p?.id) continue
    const lastmod = p.updated_at ? String(p.updated_at).slice(0, 10) : today
    urls.push(`  <url>
    <loc>${SITE_URL}/producto/${esc(p.id)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`)
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`
}

let products = []
try {
  products = await fetchProducts()
} catch (err) {
  console.warn(`[sitemap] No se pudo leer el catálogo (${err.message}). Solo páginas fijas.`)
}

await writeFile(OUT, buildXml(products), 'utf8')
console.log(
  `[sitemap] ${STATIC_ROUTES.length + products.length} URLs escritas en dist/sitemap.xml ` +
    `(${products.length} productos).`
)
