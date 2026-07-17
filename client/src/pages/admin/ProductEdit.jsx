import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../api.js'
import ImagePicker from '../../components/ImagePicker.jsx'

const MAX_IMAGES = 4

const EMPTY = {
  sku: '',
  name: '',
  description: '',
  category: '',
  brand: '',
  images: [],
  compatible_vehicles: '',
  year_from: '',
  year_to: '',
  dimensions: '',
  material: '',
  specs: '',
  active: true,
  featured: false,
}

export default function ProductEdit() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  // ---- Galería (hasta 4 fotos) ----
  function addImage(url) {
    if (!url) return
    setForm((prev) => {
      if (prev.images.length >= MAX_IMAGES || prev.images.includes(url)) return prev
      return { ...prev, images: [...prev.images, url] }
    })
  }
  function removeImage(idx) {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))
  }
  function makeCover(idx) {
    setForm((prev) => {
      const next = [...prev.images]
      const [pick] = next.splice(idx, 1)
      return { ...prev, images: [pick, ...next] }
    })
  }

  async function onImageFile(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setError('')
    setUploading(true)
    try {
      let count = form.images.length
      for (const f of files) {
        // Respeta el máximo aunque se elijan varios archivos a la vez.
        if (count >= MAX_IMAGES) break
        const { url } = await api.uploadImage(f)
        addImage(url)
        count++
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    if (isNew) return
    api
      .getProduct(id)
      .then((p) =>
        setForm({
          sku: p.sku || '',
          name: p.name || '',
          description: p.description || '',
          category: p.category || '',
          brand: p.brand || '',
          // Galería nueva; si el producto es viejo (solo image_url), lo migra en vivo.
          images: Array.isArray(p.images) && p.images.length
            ? p.images
            : p.image_url
              ? [p.image_url]
              : [],
          compatible_vehicles: p.compatible_vehicles || '',
          year_from: p.year_from ?? '',
          year_to: p.year_to ?? '',
          dimensions: p.dimensions || '',
          material: p.material || '',
          specs: p.specs || '',
          active: !!p.active,
          featured: !!p.featured,
        })
      )
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, isNew])

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      // Las fotos del catálogo del repo se suben a Cloudinary; las demás se dejan igual.
      const images = (
        await Promise.all(form.images.map((u) => api.cloudinaryFromRepo(u)))
      ).filter(Boolean)
      const payload = {
        ...form,
        images,
        image_url: images[0] || null, // portada = primera foto (compatibilidad)
        year_from: form.year_from === '' ? null : Number(form.year_from),
        year_to: form.year_to === '' ? null : Number(form.year_to),
      }
      if (isNew) await api.createProduct(payload)
      else await api.updateProduct(id, payload)
      navigate('/admin/productos')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading">Cargando…</div>

  return (
    <>
      <div className="admin-head">
        <h1 className="display">
          {isNew ? 'Nuevo producto' : 'Editar producto'}
        </h1>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

      <form
        className="card"
        style={{ padding: '1.5rem', maxWidth: 640 }}
        onSubmit={onSubmit}
      >
        <div className="row-2">
          <div className="field">
            <label>SKU / Código</label>
            <input value={form.sku} onChange={(e) => set('sku', e.target.value)} />
          </div>
          <div className="field">
            <label>Categoría</label>
            <input
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              placeholder="Iluminación, Interior…"
            />
          </div>
        </div>

        <div className="field">
          <label>Nombre *</label>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label>Descripción</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>

        <div className="field">
          <label>Marca</label>
          <input
            value={form.brand}
            onChange={(e) => set('brand', e.target.value)}
          />
        </div>

        <div className="field">
          <label>Fotos del producto ({form.images.length}/{MAX_IMAGES})</label>
          <p className="muted" style={{ fontSize: '0.8rem', margin: '0 0 0.6rem' }}>
            Podés agregar hasta {MAX_IMAGES} fotos. La primera es la portada (la
            que se ve en el catálogo).
          </p>

          {form.images.length > 0 && (
            <div className="img-manager">
              {form.images.map((url, idx) => (
                <div className="img-slot" key={url}>
                  <img src={url} alt="" />
                  {idx === 0 && <span className="img-cover-tag">Portada</span>}
                  <button
                    type="button"
                    className="img-remove"
                    title="Quitar foto"
                    onClick={() => removeImage(idx)}
                  >
                    ✕
                  </button>
                  {idx !== 0 && (
                    <button
                      type="button"
                      className="img-cover-btn"
                      title="Usar como portada"
                      onClick={() => makeCover(idx)}
                    >
                      ★ Portada
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {form.images.length < MAX_IMAGES ? (
            <div className="row" style={{ gap: 10, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-ice btn-sm"
                onClick={() => setPickerOpen(true)}
              >
                🖼️ Del catálogo
              </button>
              <label className="btn btn-ghost btn-sm" style={{ cursor: uploading ? 'default' : 'pointer' }}>
                📁 Subir archivo
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  multiple
                  style={{ display: 'none' }}
                  onChange={onImageFile}
                  disabled={uploading}
                />
              </label>
              {uploading && <span className="muted">Subiendo…</span>}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
              Llegaste al máximo de {MAX_IMAGES} fotos. Quitá una para agregar otra.
            </p>
          )}
        </div>

        <ImagePicker
          open={pickerOpen}
          label={form.name}
          onClose={() => setPickerOpen(false)}
          onSelect={(url) => addImage(url)}
        />

        <h3 className="field-group-title">Ficha técnica</h3>

        <div className="field">
          <label>Vehículos compatibles</label>
          <input
            value={form.compatible_vehicles}
            onChange={(e) => set('compatible_vehicles', e.target.value)}
            placeholder="Ej: Toyota Hilux, Ford Ranger, Nissan Frontier"
          />
        </div>

        <div className="row-2">
          <div className="field">
            <label>Año desde</label>
            <input
              type="number"
              value={form.year_from}
              onChange={(e) => set('year_from', e.target.value)}
              placeholder="Ej: 2015"
            />
          </div>
          <div className="field">
            <label>Año hasta</label>
            <input
              type="number"
              value={form.year_to}
              onChange={(e) => set('year_to', e.target.value)}
              placeholder="Ej: 2023 (vacío = mismo año)"
            />
          </div>
        </div>

        <div className="row-2">
          <div className="field">
            <label>Medidas</label>
            <input
              value={form.dimensions}
              onChange={(e) => set('dimensions', e.target.value)}
              placeholder="Ej: 120 x 90 x 15 cm"
            />
          </div>
          <div className="field">
            <label>Material</label>
            <input
              value={form.material}
              onChange={(e) => set('material', e.target.value)}
              placeholder="Ej: Aluminio, Acero inoxidable"
            />
          </div>
        </div>

        <div className="field">
          <label>Especificaciones adicionales</label>
          <textarea
            rows={2}
            value={form.specs}
            onChange={(e) => set('specs', e.target.value)}
            placeholder="Capacidad de carga, color, garantía, etc."
          />
        </div>

        <div className="field">
          <label className="row" style={{ gap: 8, textTransform: 'none' }}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={form.active}
              onChange={(e) => set('active', e.target.checked)}
            />
            Producto activo (visible en la tienda)
          </label>
          <label className="row" style={{ gap: 8, textTransform: 'none', marginTop: 8 }}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={form.featured}
              onChange={(e) => set('featured', e.target.checked)}
            />
            ⭐ Fijar arriba en "más solicitados" (opcional)
          </label>
          <p className="muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>
            El ranking de "más solicitados" es automático: se calcula solo,
            según las veces que los clientes ven cada producto en la tienda.
            Esta casilla es opcional y solo sirve para forzar un producto
            arriba del ranking (por ejemplo, para promocionar algo nuevo).
          </p>
        </div>

        <div className="row" style={{ marginTop: '0.5rem' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate('/admin/productos')}
          >
            Cancelar
          </button>
        </div>
        <p className="muted" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
          El precio se carga desde el listado de productos o la sección de carga
          de precios.
        </p>
      </form>
    </>
  )
}
