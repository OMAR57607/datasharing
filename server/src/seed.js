import bcrypt from 'bcryptjs'
import db from './db.js'

// Usuario admin por defecto (cámbialo tras el primer login en producción).
const ADMIN_USER = process.env.ADMIN_USER || 'admin'
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123'

const existing = db
  .prepare('SELECT id FROM users WHERE username = ?')
  .get(ADMIN_USER)

if (!existing) {
  const hash = bcrypt.hashSync(ADMIN_PASS, 10)
  db.prepare(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
  ).run(ADMIN_USER, hash, 'admin')
  console.log(`✓ Usuario admin creado: ${ADMIN_USER} / ${ADMIN_PASS}`)
} else {
  console.log(`• El usuario admin "${ADMIN_USER}" ya existe`)
}

// Productos de ejemplo (accesorios automotrices) para ver la tienda con datos.
const sampleProducts = [
  {
    sku: 'ACC-001',
    name: 'Juego de tapetes de goma universales',
    description: 'Set de 4 tapetes antideslizantes resistentes al agua.',
    category: 'Interior',
    brand: 'AutoStyle',
    current_price: 24.99,
  },
  {
    sku: 'ACC-002',
    name: 'Funda para volante de cuero sintético',
    description: 'Ajuste universal 38 cm, costura reforzada.',
    category: 'Interior',
    brand: 'AutoStyle',
    current_price: 12.5,
  },
  {
    sku: 'ACC-003',
    name: 'Barra de luz LED 12" para off-road',
    description: 'Luz LED de 72W, 6000K, resistente al agua IP67.',
    category: 'Iluminación',
    brand: 'BrightRoad',
    current_price: 45.0,
  },
  {
    sku: 'ACC-004',
    name: 'Soporte magnético para teléfono',
    description: 'Montaje en rejilla de ventilación, rotación 360°.',
    category: 'Tecnología',
    brand: 'GripTech',
    current_price: 9.99,
  },
  {
    sku: 'ACC-005',
    name: 'Organizador de maletero plegable',
    description: 'Compartimentos ajustables, tela resistente.',
    category: 'Exterior',
    brand: 'CargoPro',
    current_price: null,
  },
  {
    sku: 'ACC-006',
    name: 'Cargador rápido USB-C doble puerto',
    description: 'Salida 36W, carga simultánea de dos dispositivos.',
    category: 'Tecnología',
    brand: 'GripTech',
    current_price: 15.75,
  },
]

const insert = db.prepare(
  `INSERT INTO products (sku, name, description, category, brand, current_price)
   VALUES (@sku, @name, @description, @category, @brand, @current_price)`
)
const insertHist = db.prepare(
  'INSERT INTO price_history (product_id, price, currency, note) VALUES (?, ?, ?, ?)'
)
const skuExists = db.prepare('SELECT id FROM products WHERE sku = ?')

let added = 0
for (const p of sampleProducts) {
  if (skuExists.get(p.sku)) continue
  const info = insert.run(p)
  if (p.current_price != null) {
    insertHist.run(info.lastInsertRowid, p.current_price, 'USD', 'Precio inicial')
  }
  added++
}
console.log(`✓ ${added} productos de ejemplo agregados`)
console.log('Seed completado.')
