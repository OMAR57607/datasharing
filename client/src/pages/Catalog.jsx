import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import ProductCard from '../components/ProductCard.jsx'

export default function Catalog() {
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const category = params.get('category') || ''
  const search = params.get('search') || ''

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const query = {}
    if (category) query.category = category
    if (search) query.search = search
    api
      .listProducts(query)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [category, search])

  function update(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h2 className="display">
              Catálogo de <span className="text-grad">accesorios</span>
            </h2>
            <p className="muted">
              {loading ? 'Cargando…' : `${products.length} producto(s)`}
            </p>
          </div>
        </div>

        <div className="filters">
          <input
            type="search"
            placeholder="Buscar producto o SKU…"
            defaultValue={search}
            onChange={(e) => update('search', e.target.value)}
          />
          <select
            value={category}
            onChange={(e) => update('category', e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading">Cargando productos…</div>
        ) : products.length === 0 ? (
          <p className="muted">No se encontraron productos.</p>
        ) : (
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
