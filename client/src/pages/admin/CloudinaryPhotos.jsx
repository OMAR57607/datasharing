import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api.js'
import Icon from '../../components/Icon.jsx'

const DEFAULT_FOLDER = 'nitro-garage/productos'
const MAX_GALLERY = 4

// El nombre del archivo ES el SKU: es la fuente de la verdad. `norm` solo se
// usa para encontrar al producto cuando en la base quedó escrito distinto
// ("acc 001" contra "ACC-001") y poder corregirlo.
const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

// Nombres que Cloudinary generó solo (subidas sin nombre de archivo):
// 20 caracteres al azar, sin guiones ni espacios. No son códigos.
const looksAuto = (s) => /^[a-z0-9]{16,}$/.test(String(s || ''))

/**
 * Códigos a probar para una imagen, del más literal al más flexible:
 *  · `exacto`   — el nombre del archivo tal cual.
 *  · `sufijo`   — sin el sufijo aleatorio que agrega Cloudinary al subir
 *                 ("XBARRAV4_pbgioe" → "XBARRAV4"): lo pone el sistema, no vos,
 *                 así que no es parte del SKU. Siempre son 6 caracteres en
 *                 minúscula, por eso la búsqueda distingue mayúsculas.
 *  · `variante` — sin la numeración de las fotos extra ("ACC-001-2"), que
 *                 solo aplica si esa numeración la escribiste vos.
 *
 * El último de la lista es el SKU autoritativo del archivo: el que se usa
 * para dar de alta el producto si el código todavía no existe.
 */
