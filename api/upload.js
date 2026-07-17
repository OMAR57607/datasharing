import { getUserFromRequest } from './_lib/auth.js'
import { parseMultipart } from './_lib/multipart.js'
import { uploadBuffer } from './_lib/cloudinary.js'

export const config = { api: { bodyParser: false } }

// Sube una imagen de producto a Cloudinary y devuelve su URL segura.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'No autenticado' })

  try {
    const { file } = await parseMultipart(req, { maxBytes: 10 * 1024 * 1024 })
    if (!file) return res.status(400).json({ error: 'No se recibió la imagen' })
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'El archivo debe ser una imagen' })
    }

    const result = await uploadBuffer(file.buffer, {
      folder: 'nitro-garage/productos',
      resourceType: 'image',
    })
    res.json({ url: result.secure_url, publicId: result.public_id })
  } catch (err) {
    res.status(400).json({ error: 'No se pudo subir la imagen: ' + err.message })
  }
}
