import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import ConfigBanner from '../../components/ConfigBanner.jsx'
import ThemeToggle from '../../components/ThemeToggle.jsx'
import Icon from '../../components/Icon.jsx'

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
            <Icon name="grid" size={18} /> Dashboard
          </NavLink>
          <NavLink to="/admin/productos">
            <Icon name="package" size={18} /> Productos
          </NavLink>
          <NavLink to="/admin/importar">
            <Icon name="file-text" size={18} /> Importar PDF
          </NavLink>
          <NavLink to="/admin/fotos">
            <Icon name="image" size={18} /> Asignar fotos
          </NavLink>
          <NavLink to="/admin/precios">
            <Icon name="tag" size={18} /> Carga de precios
          </NavLink>
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
