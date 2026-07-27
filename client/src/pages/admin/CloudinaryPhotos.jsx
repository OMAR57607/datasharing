import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api.js'
import Icon from '../../components/Icon.jsx'

const DEFAULT_FOLDER = 'nitro-garage/productos'
const MAX_GALLERY = 4

// Compara códigos ignorando mayúsculas y separadores: "ACC-001" = "acc 001".
const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

// Nombres que Cloudinary generó solo (subidas sin nombre de archivo):
// 20 caracteres al azar, sin guiones ni espacios. No son códigos.
const looksAuto = (s) => /^[a-z0-9]{16,}$/.test(String(s || ''))

/**
 * Formas de leer el código en el nombre del archivo, de la más literal a la
 * más flexible: el nombre tal cual, sin el sufijo que agrega Cloudinary
 * cuando el nombre ya existía ("ACC-001_h3k9zq") y sin la numeración de las
 * fotos extra del mismo producto ("ACC-001-2", "ACC-001 (1)").
 */
function candidates(name) {
  const base = String(name || '')
    .trim()
    .replace(/\.[a-z0-9]{2,5}$/i, '')
  const list = [base]
  const noSuffix = base.replace(/_[a-z0-9]{6}$/i, '')
  if (noSuffix && noSuffix !== base) list.push(noSuffix)
  const last = list[list.length - 1]
  const noVariant = last.replace(/(?:[\s._-]\d{1,2}|\s*\(\d{1,2}\))$/, '')
  if (noVariant && noVariant !== last) list.push(noVariant)
  return list
}

