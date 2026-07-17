import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api.js'
import { formatPrice } from '../components/ProductCard.jsx'
import { parseVehicle } from '../lib/vehicles.js'

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .getProduct(id)
      .then((p) => {
        setProduct(p)
        api.incrementViews(id) // cuenta la "solicitud" para el ranking
      })
      .catch(() => setError('Producto no encontrado'))
  }, [id])

  if (error) {
    return (
      <section className="section">
        <div className="container">
          <p className="error-box">{error}</p>
          <Link to="/catalogo" className="btn btn-ghost" style={{ marginTop: 16 }}>
            ← Volver al catálogo
          </Link>
        </div>
      </section>
    )
  }

  if (!product) return <div className="loading">Cargando…</div>

  const v = parseVehicle(product.name)

  return (
    <section className="section">
      <div className="container">
        <Link to="/catalogo" className="muted">
          ← Volver al catálogo
        </Link>
        <div className="detail-grid">
          <div className="detail-media card">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} />
            ) : (
              <span className="detail-ph">🔧</span>
            )}
            {product.featured && <span className="ribbon">★ Destacado</span>}
          </div>
          <div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {product.category && (
                <span className="badge badge-cat">{product.category}</span>
              )}
              {v.make && <span className="badge badge-veh">{v.make}</span>}
              {v.yearFrom && (
                <span className="badge badge-veh">
                  {v.yearFrom}
                  {v.yearTo && v.yearTo !== v.yearFrom ? `–${v.yearTo}` : ''}
                </span>
              )}
            </div>
            <h1 className="display" style={{ marginTop: '0.7rem' }}>
              {product.name}
            </h1>
            {product.brand && <p className="muted">Marca: {product.brand}</p>}
            {product.sku && <p className="product-sku">SKU: {product.sku}</p>}
            <p style={{ margin: '1.2rem 0' }}>
              {product.description || 'Sin descripción disponible.'}
            </p>
            <div className="detail-price">
              {product.current_price != null ? (
                <span className="price" style={{ fontSize: '2.2rem' }}>
                  {formatPrice(product.current_price)}
                </span>
              ) : (
                <span className="price-na" style={{ fontSize: '1.1rem' }}>
                  Precio a consultar
                </span>
              )}
            </div>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Hola, me interesa: ${product.name}${product.sku ? ' (' + product.sku + ')' : ''}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                💬 Consultar por WhatsApp
              </a>
              <a
                href={`mailto:contacto@nitrogarage.com?subject=Consulta:%20${encodeURIComponent(
                  product.name
                )}`}
                className="btn btn-ghost"
              >
                Enviar email
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
