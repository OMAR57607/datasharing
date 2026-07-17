import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuote } from '../context/QuoteContext.jsx'
import { formatPrice } from '../components/ProductCard.jsx'
import { api } from '../api.js'
import { downloadQuotePdf } from '../lib/pdf.js'
import { WHATSAPP, STORE_NAME } from '../lib/config.js'

const IVA_RATE = 0.16

export default function Quote() {
  const { items, remove, setQty, clear, count } = useQuote()
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', vehiculo: '', notas: '' })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

  const priced = items.filter((i) => i.price != null)
  const total = priced.reduce((s, i) => s + i.price * i.qty, 0)
  const subtotal = total / (1 + IVA_RATE)
  const iva = total - subtotal
  const hasUnpriced = items.some((i) => i.price == null)

  function validate() {
    if (!form.nombre.trim() || !form.telefono.trim()) {
      setError('El nombre y el teléfono son obligatorios.')
      return false
    }
    if (items.length === 0) {
      setError('Tu lista está vacía.')
      return false
    }
    setError('')
    return true
  }

  function buildMessage() {
    const lines = [
      `*Solicitud de cotización — ${STORE_NAME}*`,
      '',
      `*Nombre:* ${form.nombre}`,
      `*Teléfono:* ${form.telefono}`,
      form.email ? `*Email:* ${form.email}` : null,
      form.vehiculo ? `*Vehículo:* ${form.vehiculo}` : null,
      '',
      '*Productos:*',
      ...items.map(
        (i) =>
          `• ${i.qty} x ${i.name}${i.sku ? ` (${i.sku})` : ''}` +
          (i.price != null ? ` — ${formatPrice(i.price * i.qty)}` : ' — a consultar')
      ),
      priced.length ? `\n*Total estimado:* ${formatPrice(total)} (IVA incl.)` : null,
      form.notas ? `\n*Notas:* ${form.notas}` : null,
    ].filter((l) => l !== null)
    return lines.join('\n')
  }

  function onWhatsApp() {
    if (!validate()) return
    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(buildMessage())}`
    window.open(url, '_blank', 'noopener')
  }

  async function onPdf() {
    if (!validate()) return
    try {
      await downloadQuotePdf({ form, items, subtotal, iva, total })
    } catch (e) {
      setError('No se pudo generar el PDF: ' + e.message)
    }
  }

  async function onSave() {
    if (!validate()) return
    setSaving(true)
    try {
      await api.createQuote({
        customer_name: form.nombre,
        phone: form.telefono,
        email: form.email || null,
        vehicle: form.vehiculo || null,
        notes: form.notas || null,
        items: items.map((i) => ({ id: i.id, name: i.name, sku: i.sku, qty: i.qty, price: i.price })),
        total,
      })
      setSaved(true)
    } catch (e) {
      setError('No se pudo guardar: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (items.length === 0) {
    return (
      <section className="section">
        <div className="container">
          <h1 className="display">Tu cotización</h1>
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
      <div className="container quote-page">
        <Link to="/catalogo" className="muted">
          ← Seguir agregando
        </Link>
        <h1 className="display" style={{ marginTop: '0.6rem' }}>
          Tu <span className="text-grad">cotización</span>
        </h1>
        <p className="muted">
          Ajusta cantidades, llena tus datos y guárdala, descárgala o envíala. Los
          precios incluyen IVA.
        </p>

        {error && <div className="error-box" style={{ margin: '1rem 0' }}>{error}</div>}
        {saved && (
          <div className="success-box" style={{ margin: '1rem 0' }}>
            ✓ Cotización guardada. Nuestro equipo te contactará.
          </div>
        )}

        {/* Accesorios */}
        <div className="card quote-block">
          <div className="quote-block-head">
            <h3>Accesorios ({count})</h3>
            <button className="linklike" onClick={clear}>
              Vaciar
            </button>
          </div>
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
                  {i.sku && <span className="product-sku">Nº parte {i.sku}</span>}
                </div>
                <div className="quote-item-actions">
                  <div className="qty">
                    <button onClick={() => setQty(i.id, i.qty - 1)} aria-label="Menos">−</button>
                    <span>{i.qty}</span>
                    <button onClick={() => setQty(i.id, i.qty + 1)} aria-label="Más">+</button>
                  </div>
                  <div className="quote-line-price">
                    {i.price != null ? formatPrice(i.price * i.qty) : 'A consultar'}
                  </div>
                  <button className="icon-btn" onClick={() => remove(i.id)} aria-label="Quitar" title="Quitar">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {priced.length > 0 && (
            <div className="quote-totals">
              <div><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div><span>IVA (16%)</span><span>{formatPrice(iva)}</span></div>
              <div className="grand"><span>Total</span><span>{formatPrice(total)}</span></div>
              {hasUnpriced && (
                <p className="muted" style={{ fontSize: '0.82rem', marginTop: 6 }}>
                  Algunos productos son "a consultar" y no se incluyen en el total.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Tus datos */}
        <div className="card quote-block">
          <h3>Tus datos</h3>
          <p className="muted" style={{ marginTop: 0, fontSize: '0.88rem' }}>
            Nombre y teléfono son necesarios para guardar, descargar o enviar tu
            cotización.
          </p>
          <div className="row-2">
            <div className="field">
              <label>Nombre *</label>
              <input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required />
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
          </div>
          <div className="row-2">
            <div className="field">
              <label>Correo (opcional)</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="field">
              <label>Vehículo (opcional)</label>
              <input value={form.vehiculo} onChange={(e) => set('vehiculo', e.target.value)} placeholder="Ej. Ford Ranger 2022" />
            </div>
          </div>
          <div className="field">
            <label>Notas (opcional)</label>
            <textarea rows={3} value={form.notas} onChange={(e) => set('notas', e.target.value)} placeholder="Comentarios o dudas para tu asesor" />
          </div>
        </div>

        {/* Acciones */}
        <div className="quote-actions-bar">
          <button className="btn btn-primary" onClick={onWhatsApp}>
            💬 Enviar por WhatsApp
          </button>
          <button className="btn btn-ghost" onClick={onPdf}>
            ⬇ Descargar PDF
          </button>
          <button className="btn btn-ice" onClick={onSave} disabled={saving}>
            {saving ? 'Guardando…' : '💾 Guardar cotización'}
          </button>
        </div>
      </div>
    </section>
  )
}
