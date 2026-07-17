import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api.js'

export default function Dashboard() {
  const [products, setProducts] = useState([])

  useEffect(() => {
    api
      .listProducts({ includeInactive: 1 })
      .then(setProducts)
      .catch(() => setProducts([]))
  }, [])

  const total = products.length
  const withPrice = products.filter((p) => p.current_price != null).length
  const withoutPrice = total - withPrice
  const categories = new Set(
    products.map((p) => p.category).filter(Boolean)
  ).size

  return (
    <>
      <div className="admin-head">
        <h1 className="display">Dashboard</h1>
        <Link to="/admin/productos/nuevo" className="btn btn-primary btn-sm">
          + Nuevo producto
        </Link>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="num text-grad">{total}</div>
          <div className="lbl">Productos</div>
        </div>
        <div className="stat">
          <div className="num" style={{ color: 'var(--gold)' }}>
            {withPrice}
          </div>
          <div className="lbl">Con precio</div>
        </div>
        <div className="stat">
          <div className="num" style={{ color: 'var(--text-faint)' }}>
            {withoutPrice}
          </div>
          <div className="lbl">Sin precio</div>
        </div>
        <div className="stat">
          <div className="num" style={{ color: 'var(--blue-2)' }}>
            {categories}
          </div>
          <div className="lbl">Categorías</div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h3>Accesos rápidos</h3>
        <div className="row" style={{ flexWrap: 'wrap', marginTop: '1rem' }}>
          <Link to="/admin/productos" className="btn btn-ghost btn-sm">
            Gestionar productos
          </Link>
          <Link to="/admin/importar" className="btn btn-ghost btn-sm">
            Importar desde PDF
          </Link>
          <Link to="/admin/precios" className="btn btn-ghost btn-sm">
            Cargar precios
          </Link>
        </div>
        {withoutPrice > 0 && (
          <p className="muted" style={{ marginTop: '1rem' }}>
            Tenés <strong>{withoutPrice}</strong> producto(s) sin precio. Usá la
            sección de carga de precios para completarlos.
          </p>
        )}
      </div>
    </>
  )
}
