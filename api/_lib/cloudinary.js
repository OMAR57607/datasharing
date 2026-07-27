import { v2 as cloudinary } from 'cloudinary'

// Config desde variables de entorno (definir en Vercel / .env).
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

/** Sube un buffer a Cloudinary. resourceType 'image' o 'auto'. */
export function uploadBuffer(buffer, { folder = 'nitro-garage', resourceType = 'image', publicId } = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType, public_id: publicId },
      (err, result) => (err ? reject(err) : resolve(result))
    )
    stream.end(buffer)
  })
}

/**
 * Sube a Cloudinary indicándole una URL pública: Cloudinary la descarga
 * por su cuenta (útil para archivos grandes que no conviene reenviar por
 * la Function).
 */
export function uploadRemote(url, { folder = 'nitro-garage', resourceType = 'image', publicId } = {}) {
  return cloudinary.uploader.upload(url, {
    folder,
    resource_type: resourceType,
    public_id: publicId,
  })
}

/** Nombre "humano" de un asset: el archivo con el que se subió, sin extensión. */
function assetName(r) {
  const raw =
    r.display_name || r.filename || String(r.public_id || '').split('/').pop() || ''
  return raw.replace(/\.[a-z0-9]{2,5}$/i, '')
}

function toPhoto(r) {
  return {
    publicId: r.public_id,
    name: assetName(r),
    url: r.secure_url || cloudinary.url(r.public_id, { secure: true, format: r.format }),
    format: r.format || null,
    bytes: r.bytes ?? null,
    width: r.width ?? null,
    height: r.height ?? null,
    createdAt: r.created_at || null,
  }
}

/** Search API paginada (devuelve todos los assets hasta `max`). */
async function searchAll(expression, max) {
  const out = []
  let cursor = null
  do {
    let q = cloudinary.search.expression(expression).max_results(Math.min(500, max - out.length))
    if (cursor) q = q.next_cursor(cursor)
    const res = await q.execute()
    out.push(...(res.resources || []))
    cursor = res.next_cursor
  } while (cursor && out.length < max)
  return out
}

/** Admin API por prefijo de public_id (respaldo para cuentas sin Search). */
async function resourcesByPrefix(prefix, max) {
  const out = []
  let cursor = null
  do {
    const res = await cloudinary.api.resources({
      type: 'upload',
      resource_type: 'image',
      prefix,
      max_results: Math.min(500, max - out.length),
      next_cursor: cursor || undefined,
    })
    out.push(...(res.resources || []))
    cursor = res.next_cursor
  } while (cursor && out.length < max)
  return out
}

/**
 * Lista las imágenes de una carpeta del Media Library.
 * Cloudinary tiene dos modos de carpeta (fija dentro del public_id, o
 * dinámica en `asset_folder`), así que probamos las tres formas de
 * consultarla y nos quedamos con la primera que devuelva resultados.
 */
export async function listFolderImages(folder, { max = 1000 } = {}) {
  const safe = String(folder).replace(/["\\]/g, '')
  const strategies = [
    ['search:folder', () => searchAll(`resource_type:image AND folder="${safe}"`, max)],
    ['search:asset_folder', () => searchAll(`resource_type:image AND asset_folder="${safe}"`, max)],
    ['admin:prefix', () => resourcesByPrefix(safe + '/', max)],
  ]

  let lastError = null
  for (const [source, run] of strategies) {
    try {
      const resources = await run()
      if (resources.length) {
        return { source, photos: resources.map(toPhoto) }
      }
    } catch (err) {
      lastError = err
    }
  }
  if (lastError) throw lastError
  return { source: 'empty', photos: [] }
}

export { cloudinary }
