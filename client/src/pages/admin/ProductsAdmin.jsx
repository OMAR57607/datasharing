import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api.js'
import { formatPrice } from '../../components/ProductCard.jsx'
import Pagination from '../../components/Pagination.jsx'

const PAGE_SIZE = 20

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'no_price', label: '💲 Sin precio' },
  { value: 'no_photo', label: '📷 Sin foto' },
  { value: 'inactive', label: 'Inactivos' },
]

export default function ProductsAdmin() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [priceEdit, setPriceEdit] = useState({}) // id -> valor temporal
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortKey, setSortKey] = useState('created') // sku | name | price | created
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)

  function load() {
    setLoading(true)
    api
      .listProducts({ includeInactive: 1 })
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const shown = useMemo(() => {
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean)
    let list = products.filter((p) => {
      if (filter === 'no_price' && p.current_price != null) return false
      if (filter === 'no_photo' && p.image_url) return false
      if (filter === 'inactive' && p.active) return false
      if (terms.length) {
        const hay = `${p.name} ${p.sku || ''} ${p.category || ''} ${p.brand || ''}`.toLowerCase()
        if (!terms.every((t) => hay.includes(t))) return false
      }
      return true
    })

    const dir = sortDir === 'asc' ? 1 : -1
    const cmp = {
      sku: (a, b) => (a.sku || '').localeCompare(b.sku || '', 'es', { numeric: true }),
      name: (a, b) => (a.name || '').localeCompare(b.name || '', 'es', { numeric: true }),
      price: (a, b) =>
        (a.current_price ?? Infinity) - (b.current_price ?? Infinity),
      created: (a, b) => (a.created_at < b.created_at ? -1 : 1),
    }[sortKey]
    return [...list].sort((a, b) => cmp(a, b) * dir)
  }, [products, search, filter, sortKey, sortDir])

  const counts = useMemo(
    () => ({
      no_price: products.filter((p) => p.current_price == null).length,
      no_photo: products.filter((p) => !p.image_url).length,
    }),
    [products]
  )

  // Vuelve a la primera página al cambiar búsqueda, filtro u orden.
  useEffect(() => {
    setPage(1)
  }, [search, filter, sortKey, sortDir])

  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageItems = shown.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

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

  const arrow = (key) => (sortKey !== key ? ' ⇅' : sortDir === 'asc' ? ' ▲' : ' ▼')

  return (
    <>
      <div className="admin-head">
        <h1 className="display">Productos</h1>
        <Link to="/admin/productos/nuevo" className="btn btn-primary btn-sm">
          + Nuevo producto
        </Link>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="filters">
        <input
          type="search"
          placeholder="Buscar por nombre, SKU, categoría o marca…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-chips">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`facet-chip ${filter === f.value ? 'active' : ''}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
              {f.value === 'no_price' && counts.no_price > 0 && (
                <span className="facet-count">{counts.no_price}</span>
              )}
              {f.value === 'no_photo' && counts.no_photo > 0 && (
                <span className="facet-count">{counts.no_photo}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading">Cargando…</div>
      ) : shown.length === 0 ? (
        <p className="muted">No hay productos que coincidan con la búsqueda.</p>
      ) : (
        <>
          <p className="muted" style={{ margin: '0 0 0.6rem', fontSize: '0.85rem' }}>
            {shown.length} producto(s)
            {pageCount > 1 && ` · página ${safePage} de ${pageCount}`}
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 52 }}></th>
                  <th className="th-sort" onClick={() => toggleSort('sku')}>
                    SKU{arrow('sku')}
                  </th>
                  <th className="th-sort" onClick={() => toggleSort('name')}>
                    Nombre{arrow('name')}
                  </th>
                  <th>Categoría</th>
                  <th className="th-sort" onClick={() => toggleSort('price')}>
                    Precio{arrow('price')}
                  </th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="admin-thumb">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" loading="lazy" />
                        ) : (
                          <span title="Sin foto">🔧</span>
                        )}
                      </div>
                    </td>
                    <td className="product-sku">{p.sku || '—'}</td>
                    <td>{p.name}</td>
                    <td>{p.category || '—'}</td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <input
                          className={p.current_price == null ? 'input-warn' : ''}
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
          <Pagination page={safePage} pageCount={pageCount} onPage={setPage} />
        </>
      )}
    </>
  )
}
