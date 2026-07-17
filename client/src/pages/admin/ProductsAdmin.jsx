import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api.js'
import { formatPrice } from '../../components/ProductCard.jsx'

export default function ProductsAdmin() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [priceEdit, setPriceEdit] = useState({}) // id -> valor temporal

  function load() {
    setLoading(true)
    api
      .listProducts({ includeInactive: 1 })
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function onDelete(id) {
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.'))
      return
    try {
      await api.deleteProduct(id)
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch (e) {
      setError(e.message)
    }
  }

  async function savePrice(id) {
    const value = priceEdit[id]
    if (value === undefined || value === '') return
    try {
      const updated = await api.setPrice(id, { price: Number(value) })
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)))
      setPriceEdit((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <>
      <div className="admin-head">
        <h1 className="display">Productos</h1>
        <Link to="/admin/productos/nuevo" className="btn btn-primary btn-sm">
          + Nuevo producto
        </Link>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div className="loading">Cargando…</div>
      ) : products.length === 0 ? (
        <p className="muted">
          No hay productos. Creá uno o importá desde un PDF.
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="product-sku">{p.sku || '—'}</td>
                  <td>{p.name}</td>
                  <td>{p.category || '—'}</td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <input
                        style={{ width: 90, padding: '0.35rem 0.5rem' }}
                        type="number"
                        step="0.01"
                        placeholder={
                          p.current_price != null
                            ? formatPrice(p.current_price)
                            : 'Sin precio'
                        }
                        value={priceEdit[p.id] ?? ''}
                        onChange={(e) =>
                          setPriceEdit((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                      />
                      <button
                        className="btn btn-ice btn-sm"
                        onClick={() => savePrice(p.id)}
                        disabled={priceEdit[p.id] === undefined}
                      >
                        ✓
                      </button>
                    </div>
                  </td>
                  <td>
                    {p.active ? (
                      <span className="badge badge-cat">Activo</span>
                    ) : (
                      <span className="badge badge-off">Inactivo</span>
                    )}
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <Link
                        to={`/admin/productos/${p.id}`}
                        className="btn btn-ghost btn-sm"
                      >
                        Editar
                      </Link>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => onDelete(p.id)}
                      >
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
