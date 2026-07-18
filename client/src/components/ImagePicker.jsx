import { useEffect, useMemo, useState } from 'react'
import Icon from './Icon.jsx'

// Galería modal para elegir una foto del catálogo (servidas desde /productos).
// `label` (opcional): nombre del producto al que se le está asignando la foto,
// para no perder el hilo mientras se elige.
export default function ImagePicker({ open, onClose, onSelect, label }) {
  const [photos, setPhotos] = useState([])
  const [page, setPage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || photos.length) return
    setLoading(true)
    fetch('/productos/index.json')
      .then((r) => r.json())
      .then((d) => setPhotos(d.photos || []))
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false))
  }, [open, photos.length])

  const pages = useMemo(
    () => [...new Set(photos.map((p) => p.page))].sort((a, b) => a - b),
    [photos]
  )
  const shown = page ? photos.filter((p) => p.page === Number(page)) : photos

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-gallery" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">
            <strong>Elegí una foto</strong>
            {label && <span className="modal-subtitle">para: {label}</span>}
            <span className="muted modal-count">
              {shown.length} de {photos.length} fotos
            </span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <select value={page} onChange={(e) => setPage(e.target.value)}>
              <option value="">Todas las páginas</option>
              {pages.map((p) => (
                <option key={p} value={p}>
                  Página {p}
                </option>
              ))}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              Cerrar <Icon name="x" size={15} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading">Cargando fotos…</div>
        ) : (
          <div className="picker-grid">
            {shown.map((p) => (
              <button
                key={p.url}
                type="button"
                className="picker-item"
                onClick={() => {
                  onSelect(p.url)
                  onClose()
                }}
                title={`Página ${p.page}`}
              >
                <img src={p.url} alt="" loading="lazy" />
                <span className="picker-tag">Pág. {p.page}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
