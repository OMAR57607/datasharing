import { Router } from 'express'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/products/:id/prices  (admin) — historial de precios
router.get('/:id/prices', requireAuth, (req, res) => {
  const product = db
    .prepare('SELECT id FROM products WHERE id = ?')
    .get(req.params.id)
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' })

  const history = db
    .prepare(
      'SELECT * FROM price_history WHERE product_id = ? ORDER BY created_at DESC'
    )
    .all(req.params.id)
  res.json(history)
})

// POST /api/products/:id/price  (admin) — carga/actualiza precio
router.post('/:id/price', requireAuth, (req, res) => {
  const { price, currency, note } = req.body || {}
  const value = Number(price)
  if (!Number.isFinite(value) || value < 0) {
    return res.status(400).json({ error: 'Precio inválido' })
  }

  const product = db
    .prepare('SELECT id FROM products WHERE id = ?')
    .get(req.params.id)
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' })

  const tx = db.transaction(() => {
    db.prepare(
      'INSERT INTO price_history (product_id, price, currency, note) VALUES (?, ?, ?, ?)'
    ).run(req.params.id, value, currency || 'USD', note || null)

    db.prepare(
      "UPDATE products SET current_price = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(value, req.params.id)
  })
  tx()

  const updated = db
    .prepare('SELECT * FROM products WHERE id = ?')
    .get(req.params.id)
  res.status(201).json(updated)
})

// POST /api/prices/bulk  (admin) — carga masiva por SKU
router.post('/bulk', requireAuth, (req, res) => {
  const { items, currency } = req.body || {}
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Se requiere una lista de items' })
  }

  const results = { updated: [], notFound: [], invalid: [] }
  const findBySku = db.prepare('SELECT id FROM products WHERE sku = ?')
  const insertHist = db.prepare(
    'INSERT INTO price_history (product_id, price, currency, note) VALUES (?, ?, ?, ?)'
  )
  const updateProduct = db.prepare(
    "UPDATE products SET current_price = ?, updated_at = datetime('now') WHERE id = ?"
  )

  const tx = db.transaction(() => {
    for (const item of items) {
      const value = Number(item.price)
      if (!item.sku || !Number.isFinite(value) || value < 0) {
        results.invalid.push(item)
        continue
      }
      const product = findBySku.get(item.sku)
      if (!product) {
        results.notFound.push(item.sku)
        continue
      }
      insertHist.run(product.id, value, currency || 'USD', 'Carga masiva')
      updateProduct.run(value, product.id)
      results.updated.push({ sku: item.sku, price: value })
    }
  })
  tx()

  res.json(results)
})

export default router
