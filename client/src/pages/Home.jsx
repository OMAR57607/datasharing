import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import ProductCard from '../components/ProductCard.jsx'
import { makeOf } from '../lib/vehicles.js'
import HeroFX from '../components/HeroFX.jsx'
import { useSeo } from '../lib/useSeo.js'
import { animate, stagger, observeReveal, reducedMotion } from '../lib/anim.js'

const CAT_ICON = {
  'Roll Bars': '🏎️',
  Racks: '🧺',
  'Bullbars / Bumpers': '🛡️',
  Brackets: '🔩',
  'Cajas / Tool Box': '🧰',
  'Tapas / Casetas': '🚪',
  Cerraduras: '🔒',
  'Estribos / Escalones': '🪜',
  Bedliners: '🛻',
  Accesorio: '🔧',
}
const iconFor = (c) => CAT_ICON[c] || '🔧'

export default function Home() {
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const heroRef = useRef(null)
  const gridRef = useRef(null)

  useSeo({
    description:
      'Accesorios off-road y 4x4 para pickups y camionetas: roll bars, racks de batea, bumpers, tumbaburros, tapas y casetas, estribos, tool box y bedliners. Busca por marca, modelo y año. Envíos a todo México.',
  })

  useEffect(() => {
    api
      .listProducts()
      .then(setAll)
      .catch(() => setAll([]))
      .finally(() => setLoading(false))
  }, [])

  // Entrada cinemática del hero: cada línea "arranca" desde la izquierda con
  // un leve skew (sensación de velocidad) y se asienta. Una sola vez al montar.
  useEffect(() => {
    const root = heroRef.current
    if (!root) return
    const els = [...root.children]
    if (reducedMotion()) {
      els.forEach((e) => (e.style.opacity = '1'))
      return
    }
    animate(els, {
      opacity: [0, 1],
      x: [-48, 0],
      skewX: [7, 0],
      duration: 950,
      delay: stagger(95, { start: 120 }),
      ease: 'outExpo',
    })
  }, [])

  // Revelado al hacer scroll de las tarjetas de producto.
  useEffect(() => {
    if (!loading) return observeReveal(gridRef.current, '.product-card')
  }, [loading])

  const mostRequested = useMemo(() => {
    return [...all]
      .sort(
        (a, b) =>
          Number(b.featured || false) - Number(a.featured || false) ||
          (b.views || 0) - (a.views || 0) ||
          (a.created_at < b.created_at ? 1 : -1)
      )
      .slice(0, 8)
  }, [all])

  const categories = useMemo(() => {
    const m = new Map()
    for (const p of all) if (p.category) m.set(p.category, (m.get(p.category) || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [all])

  const makes = useMemo(() => {
    const m = new Map()
    for (const p of all) {
      const mk = makeOf(p)
      if (mk) m.set(mk, (m.get(mk) || 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [all])

  return (
    <>
      <section className="hero">
        <div className="hero-aurora" aria-hidden="true" />
        <HeroFX />
        <div className="container hero-grid">
          <div ref={heroRef}>
            <span className="badge badge-cat">Venta de accesorios · Off-Road</span>
            <h1>
              Dale <span className="text-grad">potencia y estilo</span> a tu
              vehículo
            </h1>
            <p className="lead">
              Accesorios automotrices para pickups y 4x4: roll bars, racks,
              bumpers, tapas, estribos y mucho más. Encuentra lo que tu
              camioneta necesita por marca, modelo y año.
            </p>
            <div className="hero-cta">
              <Link to="/catalogo" className="btn btn-primary">
                Ver catálogo
              </Link>
              <a href="#solicitados" className="btn btn-ghost">
                Los más solicitados
              </a>
            </div>
            <div className="hero-trust">
              <span>🚚 Envíos a todo el país</span>
              <span>🛡️ Calidad garantizada</span>
              <span>💬 Asesoría directa</span>
            </div>
          </div>
          <div className="hero-logo">
            <img src="/logo.jpg" alt="Nitro Garage — Venta de accesorios" />
          </div>
        </div>
      </section>

      {/* Buscar por vehículo */}
      {makes.length > 0 && (
        <section className="section-tight">
          <div className="container">
            <h2 className="mini-title">Busca por tu vehículo</h2>
            <div className="chips">
              {makes.map(([mk, n]) => (
                <Link key={mk} to={`/catalogo?make=${encodeURIComponent(mk)}`} className="chip-link">
                  {mk} <span className="facet-count">{n}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categorías */}
      {categories.length > 0 && (
        <section className="section-tight">
          <div className="container">
            <h2 className="mini-title">Categorías</h2>
            <div className="strip">
              {categories.map(([c, n]) => (
                <Link
                  key={c}
                  to={`/catalogo?category=${encodeURIComponent(c)}`}
                  className="strip-item"
                >
                  <span className="ico">{iconFor(c)}</span>
                  {c}
                  <span className="strip-count">{n}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Más solicitados */}
      <section className="section" id="solicitados">
        <div className="container">
          <div className="section-head">
            <h2 className="display">
              Los más <span className="text-grad">solicitados</span>
            </h2>
            <Link to="/catalogo" className="btn btn-ghost btn-sm">
              Ver todo
            </Link>
          </div>
          {loading ? (
            <div className="loading">Cargando…</div>
          ) : mostRequested.length === 0 ? (
            <p className="muted">
              Aún no hay productos cargados. Ingresá al panel admin para
              agregarlos.
            </p>
          ) : (
            <div className="product-grid" ref={gridRef}>
              {mostRequested.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
