import { getUserFromRequest } from './_lib/auth.js'
import { listFolderImages } from './_lib/cloudinary.js'

const DEFAULT_FOLDER = 'nitro-garage/productos'

// Lista las fotos de una carpeta del Media Library de Cloudinary para poder
// asignarlas a los productos por código (el nombre del archivo = SKU).
// Requiere sesión de admin: las credenciales de Cloudinary son del servidor.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'No autenticado' })

  // req.query lo arma Vercel; el fallback cubre cualquier otro runtime.
  const query = req.query || new URL(req.url, 'http://localhost').searchParams
  const raw = (query.get?.('folder') ?? query.folder ?? DEFAULT_FOLDER).toString().trim()
  const folder = raw.replace(/^\/+|\/+$/g, '')
  const parts = folder.split('/')
  const validName = (s) => /^[\w\-. ]+$/.test(s) && s !== '.' && s !== '..'
  if (!folder || folder.length > 120 || !parts.every(validName)) {
    return res.status(400).json({ error: 'Nombre de carpeta inválido' })
  }

  try {
    const { source, photos } = await listFolderImages(folder)
    res.json({ folder, source, count: photos.length, photos })
  } catch (err) {
    res.status(400).json({
      error: 'No se pudo leer la carpeta de Cloudinary: ' + err.message,
    })
  }
}
