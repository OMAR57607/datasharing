import { NavLink, Link, Outlet } from 'react-router-dom'

export default function PublicLayout() {
  return (
    <div className="site">
      <header className="navbar">
        <div className="container navbar-inner">
          <Link to="/" className="brand">
            <img src="/logo.jpg" alt="Nitro Garage" />
            <span className="brand-name text-grad">Nitro Garage</span>
          </Link>
          <nav className="nav-links">
            <NavLink to="/" end>
              Inicio
            </NavLink>
            <NavLink to="/catalogo">Catálogo</NavLink>
            <Link to="/admin" className="btn btn-ghost btn-sm">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <div className="brand" style={{ marginBottom: '0.6rem' }}>
              <img src="/logo.jpg" alt="Nitro Garage" style={{ height: 36 }} />
              <span className="brand-name">Nitro Garage</span>
            </div>
            <p className="muted" style={{ maxWidth: '32ch' }}>
              Venta de accesorios automotrices. Estilo, potencia y calidad para
              tu vehículo.
            </p>
          </div>
          <div>
            <strong>Enlaces</strong>
            <p style={{ margin: '0.5rem 0 0' }}>
              <Link to="/catalogo" className="muted">
                Catálogo
              </Link>
            </p>
            <p style={{ margin: '0.3rem 0 0' }}>
              <Link to="/admin" className="muted">
                Acceso administrador
              </Link>
            </p>
          </div>
          <div>
            <strong>Contacto</strong>
            <p className="muted" style={{ margin: '0.5rem 0 0' }}>
              contacto@nitrogarage.com
            </p>
          </div>
        </div>
        <div className="container" style={{ marginTop: '1.5rem' }}>
          <small className="muted">
            © {new Date().getFullYear()} Nitro Garage. Todos los derechos
            reservados.
          </small>
        </div>
      </footer>
    </div>
  )
}
