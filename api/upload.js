import { getUserFromRequest } from './_lib/auth.js'
import { parseMultipart } from './_lib/multipart.js'
import { uploadBuffer, uploadRemote } from './_lib/cloudinary.js'

export const config = { api: { bodyParser: false } }

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// Sube una imagen de producto a Cloudinary y devuelve su URL segura.
// Acepta un archivo (multipart) o una URL pública (JSON { url }) — esta
// última se usa para mover a Cloudinary las fotos del catálogo del repo.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'No autenticado' })

  const contentType = req.headers['content-type'] || ''

  try {
    let result
    if (contentType.includes('application/json')) {
      const raw = await readRawBody(req)
      const { url } = JSON.parse(raw.toString('utf8') || '{}')
      if (!url) return res.status(400).json({ error: 'Falta la URL de la imagen' })
      result = await uploadRemote(url, {
        folder: 'nitro-garage/productos',
        resourceType: 'image',
      })
    } else {
      const { file } = await parseMultipart(req, { maxBytes: 10 * 1024 * 1024 })
      if (!file) return res.status(400).json({ error: 'No se recibió la imagen' })
      if (!file.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: 'El archivo debe ser una imagen' })
      }
      result = await uploadBuffer(file.buffer, {
        folder: 'nitro-garage/productos',
        resourceType: 'image',
      })
    }
    res.json({ url: result.secure_url, publicId: result.public_id })
  } catch (err) {
    res.status(400).json({ error: 'No se pudo subir la imagen: ' + err.message })
  }
}
