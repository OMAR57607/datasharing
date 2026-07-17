import { Link } from 'react-router-dom'
import { useQuote } from '../context/QuoteContext.jsx'

export function formatPrice(value) {
  if (value == null) return null
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default function ProductCard({ product }) {
  const { add, has } = useQuote()
  const inList = has(product.id)

  return (
    <div className="product-card">
      <button
        className={`add-fab ${inList ? 'added' : ''}`}
        title={inList ? 'Ya está en tu lista' : 'Agregar a mi lista'}
        aria-label="Agregar a mi lista"
        onClick={() => add(product)}
      >
        {inList ? '✓' : '＋'}
      </button>
      <Link to={`/producto/${product.id}`} className="product-inner">
        <div className="product-thumb">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} loading="lazy" />
          ) : (
            <span>🔧</span>
          )}
          {product.featured && <span className="ribbon">★ Destacado</span>}
        </div>
        <div className="product-body">
          {product.category && (
            <span className="badge badge-cat">{product.category}</span>
          )}
          <h3>{product.name}</h3>
          {product.sku && <span className="product-sku">SKU: {product.sku}</span>}
          <div className="product-foot">
            {product.current_price != null ? (
              <span className="price">{formatPrice(product.current_price)}</span>
            ) : (
              <span className="price-na">Consultar precio</span>
            )}
            <span className="card-cta">Ver →</span>
          </div>
        </div>
      </Link>
    </div>
  )
}
