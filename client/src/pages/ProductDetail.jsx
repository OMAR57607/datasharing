import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api.js'
import { formatPrice } from '../components/ProductCard.jsx'

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .getProduct(id)
      .then(setProduct)
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

  return (
    <section className="section">
      <div className="container">
        <Link to="/catalogo" className="muted">
          ← Volver al catálogo
        </Link>
        <div
          className="hero-grid"
          style={{ marginTop: '1.5rem', alignItems: 'start' }}
        >
          <div
            className="product-thumb card"
            style={{ aspectRatio: '4 / 3', fontSize: '5rem' }}
          >
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} />
            ) : (
              <span>🔧</span>
            )}
          </div>
          <div>
            {product.category && (
              <span className="badge badge-cat">{product.category}</span>
            )}
            <h1 className="display" style={{ marginTop: '0.6rem' }}>
              {product.name}
            </h1>
            {product.brand && (
              <p className="muted">Marca: {product.brand}</p>
            )}
            {product.sku && (
              <p className="product-sku">SKU: {product.sku}</p>
            )}
            <p style={{ margin: '1.2rem 0' }}>
              {product.description || 'Sin descripción disponible.'}
            </p>
            <div style={{ margin: '1.5rem 0' }}>
              {product.current_price != null ? (
                <span className="price" style={{ fontSize: '2rem' }}>
                  {formatPrice(product.current_price)}
                </span>
              ) : (
                <span className="price-na" style={{ fontSize: '1.1rem' }}>
                  Precio a consultar
                </span>
              )}
            </div>
            <a
              href={`mailto:contacto@nitrogarage.com?subject=Consulta:%20${encodeURIComponent(
                product.name
              )}`}
              className="btn btn-primary"
            >
              Consultar / Comprar
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
