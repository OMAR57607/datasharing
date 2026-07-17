import { useState } from 'react'
import { api } from '../../api.js'

export default function ImportPdf() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null) // { count, pages, products, pageImages }
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const pageImages = preview?.pageImages || []

  async function onUpload(e) {
    e.preventDefault()
    if (!file) return
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const data = await api.importPdf(file)
      setPreview(data)
      setRows(data.products.map((p) => ({ ...p, include: true, image_url: null })))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function updateRow(i, key, value) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)))
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
            Subí un catálogo en PDF. Se extraen los productos (sin precio) y cada
            página se guarda como imagen en Cloudinary para que puedas asignarla.
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
              {preview.filename} — {preview.pages} pág.,{' '}
              <strong>{rows.length}</strong> producto(s) detectado(s).
              {pageImages.length > 0
                ? ` ${pageImages.length} imagen(es) de página disponibles.`
                : ' (Sin imágenes: configurá Cloudinary para habilitarlas.)'}
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
                {loading ? 'Importando…' : 'Importar seleccionados'}
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
                  <th style={{ width: 150 }}>Categoría</th>
                  {pageImages.length > 0 && <th style={{ width: 130 }}>Imagen</th>}
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
                    {pageImages.length > 0 && (
                      <td>
                        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                          <select
                            style={{ padding: '0.35rem 0.4rem' }}
                            value={r.image_url || ''}
                            onChange={(e) => updateRow(i, 'image_url', e.target.value || null)}
                          >
                            <option value="">—</option>
                            {pageImages.map((pi) => (
                              <option key={pi.page} value={pi.url}>
                                Pág. {pi.page}
                              </option>
                            ))}
                          </select>
                          {r.image_url && (
                            <img
                              src={r.image_url}
                              alt=""
                              style={{ height: 34, width: 34, objectFit: 'cover', borderRadius: 4 }}
                            />
                          )}
                        </div>
                      </td>
                    )}
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
