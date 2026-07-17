import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import ProductCard from '../components/ProductCard.jsx'

const CATEGORIES = [
  { ico: '💡', name: 'Iluminación' },
  { ico: '🪑', name: 'Interior' },
  { ico: '📱', name: 'Tecnología' },
  { ico: '🚙', name: 'Exterior' },
]

export default function Home() {
  const [featured, setFeatured] = useState([])

  useEffect(() => {
    api
      .listProducts()
      .then((list) => setFeatured(list.slice(0, 8)))
      .catch(() => setFeatured([]))
  }, [])

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="badge badge-cat">Venta de accesorios</span>
            <h1>
              Dale <span className="text-grad">potencia y estilo</span> a tu
              vehículo
            </h1>
            <p className="lead">
              En Nitro Garage encontrás los mejores accesorios automotrices:
              iluminación LED, interiores, tecnología y todo el equipamiento
              para llevar tu auto al siguiente nivel.
            </p>
            <div className="hero-cta">
              <Link to="/catalogo" className="btn btn-primary">
                Ver catálogo
              </Link>
              <a href="#destacados" className="btn btn-ghost">
                Destacados
              </a>
            </div>
          </div>
          <div className="hero-logo">
            <img src="/logo.jpg" alt="Nitro Garage — Venta de accesorios" />
          </div>
        </div>

        <div className="container">
          <div className="strip">
            {CATEGORIES.map((c) => (
              <Link
                key={c.name}
                to={`/catalogo?category=${encodeURIComponent(c.name)}`}
                className="strip-item"
              >
                <span className="ico">{c.ico}</span>
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="destacados">
        <div className="container">
          <div className="section-head">
            <h2 className="display">
              Productos <span className="text-grad">destacados</span>
            </h2>
            <Link to="/catalogo" className="btn btn-ghost btn-sm">
              Ver todo
            </Link>
          </div>
          {featured.length === 0 ? (
            <p className="muted">
              Aún no hay productos cargados. Ingresá al panel admin para
              agregarlos.
            </p>
          ) : (
            <div className="product-grid">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
