import { Link } from 'react-router-dom'

export function formatPrice(value) {
  if (value == null) return null
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export default function ProductCard({ product }) {
  return (
    <Link to={`/producto/${product.id}`} className="product-card">
      <div className="product-thumb">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} />
        ) : (
          <span>🔧</span>
        )}
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
          <span className="btn btn-ghost btn-sm">Ver</span>
        </div>
      </div>
    </Link>
  )
}
