import { useState } from 'react'
import { api } from '../../api.js'

// Carga masiva de precios pegando líneas "SKU precio" o "SKU,precio".
export default function BulkPrices() {
  const [text, setText] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function parse(raw) {
    return raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,;\t]|\s{2,}|\s+/).filter(Boolean)
        const price = parts.pop()
        const sku = parts.join(' ')
        return { sku, price }
      })
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    const items = parse(text)
    if (items.length === 0) {
      setError('Ingresá al menos una línea con SKU y precio.')
      return
    }
    setLoading(true)
    try {
      const res = await api.bulkPrices(items, currency)
      setResult(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="admin-head">
        <h1 className="display">Carga masiva de precios</h1>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}
      {result && (
        <div className="success-box" style={{ marginBottom: 16 }}>
          ✓ {result.updated.length} precio(s) actualizado(s).
          {result.notFound.length > 0 &&
            ` No encontrados: ${result.notFound.join(', ')}.`}
          {result.invalid.length > 0 &&
            ` ${result.invalid.length} línea(s) inválida(s).`}
        </div>
      )}

      <form className="card" style={{ padding: '1.5rem', maxWidth: 640 }} onSubmit={onSubmit}>
        <p className="muted" style={{ marginTop: 0 }}>
          Pegá una línea por producto con el formato{' '}
          <code>SKU precio</code> (también acepta coma o tabulación). Ejemplo:
        </p>
        <pre
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '0.7rem',
            fontSize: '0.85rem',
            color: 'var(--text-dim)',
          }}
        >
{`ACC-001, 24.99
ACC-003, 45.00
ACC-005, 18.50`}
        </pre>

        <div className="field">
          <label>Precios</label>
          <textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="SKU precio…"
          />
        </div>

        <div className="row" style={{ alignItems: 'end' }}>
          <div className="field" style={{ maxWidth: 140, marginBottom: 0 }}>
            <label>Moneda</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option>USD</option>
              <option>ARS</option>
              <option>MXN</option>
              <option>EUR</option>
              <option>COP</option>
              <option>CLP</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Cargando…' : 'Aplicar precios'}
          </button>
        </div>
      </form>
    </>
  )
}