export default function CloudinaryPhotos() {
  const [folder, setFolder] = useState(DEFAULT_FOLDER)
  const [photos, setPhotos] = useState(null) // null = todavía no se leyó
  const [products, setProducts] = useState([])
  const [sel, setSel] = useState({}) // publicId -> incluir
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [progress, setProgress] = useState(null) // { done, total }

  // Opciones de aplicación.
  const [replace, setReplace] = useState(false)
  const [useApprox, setUseApprox] = useState(true)
  const [createNew, setCreateNew] = useState(true)
  const [publishNew, setPublishNew] = useState(false)
  const [newCategory, setNewCategory] = useState('')

  useEffect(() => {
    api.listProducts({ includeInactive: 1 }).then(setProducts).catch((e) => setError(e.message))
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const [data, prods] = await Promise.all([
        api.listCloudinaryPhotos(folder),
        api.listProducts({ includeInactive: 1 }),
      ])
      setProducts(prods)
      setPhotos(data.photos)
      // Por defecto entran todas menos las que no tienen nombre propio.
      setSel(Object.fromEntries(data.photos.map((p) => [p.publicId, !looksAuto(p.name)])))
      if (data.photos.length === 0) {
        setError(`La carpeta "${data.folder}" no tiene imágenes (o no existe).`)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Cruza cada foto con el producto cuyo SKU coincide con el nombre.
  const rows = useMemo(() => {
    if (!photos) return []
    const bySku = new Map()
    for (const p of products) if (p.sku) bySku.set(norm(p.sku), p)
    return photos.map((ph) => {
      const list = candidates(ph.name)
      const exact = bySku.get(norm(list[0])) || null
      let variant = null
      for (let i = 1; i < list.length && !variant; i++) variant = bySku.get(norm(list[i])) || null
      return {
        ...ph,
        code: list[0],
        product: exact || (useApprox ? variant : null),
        approx: !exact && !!variant,
        auto: looksAuto(ph.name),
      }
    })
  }, [photos, products, useApprox])

  const shown = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        (r.product?.name || '').toLowerCase().includes(s) ||
        (r.product?.sku || '').toLowerCase().includes(s)
    )
  }, [rows, search])

  // Arma el plan: qué producto se actualiza y cuál se crea.
  const plan = useMemo(() => {
    const updates = []
    const creates = []
    let unchanged = 0
    const byProduct = new Map()
    const byNewCode = new Map()

    for (const r of rows) {
      if (!sel[r.publicId]) continue
      if (r.product) {
        const entry = byProduct.get(r.product.id) || { product: r.product, urls: [] }
        entry.urls.push(r.url)
        byProduct.set(r.product.id, entry)
      } else if (createNew && norm(r.code)) {
        const key = norm(r.code)
        const entry = byNewCode.get(key) || { code: r.code, urls: [] }
        entry.urls.push(r.url)
        byNewCode.set(key, entry)
      }
    }

    for (const { product, urls } of byProduct.values()) {
      const current = Array.isArray(product.images) ? product.images.filter(Boolean) : []
      // "Completar" respeta lo que ya está cargado y suma las nuevas al final;
      // "reemplazar" deja solo las fotos de Cloudinary.
      const base = replace ? [] : current.length ? current : [product.image_url].filter(Boolean)
      const gallery = [...new Set([...base, ...urls])].slice(0, MAX_GALLERY)
      const sameGallery = JSON.stringify(gallery) === JSON.stringify(current)
      if (sameGallery && gallery[0] === product.image_url) {
        unchanged++
        continue
      }
      updates.push({
        id: product.id,
        sku: product.sku,
        name: product.name,
        payload: { image_url: gallery[0], images: gallery },
      })
    }

    for (const { code, urls } of byNewCode.values()) {
      const gallery = [...new Set(urls)].slice(0, MAX_GALLERY)
      creates.push({
        sku: code,
        name: code,
        category: newCategory.trim() || null,
        image_url: gallery[0],
        images: gallery,
        active: publishNew,
      })
    }

    return { updates, creates, unchanged }
  }, [rows, sel, replace, createNew, publishNew, newCategory])

  const stats = useMemo(
    () => ({
      total: rows.length,
      matched: rows.filter((r) => r.product).length,
      approx: rows.filter((r) => r.approx).length,
      nuevos: rows.filter((r) => !r.product && !r.auto).length,
      auto: rows.filter((r) => r.auto).length,
    }),
    [rows]
  )

  function toggle(publicId) {
    setSel((prev) => ({ ...prev, [publicId]: !prev[publicId] }))
  }

  function setAll(value, list = shown) {
    setSel((prev) => {
      const next = { ...prev }
      for (const r of list) next[r.publicId] = value
      return next
    })
  }

  async function apply() {
    const total = plan.updates.length + plan.creates.length
    if (total === 0) return
    setLoading(true)
    setError('')
    setResult(null)
    setProgress({ done: 0, total })
    try {
      const res = await api.applyCloudinaryPhotos(plan, (done, t) => setProgress({ done, total: t }))
      setResult(res)
      // Relee los productos para reflejar el estado real tras aplicar.
      setProducts(await api.listProducts({ includeInactive: 1 }))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  return (
    <>
      <div className="admin-head">
        <h1 className="display">Fotos desde Cloudinary</h1>
        {photos && (
          <span className="muted">
            {stats.total} foto(s) · {stats.matched} con producto · {stats.nuevos} sin producto
          </span>
        )}
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}
      {result && (
        <div className="success-box" style={{ marginBottom: 16 }}>
          <Icon name="check-circle" size={15} /> {result.updated} producto(s) actualizado(s) y{' '}
          {result.created} creado(s).
          {result.errors.length > 0 && ` ${result.errors.length} con error: ${result.errors[0]}`}
        </div>
      )}

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <p className="muted" style={{ marginTop: 0 }}>
          Lee una carpeta del Media Library de Cloudinary y cruza cada imagen con
          el producto cuyo <strong>SKU es igual al nombre del archivo</strong>. Las
          que no coincidan con ningún producto se pueden dar de alta con ese código.
        </p>
        <div className="row" style={{ alignItems: 'end', flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '1 1 280px', marginBottom: 0 }}>
            <label>Carpeta</label>
            <input
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder={DEFAULT_FOLDER}
            />
          </div>
          <button className="btn btn-primary" onClick={load} disabled={loading || !folder.trim()}>
            {loading ? 'Leyendo…' : (
              <>
                <Icon name="cloud" size={16} /> {photos ? 'Releer carpeta' : 'Leer carpeta'}
              </>
            )}
          </button>
        </div>
      </div>

      {photos && rows.length > 0 && (
        <>
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
            <strong style={{ display: 'block', marginBottom: '0.7rem' }}>Qué hacer con las fotos</strong>
            <label className="row" style={{ gap: 8, textTransform: 'none', marginBottom: 6 }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={replace}
                onChange={(e) => setReplace(e.target.checked)}
              />
              Reemplazar las fotos que ya tenga el producto (si no, se agregan a la
              galería, hasta {MAX_GALLERY})
            </label>
            <label className="row" style={{ gap: 8, textTransform: 'none', marginBottom: 6 }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={useApprox}
                onChange={(e) => setUseApprox(e.target.checked)}
              />
              Aceptar variantes del código ({stats.approx} coincidencia(s) del tipo{' '}
              <code>ACC-001-2</code> → <code>ACC-001</code>)
            </label>
            <label className="row" style={{ gap: 8, textTransform: 'none', marginBottom: 6 }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={createNew}
                onChange={(e) => setCreateNew(e.target.checked)}
              />
              Crear los productos que no existen, usando el nombre del archivo como
              SKU y nombre
            </label>
            {createNew && (
              <div className="row" style={{ alignItems: 'end', flexWrap: 'wrap', marginTop: 10 }}>
                <div className="field" style={{ maxWidth: 240, marginBottom: 0 }}>
                  <label>Categoría para los nuevos (opcional)</label>
                  <input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Sin categoría"
                  />
                </div>
                <label className="row" style={{ gap: 8, textTransform: 'none' }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={publishNew}
                    onChange={(e) => setPublishNew(e.target.checked)}
                  />
                  Publicarlos ya en la tienda (si no, quedan inactivos para
                  completarles nombre y precio)
                </label>
              </div>
            )}
          </div>

          <div className="filters">
            <input
              type="search"
              placeholder="Buscar archivo, producto o SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setAll(true)}>
                Marcar todo
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setAll(false)}>
                Desmarcar
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }} aria-label="Incluir">
                    <Icon name="check" size={14} />
                  </th>
                  <th style={{ width: 52 }}></th>
                  <th>Archivo (código)</th>
                  <th>Producto</th>
                  <th style={{ width: 180 }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.publicId} style={{ opacity: sel[r.publicId] ? 1 : 0.5 }}>
                    <td>
                      <input
                        type="checkbox"
                        style={{ width: 'auto' }}
                        checked={!!sel[r.publicId]}
                        onChange={() => toggle(r.publicId)}
                      />
                    </td>
                    <td>
                      <div className="admin-thumb">
                        <img src={r.url} alt="" loading="lazy" />
                      </div>
                    </td>
                    <td>
                      <span className="product-sku">{r.name}</span>
                      {r.approx && (
                        <span className="badge badge-off" style={{ marginLeft: 6 }}>
                          variante
                        </span>
                      )}
                      {r.auto && (
                        <span className="badge badge-off" style={{ marginLeft: 6 }}>
                          sin código
                        </span>
                      )}
                    </td>
                    <td>
                      {r.product ? (
                        <>
                          {r.product.name}
                          {!r.product.active && (
                            <span className="badge badge-off" style={{ marginLeft: 6 }}>
                              inactivo
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="muted">— sin producto —</span>
                      )}
                    </td>
                    <td>
                      {!sel[r.publicId] ? (
                        <span className="muted">Se omite</span>
                      ) : r.product ? (
                        <span className="badge badge-cat">
                          {r.product.image_url && !replace ? 'Suma a galería' : 'Pone la foto'}
                        </span>
                      ) : createNew ? (
                        <span className="badge badge-cat">Crea producto</span>
                      ) : (
                        <span className="muted">Se omite</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="row" style={{ marginTop: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={apply}
              disabled={loading || plan.updates.length + plan.creates.length === 0}
            >
              {progress
                ? `Aplicando… ${progress.done}/${progress.total}`
                : `Aplicar (${plan.updates.length} actualizar · ${plan.creates.length} crear)`}
            </button>
            {plan.unchanged > 0 && (
              <span className="muted">{plan.unchanged} ya tenían esa misma foto</span>
            )}
          </div>
        </>
      )}
    </>
  )
}
