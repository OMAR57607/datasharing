import { Router } from 'express'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/products  (público) — lista con filtros opcionales
router.get('/', (req, res) => {
  const { category, search, includeInactive } = req.query
  const where = []
  const params = {}

  if (!includeInactive) where.push('active = 1')
  if (category) {
    where.push('category = @category')
    params.category = category
  }
  if (search) {
    where.push('(name LIKE @search OR description LIKE @search OR sku LIKE @search)')
    params.search = `%${search}%`
  }

  const sql =
    'SELECT * FROM products' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') +
    ' ORDER BY created_at DESC'

  const products = db.prepare(sql).all(params)
  res.json(products)
})

// GET /api/products/categories  (público) — categorías distintas
router.get('/categories', (req, res) => {
  const rows = db
    .prepare(
      "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category <> '' ORDER BY category"
    )
    .all()
  res.json(rows.map((r) => r.category))
})

// GET /api/products/:id  (público)
router.get('/:id', (req, res) => {
  const product = db
    .prepare('SELECT * FROM products WHERE id = ?')
    .get(req.params.id)
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' })
  res.json(product)
})

// POST /api/products  (admin)
router.post('/', requireAuth, (req, res) => {
  const { sku, name, description, category, brand, image_url, active } =
    req.body || {}
  if (!name) return res.status(400).json({ error: 'El nombre es requerido' })

  try {
    const info = db
      .prepare(
        `INSERT INTO products (sku, name, description, category, brand, image_url, active)
         VALUES (@sku, @name, @description, @category, @brand, @image_url, @active)`
      )
      .run({
        sku: sku || null,
        name,
        description: description || null,
        category: category || null,
        brand: brand || null,
        image_url: image_url || null,
        active: active === false ? 0 : 1,
      })
    const product = db
      .prepare('SELECT * FROM products WHERE id = ?')
      .get(info.lastInsertRowid)
    res.status(201).json(product)
  } catch (err) {
    if (String(err).includes('UNIQUE')) {
      return res.status(409).json({ error: 'El SKU ya existe' })
    }
    throw err
  }
})

// PUT /api/products/:id  (admin)
router.put('/:id', requireAuth, (req, res) => {
  const existing = db
    .prepare('SELECT * FROM products WHERE id = ?')
    .get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado' })

  const { sku, name, description, category, brand, image_url, active } =
    req.body || {}

  db.prepare(
    `UPDATE products SET
       sku = @sku, name = @name, description = @description,
       category = @category, brand = @brand, image_url = @image_url,
       active = @active, updated_at = datetime('now')
     WHERE id = @id`
  ).run({
    id: req.params.id,
    sku: sku ?? existing.sku,
    name: name ?? existing.name,
    description: description ?? existing.description,
    category: category ?? existing.category,
    brand: brand ?? existing.brand,
    image_url: image_url ?? existing.image_url,
    active: active === undefined ? existing.active : active ? 1 : 0,
  })

  const product = db
    .prepare('SELECT * FROM products WHERE id = ?')
    .get(req.params.id)
  res.json(product)
})

// DELETE /api/products/:id  (admin)
router.delete('/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id)
  if (info.changes === 0)
    return res.status(404).json({ error: 'Producto no encontrado' })
  res.json({ ok: true })
})

export default router
