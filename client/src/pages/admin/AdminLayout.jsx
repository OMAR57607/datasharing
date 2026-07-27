import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import ConfigBanner from '../../components/ConfigBanner.jsx'
import ThemeToggle from '../../components/ThemeToggle.jsx'
import Icon from '../../components/Icon.jsx'
import { useSeo } from '../../lib/useSeo.js'

export default function AdminLayout() {
  // Refuerza el X-Robots-Tag de vercel.json: el panel nunca se indexa.
  useSeo({ title: 'Panel de administración', robots: 'noindex, nofollow' })
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
            <Icon name="grid" size={18} /> Dashboard
          </NavLink>
          <span className="nav-group">Catálogo</span>
          <NavLink to="/admin/productos">
            <Icon name="package" size={18} /> Productos
          </NavLink>
          <NavLink to="/admin/cloudinary">
            <Icon name="cloud" size={18} /> Fotos de Cloudinary
          </NavLink>
          <NavLink to="/admin/precios">
            <Icon name="tag" size={18} /> Carga de precios
          </NavLink>
          <span className="nav-group">Ventas</span>
          <NavLink to="/admin/cotizador">
            <Icon name="edit" size={18} /> Armar cotización
          </NavLink>
          <NavLink to="/admin/cotizaciones">
            <Icon name="receipt" size={18} /> Cotizaciones
          </NavLink>
          <div className="spacer" />
          <ThemeToggle />
          <Link to="/" className="muted link-icon" style={{ fontSize: '0.85rem' }}>
            <Icon name="external-link" size={15} /> Ver tienda
          </Link>
          {user?.email && (
            <span className="admin-user" title={user.email}>
              <Icon name="user" size={14} /> {user.email}
            </span>
          )}
          <button
            className="btn btn-danger btn-sm admin-logout"
            onClick={onLogout}
            title="Cerrar sesión"
          >
            <Icon name="log-out" size={16} /> Cerrar sesión
          </button>
        </aside>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </>
  )
}
