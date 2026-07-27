import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api.js'
import { isLegacyPhoto } from '../../lib/photos.js'
import Icon from '../../components/Icon.jsx'

const DEFAULT_FOLDER = 'nitro-garage/productos'
const MAX_GALLERY = 4
const IMG_EXT = /\.(jpe?g|png|webp|gif|avif|bmp|tiff?)$/i
// Sufijo aleatorio que agrega Cloudinary al subir: 6 caracteres en minúscula.
const CLOUD_SUFFIX = /_[a-z0-9]{6}$/

// El nombre del archivo ES el SKU: es la fuente de la verdad. `norm` solo se
// usa para encontrar al producto cuando en la base quedó escrito distinto
// ("acc 001" contra "ACC-001") y poder corregirlo.
const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

// Nombres que Cloudinary generó solo (subidas sin nombre de archivo):
// 20 caracteres al azar, sin guiones ni espacios. No son códigos.
const looksAuto = (s) => /^[a-z0-9]{16,}$/.test(String(s || ''))

/**
 * Lee el nombre del archivo, que es la fuente de la verdad:
 *
 *   STEP2_t8yc8d     → SKU "STEP2", foto 1 (portada)
 *   STEP2.2_huvrdu   → SKU "STEP2", foto 2
 *
 * Se le saca, en este orden, la extensión, el sufijo aleatorio que agrega
 * Cloudinary al subir (no lo escribiste vos, no es parte del SKU) y la
 * numeración `.N` de las fotos de un mismo producto.
 */
