import { useEffect, useState } from 'react'
import { api } from '../../api.js'
import { formatPrice } from '../../components/ProductCard.jsx'
import Icon from '../../components/Icon.jsx'

const STATUSES = ['nuevo', 'atendido', 'cerrado']

export default function QuotesAdmin() {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)

  useEffect(() => {
    api
      .listQuotes()
      .then(setQuotes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function changeStatus(id, status) {
    try {
      const updated = await api.updateQuoteStatus(id, status)
      setQuotes((prev) => prev.map((q) => (q.id === id ? updated : q)))
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <>
      <div className="admin-head">
        <h1 className="display">Cotizaciones</h1>
        <span className="muted">{quotes.length} recibida(s)</span>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div className="loading">Cargando…</div>
      ) : quotes.length === 0 ? (
        <p className="muted">
          Aún no hay cotizaciones. Aparecerán aquí cuando un cliente use "Guardar
          cotización" en la tienda.
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Artículos</th>
                <th>Total</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td>{new Date(q.created_at).toLocaleDateString('es-MX')}</td>
                  <td>{q.customer_name}</td>
                  <td>
                    <a href={`tel:${q.phone}`} className="card-cta">{q.phone}</a>
                  </td>
                  <td>{Array.isArray(q.items) ? q.items.length : 0}</td>
                  <td>{formatPrice(q.total)}</td>
                  <td>
                    <select value={q.status} onChange={(e) => changeStatus(q.id, e.target.value)}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => setOpen(open === q.id ? null : q.id)}>
                      {open === q.id ? 'Ocultar' : 'Ver'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (() => {
        const q = quotes.find((x) => x.id === open)
        if (!q) return null
        return (
          <div className="card" style={{ padding: '1.3rem', marginTop: '1.2rem', maxWidth: 560 }}>
            <h3 style={{ marginTop: 0 }}>{q.customer_name}</h3>
            <p className="muted quote-meta" style={{ marginTop: 0 }}>
              <span><Icon name="phone" size={14} /> {q.phone}</span>
              {q.email && <span><Icon name="mail" size={14} /> {q.email}</span>}
              {q.vehicle && <span><Icon name="truck" size={14} /> {q.vehicle}</span>}
            </p>
            {q.notes && <p><strong>Notas:</strong> {q.notes}</p>}
            <div className="table-wrap">
              <table>
                <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th></tr></thead>
                <tbody>
                  {(q.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td>{it.name}{it.sku ? ` (${it.sku})` : ''}</td>
                      <td>{it.qty}</td>
                      <td>{it.price != null ? formatPrice(it.price) : 'A consultar'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}
    </>
  )
}
