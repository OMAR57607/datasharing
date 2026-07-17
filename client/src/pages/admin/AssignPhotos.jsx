import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api.js'
import ImagePicker from '../../components/ImagePicker.jsx'

export default function AssignPhotos() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [onlyMissing, setOnlyMissing] = useState(true)
  const [pickerFor, setPickerFor] = useState(null) // producto con el selector abierto
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    api
      .listProducts({ includeInactive: 1 })
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const shown = useMemo(() => {
    let list = products
    if (onlyMissing) list = list.filter((p) => !p.image_url)
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.sku || '').toLowerCase().includes(s)
      )
    }
    return list
  }, [products, onlyMissing, search])

  const missingCount = products.filter((p) => !p.image_url).length

  async function assign(product, repoUrl) {
    setSavingId(product.id)
    setError('')
    try {
      const image_url = await api.cloudinaryFromRepo(repoUrl)
      const updated = await api.updateProduct(product.id, { image_url })
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)))
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <>
      <div className="admin-head">
        <h1 className="display">Asignar fotos</h1>
        <span className="muted">
          {missingCount} sin foto · {products.length} en total
        </span>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="filters">
        <input
          type="search"
          placeholder="Buscar producto o SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="row" style={{ gap: 8, textTransform: 'none' }}>
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={onlyMissing}
            onChange={(e) => setOnlyMissing(e.target.checked)}
          />
          Solo los que no tienen foto
        </label>
      </div>

      {loading ? (
        <div className="loading">Cargando productos…</div>
      ) : shown.length === 0 ? (
        <p className="muted">
          {onlyMissing
            ? '¡Todos los productos (del filtro) ya tienen foto! 🎉'
            : 'No se encontraron productos.'}
        </p>
      ) : (
        <div className="assign-grid">
          {shown.map((p) => (
            <div key={p.id} className="assign-card">
              <div className="assign-thumb">
                {p.image_url ? (
                  <img src={p.image_url} alt="" loading="lazy" />
                ) : (
                  <span>🔧</span>
                )}
                {savingId === p.id && <div className="assign-saving">Guardando…</div>}
              </div>
              <div className="assign-body">
                <strong title={p.name}>{p.name}</strong>
                {p.sku && <span className="product-sku">{p.sku}</span>}
                <button
                  className="btn btn-ice btn-sm"
                  disabled={savingId === p.id}
                  onClick={() => setPickerFor(p)}
                >
                  {p.image_url ? '🖼️ Cambiar foto' : '🖼️ Elegir foto'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ImagePicker
        open={pickerFor !== null}
        label={pickerFor?.name}
        onClose={() => setPickerFor(null)}
        onSelect={(url) => {
          if (pickerFor) assign(pickerFor, url)
        }}
      />
    </>
  )
}