function candidates(name, { dropSuffix, dropVariant }) {
  const base = String(name || '')
    .trim()
    .replace(/\.[a-z0-9]{2,5}$/i, '')
  const list = [{ code: base, kind: 'exacto' }]
  if (dropSuffix) {
    const noSuffix = base.replace(/_[a-z0-9]{6}$/, '')
    if (noSuffix && noSuffix !== base) list.push({ code: noSuffix, kind: 'sufijo' })
  }
  if (dropVariant) {
    const last = list[list.length - 1].code
    const noVariant = last.replace(/(?:[\s._-]\d{1,2}|\s*\(\d{1,2}\))$/, '')
    if (noVariant && noVariant !== last) list.push({ code: noVariant, kind: 'variante' })
  }
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
  const [dropSuffix, setDropSuffix] = useState(true)
  const [dropVariant, setDropVariant] = useState(false)
  const [fixSku, setFixSku] = useState(true)
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

  // Cruza cada foto con su producto. Primero busca el SKU idéntico; si no
  // aparece, lo busca ignorando mayúsculas y separadores: ahí el producto es
  // el mismo pero tiene el SKU mal escrito en la base.
  const rows = useMemo(() => {
    if (!photos) return []
    const byExact = new Map()
    const byNorm = new Map()
    for (const p of products) {
      if (!p.sku) continue
      byExact.set(p.sku.trim(), p)
      if (!byNorm.has(norm(p.sku))) byNorm.set(norm(p.sku), p)
    }

    return photos.map((ph) => {
      const list = candidates(ph.name, { dropSuffix, dropVariant })
      const base = list[0].code
      // El SKU del archivo es el último candidato: ya sin el sufijo que puso
      // Cloudinary (y sin la numeración, si la tratás como foto extra).
      const sku = list[list.length - 1].code.trim()
      let product = null
      let via = null
      let skuFix = null // SKU que debería tener el producto según el archivo

      for (const c of list) {
        // Si el SKU de la base coincide letra por letra, no hay nada que corregir.
        const exact = byExact.get(c.code.trim())
        if (exact) {
          product = exact
          via = c.kind
          break
        }
        // Si aparece ignorando mayúsculas y separadores, es el mismo producto
        // con el SKU mal escrito en la base: manda el archivo.
        const soft = byNorm.get(norm(c.code))
        if (soft) {
          product = soft
          via = c.kind
          skuFix = c.code.trim()
          break
        }
      }

      return { ...ph, base, sku, product, via, skuFix, auto: looksAuto(ph.name) }
    })
  }, [photos, products, dropSuffix, dropVariant])

  const shown = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.sku.toLowerCase().includes(s) ||
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
        const entry = byProduct.get(r.product.id) || { product: r.product, urls: [], skuFix: null }
        entry.urls.push(r.url)
        if (!entry.skuFix && r.skuFix) entry.skuFix = r.skuFix
        byProduct.set(r.product.id, entry)
      } else if (createNew && r.sku) {
        // El nombre del archivo es el SKU (sin el sufijo de Cloudinary).
        const key = r.sku
        const entry = byNewCode.get(key) || { code: key, urls: [] }
        entry.urls.push(r.url)
        byNewCode.set(key, entry)
      }
    }

    for (const { product, urls, skuFix } of byProduct.values()) {
      const current = Array.isArray(product.images) ? product.images.filter(Boolean) : []
      // "Completar" respeta lo que ya está cargado y suma las nuevas al final;
      // "reemplazar" deja solo las fotos de Cloudinary.
      const base = replace ? [] : current.length ? current : [product.image_url].filter(Boolean)
      const gallery = [...new Set([...base, ...urls])].slice(0, MAX_GALLERY)
      const payload = { image_url: gallery[0], images: gallery }
      if (fixSku && skuFix && skuFix !== product.sku) payload.sku = skuFix

      const samePhotos =
        JSON.stringify(gallery) === JSON.stringify(current) && gallery[0] === product.image_url
      if (samePhotos && !payload.sku) {
        unchanged++
        continue
      }
      updates.push({
        id: product.id,
        sku: product.sku,
        name: product.name,
        newSku: payload.sku || null,
        payload,
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
  }, [rows, sel, replace, fixSku, createNew, publishNew, newCategory])

  const stats = useMemo(
    () => ({
      total: rows.length,
      matched: rows.filter((r) => r.product).length,
      fixables: rows.filter((r) => r.skuFix && r.skuFix !== r.product?.sku).length,
      conSufijo: rows.filter((r) => r.sku !== r.base).length,
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
          Lee una carpeta del Media Library de Cloudinary tomando el{' '}
          <strong>nombre de cada archivo como el SKU del producto</strong>. Si el
          código no existe en la base, se puede dar de alta con ese SKU; si existe
          pero está escrito distinto, se corrige en la base.
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
                checked={fixSku}
                onChange={(e) => setFixSku(e.target.checked)}
              />
              Corregir en la base los SKU escritos distinto al archivo (
              {stats.fixables} caso(s): <code>acc 001</code> → <code>ACC-001</code>)
            </label>
            <label className="row" style={{ gap: 8, textTransform: 'none', marginBottom: 6 }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={dropSuffix}
                onChange={(e) => setDropSuffix(e.target.checked)}
              />
              Ignorar el sufijo aleatorio que agrega Cloudinary al subir (
              <code>XBARRAV4_pbgioe</code> → <code>XBARRAV4</code>) — {stats.conSufijo}{' '}
              archivo(s) lo tienen
            </label>
            <label className="row" style={{ gap: 8, textTransform: 'none', marginBottom: 6 }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={dropVariant}
                onChange={(e) => setDropVariant(e.target.checked)}
              />
              Tratar <code>ACC-001-2</code> como foto extra de <code>ACC-001</code> (si
              no, es un SKU distinto)
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
                  <th>Archivo (SKU)</th>
                  <th>Producto</th>
                  <th style={{ width: 190 }}>Acción</th>
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
                      {r.via === 'variante' && (
                        <span className="badge badge-off" style={{ marginLeft: 6 }}>
                          foto extra
                        </span>
                      )}
                      {r.auto && (
                        <span className="badge badge-off" style={{ marginLeft: 6 }}>
                          sin código
                        </span>
                      )}
                      {r.sku !== r.base && (
                        <div className="muted" style={{ fontSize: '0.8rem' }}>
                          SKU: <code>{r.sku}</code>
                        </div>
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
                          {fixSku && r.skuFix && r.skuFix !== r.product.sku && (
                            <div className="muted" style={{ fontSize: '0.8rem' }}>
                              SKU: <code>{r.product.sku}</code> → <code>{r.skuFix}</code>
                            </div>
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
              <span className="muted">{plan.unchanged} ya estaban al día</span>
            )}
          </div>
        </>
      )}
    </>
  )
}
