import { Link, useLocation } from 'react-router-dom'
import { useQuote } from '../context/QuoteContext.jsx'
import Icon from './Icon.jsx'

// Botón flotante del carrito / lista de cotización.
export default function CartFAB() {
  const { count } = useQuote()
  const location = useLocation()
  // No mostrarlo si está vacío o si ya estamos en la cotización.
  if (count === 0 || location.pathname === '/cotizacion') return null
  return (
    <Link to="/cotizacion" className="cart-fab" aria-label={`Mi lista, ${count} artículos`}>
      <span className="cart-fab-icon"><Icon name="cart" size={22} /></span>
      <span className="cart-fab-count">{count}</span>
    </Link>
  )
}
