import Icon from './Icon.jsx'

/**
 * Elige cuál de las fotos del producto va de portada (la que se ve en el
 * catálogo). La portada es siempre la primera del arreglo `images`.
 */
export default function CoverPicker({ product, saving, onClose, onSelect }) {
  if (!product) return null
  const photos = Array.isArray(product.images) ? product.images.filter(Boolean) : []

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Elegir portada de ${product.name}`}
      >
        <div className="modal-head">
          <div>
            <strong>Elegí la portada</strong>
            <div className="muted" style={{ fontSize: '0.85rem' }}>
              {product.name}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Cerrar <Icon name="x" size={15} />
          </button>
        </div>

        {photos.length === 0 ? (
          <p className="muted">Este producto todavía no tiene fotos.</p>
        ) : (
          <div className="cover-grid">
            {photos.map((url, i) => (
              <button
                key={url}
                type="button"
                className={`cover-opt ${i === 0 ? 'active' : ''}`}
                disabled={saving}
                onClick={() => i !== 0 && onSelect(url)}
                title={i === 0 ? 'Ya es la portada' : 'Usar como portada'}
              >
                <img src={url} alt="" loading="lazy" />
                {i === 0 && <span className="cover-tag">Portada</span>}
              </button>
            ))}
          </div>
        )}

        <p className="muted" style={{ fontSize: '0.82rem', marginBottom: 0, marginTop: '1rem' }}>
          La portada es la foto que se ve en el catálogo y en la cotización. El
          resto queda en la galería del producto, en este orden.
        </p>
      </div>
    </div>
  )
}