function parseName(name, { dropSuffix }) {
  const base = String(name || '').trim().replace(IMG_EXT, '')
  let code = base
  if (dropSuffix) {
    const noSuffix = code.replace(CLOUD_SUFFIX, '')
    if (noSuffix) code = noSuffix
  }
  let photo = 1
  const numbered = code.match(/^(.+)\.([1-9])$/)
  if (numbered) {
    code = numbered[1]
    photo = Number(numbered[2])
  }
  return { base, sku: code.trim(), photo }
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
  const [replace, setReplace] = useState(true)
  const [dropSuffix, setDropSuffix] = useState(true)
  const [fixSku, setFixSku] = useState(true)
  const [alsoUnnamed, setAlsoUnnamed] = useState(false)
  const [orphanSel, setOrphanSel] = useState({}) // id -> false para salvarlo
  const [createNew, setCreateNew] = useState(true)
  const [publishNew, setPublishNew] = useState(false)
  const [newCategory, setNewCategory] = useState('')

  useEffect(() => {
    // `raw`: hace falta ver las fotos viejas del PDF para poder limpiarlas.
    api
      .listProducts({ includeInactive: 1, raw: true })
      .then(setProducts)
      .catch((e) => setError(e.message))
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const [data, prods] = await Promise.all([
        api.listCloudinaryPhotos(folder),
        api.listProducts({ includeInactive: 1, raw: true }),
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
      const { base, sku, photo } = parseName(ph.name, { dropSuffix })
      // Se busca primero el nombre tal cual y después el SKU ya limpio.
      const list = [{ code: base }]
      if (sku !== base) list.push({ code: sku })
      let product = null
      let skuFix = null // SKU que debería tener el producto según el archivo

      for (const c of list) {
        // Si el SKU de la base coincide letra por letra, no hay nada que corregir.
        const exact = byExact.get(c.code.trim())
        if (exact) {
          product = exact
          break
        }
        // Si aparece ignorando mayúsculas y separadores, es el mismo producto
        // con el SKU mal escrito en la base: manda el archivo.
        const soft = byNorm.get(norm(c.code))
        if (soft) {
          product = soft
          skuFix = sku
          break
        }
      }

      return { ...ph, base, sku, photo, product, skuFix, auto: looksAuto(ph.name) }
    })
  }, [photos, products, dropSuffix])

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

    // Las fotos de un mismo SKU van juntas, ordenadas por su número: la .1
    // (o la que no tiene número) queda de portada.
    const byNumber = (a, b) => a.photo - b.photo || a.name.localeCompare(b.name)

    for (const r of rows) {
      if (!sel[r.publicId]) continue
      if (r.product) {
        const entry = byProduct.get(r.product.id) || { product: r.product, fotos: [], skuFix: null }
        entry.fotos.push(r)
        if (!entry.skuFix && r.skuFix) entry.skuFix = r.skuFix
        byProduct.set(r.product.id, entry)
      } else if (createNew && r.sku) {
        // El nombre del archivo es el SKU (sin el sufijo de Cloudinary).
        const entry = byNewCode.get(r.sku) || { code: r.sku, fotos: [] }
        entry.fotos.push(r)
        byNewCode.set(r.sku, entry)
      }
    }

    for (const { product, fotos, skuFix } of byProduct.values()) {
      const urls = fotos.sort(byNumber).map((r) => r.url)
      const stored = Array.isArray(product.images) ? product.images.filter(Boolean) : []
      // Las páginas del catálogo PDF no cuentan como fotos: se descartan
      // siempre, aunque estés completando en vez de reemplazando.
      const current = stored.filter((u) => !isLegacyPhoto(u))
      const base = replace ? [] : current.length ? current : [product.image_url].filter(Boolean)
      const gallery = [...new Set([...base, ...urls])]
        .filter((u) => !isLegacyPhoto(u))
        .slice(0, MAX_GALLERY)
      const payload = { image_url: gallery[0], images: gallery }
      if (fixSku && skuFix && skuFix !== product.sku) payload.sku = skuFix

      const samePhotos =
        JSON.stringify(gallery) === JSON.stringify(stored) && gallery[0] === product.image_url
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

    for (const { code, fotos } of byNewCode.values()) {
      const gallery = [...new Set(fotos.sort(byNumber).map((r) => r.url))].slice(0, MAX_GALLERY)
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
      conNumero: rows.filter((r) => r.photo > 1).length,
      skus: new Set(rows.map((r) => r.sku)).size,
      nuevos: rows.filter((r) => !r.product && !r.auto).length,
      auto: rows.filter((r) => r.auto).length,
    }),
    [rows]
  )

  // URLs de la carpeta que no tienen código en el nombre: son las subidas
  // viejas (páginas del PDF que se movieron a Cloudinary o cargas manuales).
  const unnamedUrls = useMemo(
    () => new Set(rows.filter((r) => r.auto).map((r) => r.url)),
    [rows]
  )

  // La carpeta es el catálogo curado: todo producto cuyo SKU no esté ahí
  // quedó del catálogo viejo (importación del PDF).
  const orphans = useMemo(() => {
    if (!photos) return []
    const inFolder = new Set(rows.filter((r) => !r.auto).map((r) => norm(r.sku)))
    return products.filter((p) => !inFolder.has(norm(p.sku || '')))
  }, [photos, rows, products])

  const orphanStats = useMemo(
    () => ({
      conPrecio: orphans.filter((p) => p.current_price != null).length,
      activos: orphans.filter((p) => p.active).length,
      sinSku: orphans.filter((p) => !p.sku).length,
    }),
    [orphans]
  )

  const orphanIds = useMemo(
    () => orphans.filter((p) => orphanSel[p.id] !== false).map((p) => p.id),
    [orphans, orphanSel]
  )

  // Productos que todavía muestran una foto del catálogo en PDF.
  const legacy = useMemo(() => {
    const isOld = (u) => isLegacyPhoto(u) || (alsoUnnamed && unnamedUrls.has(u))
    return products
      .map((p) => {
        const stored = Array.isArray(p.images) ? p.images.filter(Boolean) : []
        const all = stored.length ? stored : [p.image_url].filter(Boolean)
        if (!all.some(isOld)) return null
        const images = all.filter((u) => !isOld(u))
        return { product: p, payload: { image_url: images[0] || null, images } }
      })
      .filter(Boolean)
  }, [products, alsoUnnamed, unnamedUrls])

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
      setProducts(await api.listProducts({ includeInactive: 1, raw: true }))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  // Da de baja los productos que no están en la carpeta: desactivarlos los
  // saca de la tienda y se puede deshacer; borrarlos no.
  async function dropOrphans(mode) {
    const ids = orphanIds
    if (ids.length === 0) return
    const aviso =
      mode === 'delete'
        ? `Se van a BORRAR ${ids.length} producto(s) para siempre, junto con su ` +
          `historial de precios (${orphanStats.conPrecio} tienen precio cargado). ` +
          'Las cotizaciones ya emitidas no se tocan. ¿Seguir?'
        : `Se van a desactivar ${ids.length} producto(s): dejan de verse en la ` +
          'tienda pero quedan en el panel y los podés reactivar. ¿Seguir?'
    if (!confirm(aviso)) return
    if (mode === 'delete' && !confirm('Última confirmación: el borrado no se puede deshacer.')) return

    setLoading(true)
    setError('')
    setResult(null)
    setProgress({ done: 0, total: ids.length })
    try {
      const onStep = (done, total) => setProgress({ done, total })
      if (mode === 'delete') await api.bulkDeleteProducts(ids, onStep)
      else await api.bulkSetActive(ids, false, onStep)
      setProducts(await api.listProducts({ includeInactive: 1, raw: true }))
      setResult({
        updated: mode === 'delete' ? 0 : ids.length,
        created: 0,
        deleted: mode === 'delete' ? ids.length : 0,
        errors: [],
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  // Saca de los productos las fotos que venían del catálogo en PDF.
  async function cleanLegacy() {
    if (legacy.length === 0) return
    if (
      !confirm(
        `Se le van a quitar las fotos del catálogo PDF a ${legacy.length} producto(s). ` +
          'Los que no tengan otra foto quedan sin foto. ¿Seguir?'
      )
    )
      return
    setLoading(true)
    setError('')
    setResult(null)
    setProgress({ done: 0, total: legacy.length })
    const res = { updated: 0, created: 0, errors: [] }
    for (const { product, payload } of legacy) {
      try {
        await api.updateProduct(product.id, payload)
        res.updated++
      } catch (e) {
        res.errors.push(`${product.sku || product.name}: ${e.message}`)
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }))
    }
    try {
      setProducts(await api.listProducts({ includeInactive: 1, raw: true }))
    } catch (e) {
      setError(e.message)
    }
    setResult(res)
    setLoading(false)
    setProgress(null)
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
          {result.deleted > 0 && ` ${result.deleted} borrado(s).`}
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
              Reemplazar las fotos que ya tenga el producto — la carpeta trae la
              galería completa (si no, se agregan a lo que ya está, hasta{' '}
              {MAX_GALLERY})
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
            <p className="muted" style={{ margin: '0 0 6px' }}>
              Las fotos de un mismo producto se agrupan por la numeración del
              archivo: <code>STEP2</code>, <code>STEP2.2</code>, <code>STEP2.3</code>{' '}
              van al mismo SKU y en ese orden ({stats.conNumero} archivo(s)
              numerado(s), {stats.skus} SKU distintos).
            </p>
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
                      {r.photo > 1 && (
                        <span className="badge badge-cat" style={{ marginLeft: 6 }}>
                          foto {r.photo}
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
                          {!replace && r.product.image_url
                            ? 'Suma a galería'
                            : r.photo > 1
                              ? `Foto ${r.photo}`
                              : 'Portada'}
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

          <div
            className="card"
            style={{ padding: '1.25rem', margin: '1.5rem 0', maxWidth: 720 }}
          >
            <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
              Fotos viejas del catálogo PDF
            </strong>
            <p className="muted" style={{ marginTop: 0 }}>
              Las páginas del catálogo en PDF ya no se usan como foto de producto
              y no se muestran en la tienda. Acá se las sacás también de la base.
              Conviene hacerlo <strong>después</strong> de aplicar las fotos de
              Cloudinary: el producto que no tenga otra foto queda sin foto.
            </p>
            <label className="row" style={{ gap: 8, textTransform: 'none', marginBottom: 10 }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={alsoUnnamed}
                onChange={(e) => setAlsoUnnamed(e.target.checked)}
              />
              Incluir también las {stats.auto} foto(s) sin código de la carpeta
              (páginas del PDF que se movieron a Cloudinary y cargas manuales
              viejas)
            </label>
            <button
              className="btn btn-danger"
              onClick={cleanLegacy}
              disabled={loading || legacy.length === 0}
            >
              <Icon name="trash" size={15} />{' '}
              {legacy.length === 0
                ? 'No quedan fotos del PDF'
                : `Quitar de ${legacy.length} producto(s)`}
            </button>
          </div>

          {orphans.length > 0 && (
            <div className="card" style={{ padding: '1.25rem', margin: '1.5rem 0' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
                Productos que no están en la carpeta ({orphans.length})
              </strong>
              <p className="muted" style={{ marginTop: 0 }}>
                Si la carpeta es el catálogo curado, estos quedaron del catálogo
                viejo: ningún archivo de Cloudinary tiene su SKU.{' '}
                <strong>{orphanStats.activos}</strong> están activos en la tienda,{' '}
                <strong>{orphanStats.conPrecio}</strong> tienen precio cargado
                {orphanStats.sinSku > 0 && <> y <strong>{orphanStats.sinSku}</strong> no tienen SKU</>}.
                Desmarcá el que quieras salvar.
              </p>
              <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                <strong>Desactivar</strong> los saca de la tienda y se puede deshacer.{' '}
                <strong>Borrar</strong> es definitivo y se lleva el historial de
                precios; las cotizaciones ya emitidas no se tocan porque guardan su
                propia copia.
              </p>

              <div className="table-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }} aria-label="Incluir">
                        <Icon name="check" size={14} />
                      </th>
                      <th style={{ width: 150 }}>SKU</th>
                      <th>Nombre</th>
                      <th style={{ width: 110 }}>Precio</th>
                      <th style={{ width: 90 }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orphans.map((p) => (
                      <tr key={p.id} style={{ opacity: orphanSel[p.id] === false ? 0.5 : 1 }}>
                        <td>
                          <input
                            type="checkbox"
                            style={{ width: 'auto' }}
                            checked={orphanSel[p.id] !== false}
                            onChange={() =>
                              setOrphanSel((prev) => ({
                                ...prev,
                                [p.id]: prev[p.id] === false,
                              }))
                            }
                          />
                        </td>
                        <td className="product-sku">{p.sku || '—'}</td>
                        <td>{p.name}</td>
                        <td>
                          {p.current_price != null ? (
                            <span className="badge badge-cat">con precio</span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>
                          {p.active ? (
                            <span className="badge badge-cat">activo</span>
                          ) : (
                            <span className="badge badge-off">inactivo</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="row" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-ice"
                  onClick={() => dropOrphans('deactivate')}
                  disabled={loading || orphanIds.length === 0}
                >
                  Desactivar {orphanIds.length} (reversible)
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => dropOrphans('delete')}
                  disabled={loading || orphanIds.length === 0}
                >
                  <Icon name="trash" size={15} /> Borrar {orphanIds.length} definitivamente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
