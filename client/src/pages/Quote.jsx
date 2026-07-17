import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuote } from '../context/QuoteContext.jsx'
import { formatPrice } from '../components/ProductCard.jsx'
import { WHATSAPP, STORE_NAME } from '../lib/config.js'

export default function Quote() {
  const { items, remove, setQty, clear, count } = useQuote()
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', notas: '' })
  const [error, setError] = useState('')

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

  function buildMessage() {
    const lines = [
      `*Solicitud de cotización — ${STORE_NAME}*`,
      '',
      `*Nombre:* ${form.nombre}`,
      `*Teléfono:* ${form.telefono}`,
      form.email ? `*Email:* ${form.email}` : null,
      '',
      '*Productos:*',
      ...items.map(
        (i) => `• ${i.qty} x ${i.name}${i.sku ? ` (${i.sku})` : ''}`
      ),
      form.notas ? `\n*Notas:* ${form.notas}` : null,
    ].filter((l) => l !== null)
    return lines.join('\n')
  }

  function onSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.telefono.trim()) {
      setError('El nombre y el teléfono son obligatorios.')
      return
    }
    if (items.length === 0) {
      setError('Tu lista está vacía.')
      return
    }
    setError('')
    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(buildMessage())}`
    window.open(url, '_blank', 'noopener')
  }

  if (items.length === 0) {
    return (
      <section className="section">
        <div className="container">
          <h1 className="display">Mi lista de cotización</h1>
          <div className="empty-state" style={{ marginTop: '1.5rem' }}>
            <p>Tu lista está vacía.</p>
            <Link to="/catalogo" className="btn btn-primary btn-sm">
              Explorar catálogo
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h1 className="display">
            Mi lista de <span className="text-grad">cotización</span>
          </h1>
          <button className="btn btn-ghost btn-sm" onClick={clear}>
            Vaciar lista
          </button>
        </div>

        <div className="quote-layout">
          {/* Items */}
          <div className="quote-items">
            {items.map((i) => (
              <div key={i.id} className="quote-item">
                <div className="quote-thumb">
                  {i.image_url ? <img src={i.image_url} alt="" /> : <span>🔧</span>}
                </div>
                <div className="quote-info">
                  <Link to={`/producto/${i.id}`} className="quote-name">
                    {i.name}
                  </Link>
                  {i.sku && <span className="product-sku">SKU: {i.sku}</span>}
                  <span className="quote-price">
                    {i.price != null ? formatPrice(i.price) : 'Precio a consultar'}
                  </span>
                </div>
                <div className="quote-actions">
                  <div className="qty">
                    <button onClick={() => setQty(i.id, i.qty - 1)} aria-label="Menos">
                      −
                    </button>
                    <span>{i.qty}</span>
                    <button onClick={() => setQty(i.id, i.qty + 1)} aria-label="Más">
                      +
                    </button>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(i.id)}>
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Formulario */}
          <form className="quote-form card" onSubmit={onSubmit}>
            <h3>Tus datos</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: '0.88rem' }}>
              {count} artículo(s). Te contactamos con la cotización.
            </p>
            {error && <div className="error-box" style={{ marginBottom: 12 }}>{error}</div>}
            <div className="field">
              <label>Nombre *</label>
              <input
                value={form.nombre}
                onChange={(e) => set('nombre', e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Teléfono *</label>
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => set('telefono', e.target.value)}
                placeholder="Ej. 238 290 0385"
                required
              />
            </div>
            <div className="field">
              <label>Email (opcional)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Notas (opcional)</label>
              <textarea
                rows={3}
                value={form.notas}
                onChange={(e) => set('notas', e.target.value)}
                placeholder="Modelo de tu vehículo, dudas, etc."
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              💬 Enviar cotización por WhatsApp
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
