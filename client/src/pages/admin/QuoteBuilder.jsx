import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api.js'
import { formatPrice } from '../../components/ProductCard.jsx'
import { downloadQuotePdf } from '../../lib/pdf.js'
import Icon from '../../components/Icon.jsx'

const IVA_RATE = 0.16
let uid = 0

// Armador de cotización (admin): busca productos, ajusta cantidades y precios,
// agrega líneas manuales (envío, instalación…), y genera PDF / WhatsApp / guarda.
export default function QuoteBuilder() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [lines, setLines] = useState([])
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', vehiculo: '', notas: '' })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

  useEffect(() => {
    api.listProducts({ includeInactive: 1 }).then(setProducts).catch(() => {})
  }, [])

  const matches = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return []
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s)
      )
      .slice(0, 8)
  }, [products, search])

  function addProduct(p) {
    setLines((prev) => {
      const found = prev.find((l) => l.productId === p.id)
      if (found) return prev.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + 1 } : l))
      return [
        ...prev,
        {
          key: ++uid,
          productId: p.id,
          name: p.name,
          sku: p.sku || '',
          qty: 1,
          price: p.current_price != null ? String(p.current_price) : '',
        },
      ]
    })
    setSearch('')
  }

  function addManual() {
    setLines((prev) => [
      ...prev,
      { key: ++uid, productId: null, name: '', sku: '', qty: 1, price: '' },
    ])
  }

  const updateLine = (key, patch) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l.key !== key))

  const total = lines.reduce((s, l) => {
    const v = Number(l.price)
    return s + (Number.isFinite(v) && v > 0 ? v * l.qty : 0)
  }, 0)
  const subtotal = total / (1 + IVA_RATE)
  const iva = total - subtotal

  function items() {
    return lines.map((l) => ({
      name: l.name || '(sin nombre)',
      sku: l.sku || null,
      qty: l.qty,
      price: l.price === '' ? null : Number(l.price),
    }))
  }

  function validate() {
    if (!form.nombre.trim()) {
      setError('El nombre del cliente es obligatorio.')
      return false
    }
    if (lines.length === 0) {
      setError('Agregá al menos un producto o línea.')
      return false
    }
    setError('')
    return true
  }

  async function onPdf() {
    if (!validate()) return
    try {
      await downloadQuotePdf({ form, items: items(), subtotal, iva, total })
    } catch (e) {
      setError('No se pudo generar el PDF: ' + e.message)
    }
  }

  function onWhatsApp() {
    if (!validate()) return
    const digits = form.telefono.replace(/\D/g, '')
    if (!digits) {
      setError('Cargá el teléfono del cliente para enviar por WhatsApp.')
      return
    }
    const to = digits.length === 10 ? '52' + digits : digits
    const msg = [
      `*Cotización — Nitro Garage*`,
      `Cliente: ${form.nombre}`,
      form.vehiculo ? `Vehículo: ${form.vehiculo}` : null,
      '',
      ...items().map(
        (i) =>
          `• ${i.qty} x ${i.name}${i.sku ? ` (${i.sku})` : ''}` +
          (i.price != null ? ` — ${formatPrice(i.price * i.qty)}` : ' — a consultar')
      ),
      `\n*Total:* ${formatPrice(total)} (IVA incl.)`,
      form.notas ? `\nNotas: ${form.notas}` : null,
    ]
      .filter((l) => l !== null)
      .join('\n')
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
  }

  async function onSave() {
    if (!validate()) return
    setSaving(true)
    try {
      await api.createQuote({
        customer_name: form.nombre,
        phone: form.telefono || null,
        email: form.email || null,
        vehicle: form.vehiculo || null,
        notes: form.notas || null,
        items: items(),
        total,
      })
      setSaved(true)
    } catch (e) {
      setError('No se pudo guardar: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="admin-head">
        <h1 className="display">Armar cotización</h1>
        <span className="muted">Para clientes que llaman o llegan al mostrador</span>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}
      {saved && (
        <div className="success-box" style={{ marginBottom: 16 }}>
          <Icon name="check-circle" size={15} /> Cotización guardada en el listado.
        </div>
      )}

      <div className="qb-grid">
        <div>
          {/* Buscador de productos */}
          <div className="card" style={{ padding: '1.1rem', position: 'relative' }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Agregar producto</label>
              <input
                type="search"
                placeholder="Buscar por nombre o SKU…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {matches.length > 0 && (
              <div className="qb-results">
                {matches.map((p) => (
                  <button key={p.id} type="button" className="qb-result" onClick={() => addProduct(p)}>
                    <span className="qb-result-thumb">
                      {p.image_url ? <img src={p.image_url} alt="" /> : <Icon name="tool" size={16} />}
                    </span>
                    <span className="qb-result-info">
                      <strong>{p.name}</strong>
                      <span className="product-sku">{p.sku || '—'}</span>
                    </span>
                    <span className="qb-result-price">
                      {p.current_price != null ? formatPrice(p.current_price) : 'Sin precio'}
                    </span>
                    <Icon name="plus" size={16} />
                  </button>
                ))}
              </div>
            )}
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={addManual}>
              <Icon name="plus" size={15} /> Línea manual (envío, instalación…)
            </button>
          </div>

          {/* Líneas */}
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style={{ width: 80 }}>Cant.</th>
                  <th style={{ width: 120 }}>Unitario</th>
                  <th style={{ width: 110 }}>Importe</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted" style={{ padding: '1rem' }}>
                      Buscá y agregá productos para armar la cotización.
                    </td>
                  </tr>
                ) : (
                  lines.map((l) => {
                    const v = Number(l.price)
                    const imp = Number.isFinite(v) && v > 0 ? v * l.qty : null
                    return (
                      <tr key={l.key}>
                        <td>
                          {l.productId ? (
                            <div>
                              <div>{l.name}</div>
                              {l.sku && <span className="product-sku">{l.sku}</span>}
                            </div>
                          ) : (
                            <input
                              placeholder="Concepto (ej. Instalación)"
                              value={l.name}
                              onChange={(e) => updateLine(l.key, { name: e.target.value })}
                              style={{ padding: '0.35rem 0.5rem' }}
                            />
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={l.qty}
                            onChange={(e) => updateLine(l.key, { qty: Math.max(1, Number(e.target.value) || 1) })}
                            style={{ width: 64, padding: '0.35rem 0.5rem' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Precio"
                            value={l.price}
                            onChange={(e) => updateLine(l.key, { price: e.target.value })}
                            style={{ width: 100, padding: '0.35rem 0.5rem' }}
                          />
                        </td>
                        <td>{imp != null ? formatPrice(imp) : '—'}</td>
                        <td>
                          <button className="icon-btn" onClick={() => removeLine(l.key)} title="Quitar" aria-label="Quitar">
                            <Icon name="trash" size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {lines.length > 0 && (
            <div className="qb-totals">
              <div><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
              <div><span>IVA (16%)</span><strong>{formatPrice(iva)}</strong></div>
              <div className="qb-total"><span>Total</span><strong>{formatPrice(total)}</strong></div>
            </div>
          )}
        </div>

        {/* Datos del cliente + acciones */}
        <div className="card qb-customer" style={{ padding: '1.2rem' }}>
          <h3 style={{ marginTop: 0 }}>Datos del cliente</h3>
          <div className="field">
            <label>Nombre *</label>
            <input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} />
          </div>
          <div className="field">
            <label>Teléfono</label>
            <input value={form.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="10 dígitos" />
          </div>
          <div className="field">
            <label>Email</label>
            <input value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="field">
            <label>Vehículo</label>
            <input value={form.vehiculo} onChange={(e) => set('vehiculo', e.target.value)} placeholder="Ej. Ford Ranger 2022" />
          </div>
          <div className="field">
            <label>Notas</label>
            <textarea rows={2} value={form.notas} onChange={(e) => set('notas', e.target.value)} />
          </div>

          <div className="qb-actions">
            <button className="btn btn-primary" onClick={onPdf}>
              <Icon name="download" size={17} /> Descargar PDF
            </button>
            <button className="btn btn-whatsapp" onClick={onWhatsApp}>
              <Icon name="whatsapp" size={18} /> Enviar al cliente
            </button>
            <button className="btn btn-ice" onClick={onSave} disabled={saving}>
              {saving ? 'Guardando…' : (<><Icon name="save" size={17} /> Guardar</>)}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
