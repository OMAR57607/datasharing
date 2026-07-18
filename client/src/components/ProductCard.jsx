import { Link } from 'react-router-dom'
import { useQuote } from '../context/QuoteContext.jsx'
import { makeOf } from '../lib/vehicles.js'
import { useTilt } from '../lib/useTilt.js'
import { WHATSAPP } from '../lib/config.js'

export function formatPrice(value) {
  if (value == null) return null
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function ProductCard({ product }) {
  const { add, has } = useQuote()
  const inList = has(product.id)
  const make = makeOf(product)
  const photoCount = Array.isArray(product.images) ? product.images.length : 0
  const tilt = useTilt()
  const waHref = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
    `Hola, me interesa: ${product.name}${product.sku ? ' (' + product.sku + ')' : ''}`
  )}`

  return (
    <div
      className="product-card"
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
    >
      <span className="card-glare" aria-hidden="true" />
      <Link to={`/producto/${product.id}`} className="product-thumb">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} loading="lazy" />
        ) : (
          <span>🔧</span>
        )}
        {make && <span className="veh-badge">{make}</span>}
        {product.featured && <span className="orig-badge">★ Destacado</span>}
        {photoCount > 1 && <span className="photo-count">📷 {photoCount}</span>}
      </Link>

      <div className="product-body">
        {product.category && <span className="badge badge-cat">{product.category}</span>}
        <Link to={`/producto/${product.id}`} className="product-title">
          <h3>{product.name}</h3>
        </Link>
        {product.sku && <span className="product-sku">Nº parte: {product.sku}</span>}

        <div className="price-row">
          <div className="price-block">
            {product.current_price != null ? (
              <>
                <span className="price">{formatPrice(product.current_price)}</span>
                <span className="price-unit">Precio unitario</span>
              </>
            ) : (
              <span className="price-na">Consultar precio</span>
            )}
          </div>
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="btn-consultar"
            onClick={(e) => e.stopPropagation()}
          >
            💬 Consultar
          </a>
        </div>

        <button
          className={`btn-addlist ${inList ? 'in' : ''}`}
          onClick={() => add(product)}
          disabled={inList}
        >
          {inList ? '✓ En mi lista' : '＋ Añadir a mi lista'}
        </button>
      </div>
    </div>
  )
}
