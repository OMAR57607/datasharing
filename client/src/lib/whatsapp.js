import { WHATSAPP } from './config.js'
import { makeOf, vehicleOf } from './vehicles.js'

const money = (v) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(v)

// Arma un enlace wa.me con un mensaje enriquecido con toda la información
// disponible del producto (para que el asesor tenga contexto completo).
export function productWaHref(product) {
  const v = vehicleOf(product)
  const make = makeOf(product)
  const years = v.yearFrom
    ? `${v.yearFrom}${v.yearTo && v.yearTo !== v.yearFrom ? `–${v.yearTo}` : ''}`
    : ''
  const compat = [make, years].filter(Boolean).join(' ')
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const lines = [
    'Hola, quiero consultar sobre este producto:',
    '',
    `*${product.name}*`,
    product.sku ? `Nº de parte: ${product.sku}` : null,
    product.brand ? `Marca: ${product.brand}` : null,
    product.category ? `Categoría: ${product.category}` : null,
    compat ? `Compatibilidad: ${compat}` : null,
    product.compatible_vehicles ? `Vehículos: ${product.compatible_vehicles}` : null,
    product.dimensions ? `Medidas: ${product.dimensions}` : null,
    product.material ? `Material: ${product.material}` : null,
    `Precio: ${product.current_price != null ? money(product.current_price) : 'a consultar'}`,
    origin ? `\n${origin}/producto/${product.id}` : null,
  ].filter((l) => l !== null)

  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`
}
