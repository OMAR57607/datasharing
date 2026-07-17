import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../api.js'

const EMPTY = {
  sku: '',
  name: '',
  description: '',
  category: '',
  brand: '',
  image_url: '',
  active: true,
}

export default function ProductEdit() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

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
          image_url: p.image_url || '',
          active: !!p.active,
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
      if (isNew) await api.createProduct(form)
      else await api.updateProduct(id, form)
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

        <div className="row-2">
          <div className="field">
            <label>Marca</label>
            <input
              value={form.brand}
              onChange={(e) => set('brand', e.target.value)}
            />
          </div>
          <div className="field">
            <label>URL de imagen</label>
            <input
              value={form.image_url}
              onChange={(e) => set('image_url', e.target.value)}
              placeholder="https://…"
            />
          </div>
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
