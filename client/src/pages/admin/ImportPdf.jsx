import { useState } from 'react'
import { api } from '../../api.js'

export default function ImportPdf() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null) // { count, pages, products }
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function onUpload(e) {
    e.preventDefault()
    if (!file) return
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const data = await api.importPdf(file)
      setPreview(data)
      setRows(data.products.map((p) => ({ ...p, include: true })))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function updateRow(i, key, value) {
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r))
    )
  }

  async function onConfirm() {
    const selected = rows
      .filter((r) => r.include && r.name.trim())
      .map(({ include, ...p }) => p)
    if (selected.length === 0) {
      setError('Seleccioná al menos un producto válido.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await api.confirmImport(selected)
      setResult(res)
      setPreview(null)
      setRows([])
      setFile(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="admin-head">
        <h1 className="display">Importar productos desde PDF</h1>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}
      {result && (
        <div className="success-box" style={{ marginBottom: 16 }}>
          ✓ {result.imported} producto(s) importado(s).
          {result.skipped.length > 0 &&
            ` ${result.skipped.length} omitido(s) por SKU duplicado.`}
        </div>
      )}

      {!preview && (
        <form className="card" style={{ padding: '1.5rem', maxWidth: 560 }} onSubmit={onUpload}>
          <p className="muted" style={{ marginTop: 0 }}>
            Subí un catálogo en PDF. El sistema extraerá los productos (sin
            precio) para que los revises antes de guardarlos.
          </p>
          <div className="field">
            <label>Archivo PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files[0] || null)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={!file || loading}>
            {loading ? 'Procesando…' : 'Analizar PDF'}
          </button>
        </form>
      )}

      {preview && (
        <div>
          <div className="admin-head">
            <p className="muted">
              {preview.filename} — {preview.pages} página(s),{' '}
              <strong>{rows.length}</strong> candidato(s) detectado(s). Revisá y
              editá antes de importar.
            </p>
            <div className="row">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setPreview(null)
                  setRows([])
                }}
              >
                Cancelar
              </button>
              <button className="btn btn-primary btn-sm" onClick={onConfirm} disabled={loading}>
                {loading ? 'Importando…' : `Importar seleccionados`}
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>✓</th>
                  <th style={{ width: 140 }}>SKU</th>
                  <th>Nombre</th>
                  <th style={{ width: 160 }}>Categoría</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ opacity: r.include ? 1 : 0.5 }}>
                    <td>
                      <input
                        type="checkbox"
                        style={{ width: 'auto' }}
                        checked={r.include}
                        onChange={(e) => updateRow(i, 'include', e.target.checked)}
                      />
                    </td>
                    <td>
                      <input
                        style={{ padding: '0.35rem 0.5rem' }}
                        value={r.sku || ''}
                        onChange={(e) => updateRow(i, 'sku', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={{ padding: '0.35rem 0.5rem' }}
                        value={r.name}
                        onChange={(e) => updateRow(i, 'name', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        style={{ padding: '0.35rem 0.5rem' }}
                        value={r.category || ''}
                        onChange={(e) => updateRow(i, 'category', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
