import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api.js'
import { formatPrice } from '../components/ProductCard.jsx'
import { parseVehicle } from '../lib/vehicles.js'
import { useQuote } from '../context/QuoteContext.jsx'
import { WHATSAPP } from '../lib/config.js'

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [error, setError] = useState('')
  const [activeImg, setActiveImg] = useState(0)
  const { add, has } = useQuote()

  useEffect(() => {
    setActiveImg(0)
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
  // Galería: usa el arreglo images; si el producto es viejo, cae a image_url.
  const gallery = (
    Array.isArray(product.images) && product.images.length
      ? product.images
      : product.image_url
        ? [product.image_url]
        : []
  )
  const mainImg = gallery[activeImg] || gallery[0]
  // Prioriza los campos explícitos cargados en el admin; si no están
  // cargados, cae de vuelta al año detectado por heurística en el nombre.
  const yearFrom = product.year_from ?? v.yearFrom
  const yearTo = product.year_to ?? v.yearTo

  const specRows = [
    ['Vehículos compatibles', product.compatible_vehicles],
    [
      'Años',
      yearFrom ? `${yearFrom}${yearTo && yearTo !== yearFrom ? `–${yearTo}` : ''}` : null,
    ],
    ['Medidas', product.dimensions],
    ['Material', product.material],
    ['Especificaciones', product.specs],
  ].filter(([, value]) => value)

  return (
    <section className="section">
      <div className="container">
        <Link to="/catalogo" className="muted">
          ← Volver al catálogo
        </Link>
        <div className="detail-grid">
          <div className="detail-gallery">
            <div className="detail-media card">
              {mainImg ? (
                <img src={mainImg} alt={product.name} />
              ) : (
                <span className="detail-ph">🔧</span>
              )}
              {product.featured && <span className="ribbon">★ Destacado</span>}
            </div>
            {gallery.length > 1 && (
              <div className="detail-thumbs">
                {gallery.map((url, idx) => (
                  <button
                    key={url}
                    type="button"
                    className={`detail-thumb ${idx === activeImg ? 'active' : ''}`}
                    onClick={() => setActiveImg(idx)}
                    aria-label={`Ver foto ${idx + 1}`}
                  >
                    <img src={url} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {product.category && (
                <span className="badge badge-cat">{product.category}</span>
              )}
              {v.make && <span className="badge badge-veh">{v.make}</span>}
              {yearFrom && (
                <span className="badge badge-veh">
                  {yearFrom}
                  {yearTo && yearTo !== yearFrom ? `–${yearTo}` : ''}
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

            {specRows.length > 0 && (
              <table className="spec-table">
                <tbody>
                  {specRows.map(([label, value]) => (
                    <tr key={label}>
                      <th>{label}</th>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

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
              <button
                className="btn btn-primary"
                onClick={() => add(product)}
                disabled={has(product.id)}
              >
                {has(product.id) ? '✓ En mi lista' : '＋ Agregar a mi lista'}
              </button>
              <a
                href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
                  `Hola, me interesa: ${product.name}${product.sku ? ' (' + product.sku + ')' : ''}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ice"
              >
                💬 Consultar por WhatsApp
              </a>
            </div>
            {has(product.id) && (
              <p className="muted" style={{ marginTop: 10, fontSize: '0.9rem' }}>
                <Link to="/cotizacion" className="card-cta">
                  Ir a mi lista para generar la cotización →
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
