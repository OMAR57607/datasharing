import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import ConfigBanner from '../../components/ConfigBanner.jsx'
import ThemeToggle from '../../components/ThemeToggle.jsx'

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function onLogout() {
    logout()
    navigate('/admin/login')
  }

  return (
    <>
      <ConfigBanner />
      <div className="admin">
        <aside className="admin-side">
          <Link to="/admin" className="brand">
            <img src="/logo.jpg" alt="Nitro Garage" style={{ height: 38 }} />
            <span className="brand-name">Admin</span>
          </Link>
          <NavLink to="/admin" end>
            📊 Dashboard
          </NavLink>
          <NavLink to="/admin/productos">📦 Productos</NavLink>
          <NavLink to="/admin/importar">📄 Importar PDF</NavLink>
          <NavLink to="/admin/fotos">🖼️ Asignar fotos</NavLink>
          <NavLink to="/admin/precios">💲 Carga de precios</NavLink>
          <div className="spacer" />
          <ThemeToggle />
          <Link to="/" className="muted" style={{ fontSize: '0.85rem' }}>
            ↗ Ver tienda
          </Link>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>
            Salir ({user?.email})
          </button>
        </aside>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </>
  )
}
