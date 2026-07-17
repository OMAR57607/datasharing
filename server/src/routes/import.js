import { Router } from 'express'
import multer from 'multer'
import db from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { parsePdf } from '../services/pdf.js'

const router = Router()

// Guardamos el PDF en memoria; solo necesitamos su texto.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Solo se aceptan archivos PDF'))
  },
})

// POST /api/import/pdf  (admin) — sube un PDF y devuelve candidatos (vista previa)
router.post('/pdf', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió el archivo' })
  try {
    const result = await parsePdf(req.file.buffer)
    res.json({
      filename: req.file.originalname,
      pages: result.pages,
      count: result.products.length,
      products: result.products,
    })
  } catch (err) {
    res.status(400).json({ error: 'No se pudo procesar el PDF: ' + err.message })
  }
})

// POST /api/import/confirm  (admin) — guarda los productos seleccionados
router.post('/confirm', requireAuth, (req, res) => {
  const { products } = req.body || {}
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'No hay productos para importar' })
  }

  const insert = db.prepare(
    `INSERT INTO products (sku, name, description, category, brand)
     VALUES (@sku, @name, @description, @category, @brand)`
  )
  const skuExists = db.prepare('SELECT id FROM products WHERE sku = ?')

  const results = { imported: 0, skipped: [] }
  const tx = db.transaction(() => {
    for (const p of products) {
      if (!p.name) continue
      if (p.sku && skuExists.get(p.sku)) {
        results.skipped.push(p.sku)
        continue
      }
      insert.run({
        sku: p.sku || null,
        name: p.name,
        description: p.description || null,
        category: p.category || null,
        brand: p.brand || null,
      })
      results.imported++
    }
  })
  tx()

  res.status(201).json(results)
})

export default router
