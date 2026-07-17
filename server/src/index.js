import express from 'express'
import cors from 'cors'
import { PORT } from './config.js'
import './db.js' // inicializa el esquema
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import priceRoutes from './routes/prices.js'
import importRoutes from './routes/import.js'

const app = express()

app.use(cors())
app.use(express.json({ limit: '5mb' }))

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
// Rutas de precios montadas bajo /api/products (:id/price, :id/prices)
app.use('/api/products', priceRoutes)
app.use('/api/prices', priceRoutes) // /api/prices/bulk
app.use('/api/import', importRoutes)

// Manejo básico de errores (p.ej. filtros de multer)
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 400).json({ error: err.message || 'Error del servidor' })
})

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`)
})
