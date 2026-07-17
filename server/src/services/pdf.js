import { createRequire } from 'node:module'

// pdf-parse es CommonJS; lo cargamos con require para evitar su índice de debug.
const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse/lib/pdf-parse.js')

// Token de código de producto: letras seguidas de al menos un dígito
// (RB539M, BOX680R, RACK20L, SYSTEMHILUX, BUMPER8NP300…).
const CODE_RE = /^[A-Z]{2,}[A-Z0-9]*\d[A-Z0-9]*$/
// Prefijos de código "fuertes": se aceptan aunque estén fuera de una tabla.
const STRONG_CODE = /^(RB|BOX|RACK|AM|RV|FT|BUMPER|BRACK|BULL|BAR|EST|BL|TB|LOCK|SYSTEM|CASETA|CANOPY)/i
const TABLE_HEADER = /CLAVE.*MODELO/i
const YEAR_RE = /\b(19|20)\d{2}\b/

// Líneas que casi nunca son productos (encabezados, marketing, países…).
const NOISE = [
  /^m[ée]xico|guatemala|rep[uú]blica|trinidad|barbados/i,
  /^•/,
  /garant[ií]a/i,
  /^nuevo\s+20\d{2}$/i,
  /^accesorios/i,
  /^contenido$/i,
  /^\d{1,4}$/,
  /^modelos?\s*$/i,
  /^modelos recientes$/i,
  /^www\.|@|tel[ée]fono/i,
]

// Categoría inferida a partir del prefijo del código.
const CATEGORY_BY_PREFIX = [
  [/^RB/, 'Roll Bars'],
  [/^RACK/, 'Racks'],
  [/^(BUMPER|BULL|BAR)/, 'Bullbars / Bumpers'],
  [/^BRACK/, 'Brackets'],
  [/^(BOX|TB)/, 'Cajas / Tool Box'],
  [/^(SYSTEM|CASETA|CANOPY)/, 'Tapas / Casetas'],
  [/^LOCK/, 'Cerraduras'],
  [/^(EST|ESC)/, 'Estribos / Escalones'],
  [/^BL/, 'Bedliners'],
]

function categoryFor(code) {
  for (const [re, cat] of CATEGORY_BY_PREFIX) if (re.test(code)) return cat
  return 'Accesorio'
}

function isNoise(l) {
  return NOISE.some((re) => re.test(l))
}

// Extractor genérico simple (fallback para PDFs sin tablas de catálogo).
function extractGeneric(lines) {
  const products = []
  const seen = new Set()
  const SKU_RE = /^([A-Z0-9][A-Z0-9._/-]{2,19})\s+(.*)$/i
  for (const line of lines) {
    if (line.length < 4 || isNoise(line)) continue
    let sku = null
    let name = line
    const m = line.match(SKU_RE)
    if (m && /\d/.test(m[1]) && m[2].length >= 3) {
      sku = m[1].toUpperCase()
      name = m[2].trim()
    }
    if (!/[a-zA-ZáéíóúñÁÉÍÓÚÑ]{3,}/.test(name)) continue
    const key = (sku || '') + '|' + name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    products.push({ sku, name, description: null, category: null })
  }
  return products
}

/**
 * Extrae candidatos de producto del texto de un PDF.
 * Detecta tablas "CLAVE / APLICACIÓN / MODELOS" y códigos de producto.
 * No extrae precios (se cargan aparte). Devuelve candidatos editables.
 */
export function extractProductsFromText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const products = []
  const seen = new Set()
  let inTable = false

  const add = (sku, name, category) => {
    const key = (sku || '') + '|' + name.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    products.push({ sku, name, description: null, category })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (TABLE_HEADER.test(line)) {
      inTable = true
      continue
    }
    if (isNoise(line)) continue

    const first = line.split(/\s+/)[0]
    const looksLikeCode =
      CODE_RE.test(first) && first.length >= 4 && first.length <= 20

    // Código "fuerte" en cualquier parte del documento.
    if (looksLikeCode && STRONG_CODE.test(first)) {
      const rest = line.slice(first.length).trim()
      const next = lines[i + 1] || ''
      let name = rest || first
      if (!rest && YEAR_RE.test(next) && next.length < 60) {
        name = next.replace(/\s+/g, ' ')
      }
      add(first.toUpperCase(), name, categoryFor(first.toUpperCase()))
      continue
    }

    // Dentro de una tabla CLAVE/APLICACIÓN/MODELOS: código + aplicación,
    // seguido normalmente de una línea con el rango de años.
    if (inTable && looksLikeCode) {
      const next = lines[i + 1] || ''
      let name = line
      if (YEAR_RE.test(next) && next.length < 60) {
        name = `${line} — ${next.replace(/\s+/g, ' ')}`
      }
      add(first.toUpperCase(), name, categoryFor(first.toUpperCase()))
    }
  }

  // Si el PDF no era un catálogo con tablas/códigos, usamos el genérico.
  if (products.length < 5) return extractGeneric(lines)
  return products
}

/** Parsea un buffer de PDF y devuelve texto + candidatos de producto. */
export async function parsePdf(buffer) {
  const data = await pdfParse(buffer)
  const products = extractProductsFromText(data.text || '')
  return {
    pages: data.numpages,
    rawText: data.text || '',
    products,
  }
}
