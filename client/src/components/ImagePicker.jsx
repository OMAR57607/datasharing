import { useEffect, useMemo, useState } from 'react'

// Galería modal para elegir una foto del catálogo (servidas desde /productos).
export default function ImagePicker({ open, onClose, onSelect }) {
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
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <strong>Elegí una foto del catálogo ({photos.length})</strong>
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
              Cerrar ✕
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
                title={p.url.split('/').pop()}
              >
                <img src={p.url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
