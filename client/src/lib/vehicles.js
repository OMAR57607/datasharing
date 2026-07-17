// Extrae marca de vehículo y años del nombre del producto, que en el
// catálogo vienen embebidos (ej. "TOYOTA TACOMA2015 - 2023").

// Marcas conocidas (el orden importa para las de dos palabras).
const MAKES = [
  'GREAT WALL',
  'TOYOTA', 'FORD', 'NISSAN', 'CHEVROLET', 'GMC', 'DODGE', 'RAM',
  'MITSUBISHI', 'JEEP', 'VOLKSWAGEN', 'SUZUKI', 'MAZDA', 'ISUZU', 'HONDA',
  'GWM', 'JAC', 'BYD', 'CHANGAN', 'DONGFENG', 'JMC', 'MAXUS', 'FOTON',
  'HYUNDAI', 'KIA', 'RENAULT', 'FIAT', 'PEUGEOT',
]

// Normaliza para mostrar (Title Case, con casos especiales).
const DISPLAY = {
  GMC: 'GMC', RAM: 'RAM', GWM: 'GWM', JAC: 'JAC', BYD: 'BYD', JMC: 'JMC',
}
function displayMake(m) {
  return DISPLAY[m] || m.charAt(0) + m.slice(1).toLowerCase()
}

export function parseVehicle(name = '') {
  const upper = name.toUpperCase()
  let make = null
  for (const m of MAKES) {
    if (upper.includes(m)) {
      make = displayMake(m)
      break
    }
  }
  const years = [...upper.matchAll(/\b(19|20)\d{2}\b/g)].map((x) => Number(x[0]))
  const yearFrom = years.length ? Math.min(...years) : null
  const yearTo = years.length ? Math.max(...years) : null
  return { make, yearFrom, yearTo }
}

// Normaliza una marca escrita a mano a la forma canónica del catálogo, para
// que "toyota", "TOYOTA" o "Toyota Hilux" se agrupen con "Toyota" del filtro.
export function normalizeMake(text = '') {
  const upper = String(text).toUpperCase()
  for (const m of MAKES) if (upper.includes(m)) return displayMake(m)
  const t = String(text).trim()
  return t || null
}

// Marca de vehículo efectiva: la manual (vehicle_make) tiene prioridad;
// si está vacía, cae a la detectada automáticamente del nombre.
export function makeOf(product = {}) {
  const manual = (product.vehicle_make || '').trim()
  if (manual) return normalizeMake(manual)
  return parseVehicle(product.name || '').make || null
}

// Datos de vehículo efectivos: combina los campos manuales del producto
// (marca y años cargados a mano) con la detección automática del nombre.
export function vehicleOf(product = {}) {
  const parsed = parseVehicle(product.name || '')
  return {
    make: makeOf(product),
    yearFrom: product.year_from ?? parsed.yearFrom,
    yearTo: product.year_to ?? parsed.yearTo,
  }
}

// ¿El producto aplica al año indicado?
export function matchesYear(vehicle, year) {
  if (!year) return true
  if (vehicle.yearFrom == null) return false
  return year >= vehicle.yearFrom && year <= (vehicle.yearTo ?? vehicle.yearFrom)
}
