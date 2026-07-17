import { useState } from 'react'
import { api } from '../../api.js'
import ImagePicker from '../../components/ImagePicker.jsx'

// Catálogo incluido en el repo (client/public/catalogos/), para no tener
// que subirlo manualmente cada vez desde el equipo del admin.
const REPO_CATALOGS = [
  { label: 'Off-Road / Portaequipajes 2025', url: '/catalogos/off-road-portaequipajes-2025.pdf' },
]

export default function ImportPdf() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null) // { count, pages, products, pageImages }
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingRepo, setLoadingRepo] = useState(false)
  const [pickerRow, setPickerRow] = useState(null) // índice de fila con el selector abierto

  async function processFile(pdfFile) {
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const data = await api.importPdf(pdfFile)
      setPreview(data)
      setRows(data.products.map((p) => ({ ...p, include: true, image_url: null })))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function onUpload(e) {
    e.preventDefault()
    if (!file) return
    processFile(file)
  }

  async function loadFromRepo(catalog) {
    setError('')
    setResult(null)
    setLoadingRepo(true)
    try {
      // La Function descarga el PDF por su cuenta (no lo reenviamos: así
      // evitamos el límite de tamaño del cuerpo de las Vercel Functions).
      const data = await api.importPdfFromUrl(catalog.url)
      setPreview(data)
      setRows(data.products.map((p) => ({ ...p, include: true, image_url: null })))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingRepo(false)
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
        <>
          {REPO_CATALOGS.length > 0 && (
            <div className="card" style={{ padding: '1.5rem', maxWidth: 560, marginBottom: '1.25rem' }}>
              <p className="muted" style={{ marginTop: 0 }}>
                Catálogos ya disponibles en el repositorio (sin necesidad de subir el archivo):
              </p>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                {REPO_CATALOGS.map((c) => (
                  <button
                    key={c.url}
                    type="button"
                    className="btn btn-ice btn-sm"
                    disabled={loadingRepo || loading}
                    onClick={() => loadFromRepo(c)}
                  >
                    {loadingRepo ? 'Cargando…' : `📄 ${c.label}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form className="card" style={{ padding: '1.5rem', maxWidth: 560 }} onSubmit={onUpload}>
            <p className="muted" style={{ marginTop: 0 }}>
              O subí otro catálogo en PDF desde tu equipo. Se extraen los productos
              (sin precio) y cada página se guarda como imagen en Cloudinary para
              que puedas asignarla.
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
        </>
      )}

      {preview && (
        <div>
          <div className="admin-head">
            <p className="muted">
              {preview.filename} — {preview.pages} pág.,{' '}
              <strong>{rows.length}</strong> producto(s) detectado(s). Usá el
              botón <em>Elegir</em> de cada fila para asignarle una foto del
              catálogo.
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
                  <th style={{ width: 150 }}>Imagen</th>
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
                    <td>
                      <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setPickerRow(i)}
                        >
                          {r.image_url ? 'Cambiar' : '🖼️ Elegir'}
                        </button>
                        {r.image_url && (
                          <img
                            src={r.image_url}
                            alt=""
                            style={{ height: 34, width: 34, objectFit: 'cover', borderRadius: 4 }}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ImagePicker
        open={pickerRow !== null}
        label={pickerRow !== null ? rows[pickerRow]?.name : null}
        onClose={() => setPickerRow(null)}
        onSelect={(url) => {
          if (pickerRow !== null) updateRow(pickerRow, 'image_url', url)
        }}
      />
    </>
  )
}
