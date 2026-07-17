import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import ProductCard from '../components/ProductCard.jsx'
import { parseVehicle, matchesYear } from '../lib/vehicles.js'
import { observeReveal } from '../lib/anim.js'

const SORTS = [
  { value: 'popular', label: 'Más solicitados' },
  { value: 'recent', label: 'Más nuevos' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
]

export default function Catalog() {
  const [params, setParams] = useSearchParams()
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const gridRef = useRef(null)
  const revealed = useRef(false)

  // Estado de filtros (sincronizado con la URL para poder compartir enlaces).
  const search = params.get('q') || ''
  const category = params.get('category') || ''
  const make = params.get('make') || ''
  const year = params.get('year') || ''
  const sort = params.get('sort') || 'popular'

  useEffect(() => {
    setLoading(true)
    api
      .listProducts()
      .then(setAll)
      .catch(() => setAll([]))
      .finally(() => setLoading(false))
  }, [])

  // Revelado animado una sola vez, al mostrar los primeros resultados.
  useEffect(() => {
    if (loading || revealed.current) return
    revealed.current = true
    return observeReveal(gridRef.current, '.product-card')
  }, [loading])

  // Enriquecer cada producto con su vehículo parseado (memo).
  const enriched = useMemo(
    () => all.map((p) => ({ ...p, vehicle: parseVehicle(p.name) })),
    [all]
  )

  // Facetas disponibles.
  const facets = useMemo(() => {
    const makes = new Map()
    const cats = new Map()
    let minY = 9999
    let maxY = 0
    for (const p of enriched) {
      if (p.vehicle.make) makes.set(p.vehicle.make, (makes.get(p.vehicle.make) || 0) + 1)
      if (p.category) cats.set(p.category, (cats.get(p.category) || 0) + 1)
      if (p.vehicle.yearFrom) minY = Math.min(minY, p.vehicle.yearFrom)
      if (p.vehicle.yearTo) maxY = Math.max(maxY, p.vehicle.yearTo)
    }
    const years = []
    if (maxY >= minY) for (let y = maxY; y >= minY; y--) years.push(y)
    return {
      makes: [...makes.entries()].sort((a, b) => b[1] - a[1]),
      categories: [...cats.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      years,
    }
  }, [enriched])

  // Filtrado + orden.
  const results = useMemo(() => {
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean)
    let list = enriched.filter((p) => {
      if (category && p.category !== category) return false
      if (make && p.vehicle.make !== make) return false
      if (year && !matchesYear(p.vehicle, Number(year))) return false
      if (terms.length) {
        const hay = `${p.name} ${p.sku || ''} ${p.brand || ''} ${p.category || ''}`.toLowerCase()
        if (!terms.every((t) => hay.includes(t))) return false
      }
      return true
    })
    const byRecent = (a, b) => (a.created_at < b.created_at ? 1 : -1)
    if (sort === 'recent') list.sort(byRecent)
    else if (sort === 'price_asc')
      list.sort((a, b) => (a.current_price ?? Infinity) - (b.current_price ?? Infinity))
    else if (sort === 'price_desc')
      list.sort((a, b) => (b.current_price ?? -1) - (a.current_price ?? -1))
    else
      // popular: destacados primero, luego por vistas, luego recientes.
      list.sort(
        (a, b) =>
          Number(b.featured || false) - Number(a.featured || false) ||
          (b.views || 0) - (a.views || 0) ||
          byRecent(a, b)
      )
    return list
  }, [enriched, search, category, make, year, sort])

  function update(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  function clearAll() {
    setParams({}, { replace: true })
  }

  const activeFilters = [category, make, year].filter(Boolean).length + (search ? 1 : 0)

  return (
    <section className="section">
      <div className="container">
        <div className="catalog-head">
          <div>
            <h1 className="display">
              Catálogo <span className="text-grad">inteligente</span>
            </h1>
            <p className="muted">
              {loading ? 'Cargando…' : `${results.length} producto(s)`}
              {activeFilters > 0 && !loading && (
                <button className="linklike" onClick={clearAll}>
                  · limpiar filtros
                </button>
              )}
            </p>
          </div>
          <div className="catalog-search">
            <input
              type="search"
              placeholder="Busca por modelo, código, marca…"
              value={search}
              onChange={(e) => update('q', e.target.value)}
            />
            <select value={sort} onChange={(e) => update('sort', e.target.value)}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="catalog-layout">
          <aside className="catalog-filters">
            <FacetGroup
              title="Vehículo"
              options={facets.makes}
              value={make}
              onChange={(v) => update('make', v)}
            />
            <div className="facet">
              <h4>Año</h4>
              <select value={year} onChange={(e) => update('year', e.target.value)}>
                <option value="">Cualquier año</option>
                {facets.years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <FacetGroup
              title="Categoría"
              options={facets.categories}
              value={category}
              onChange={(v) => update('category', v)}
            />
          </aside>

          <div>
            {loading ? (
              <div className="loading">Cargando productos…</div>
            ) : results.length === 0 ? (
              <div className="empty-state">
                <p>No encontramos productos con esos filtros.</p>
                <button className="btn btn-ghost btn-sm" onClick={clearAll}>
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="product-grid" ref={gridRef}>
                {results.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function FacetGroup({ title, options, value, onChange }) {
  if (options.length === 0) return null
  return (
    <div className="facet">
      <h4>{title}</h4>
      <div className="facet-list">
        <button
          className={`facet-chip ${!value ? 'active' : ''}`}
          onClick={() => onChange('')}
        >
          Todas
        </button>
        {options.map(([name, count]) => (
          <button
            key={name}
            className={`facet-chip ${value === name ? 'active' : ''}`}
            onClick={() => onChange(value === name ? '' : name)}
          >
            {name} <span className="facet-count">{count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
