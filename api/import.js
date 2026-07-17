import { getUserFromRequest } from './_lib/auth.js'
import { parseMultipart } from './_lib/multipart.js'
import { parsePdfText } from './_lib/pdf.js'
import { uploadBuffer, pdfPageUrl } from './_lib/cloudinary.js'

// En Vercel: desactivar el bodyParser para recibir el stream multipart.
export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'No autenticado' })

  try {
    const { file } = await parseMultipart(req)
    if (!file) return res.status(400).json({ error: 'No se recibió el archivo' })
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Solo se aceptan archivos PDF' })
    }

    // 1) Extraer texto → candidatos de producto (sin precio).
    const { pages, products } = await parsePdfText(file.buffer)

    // 2) Subir el PDF a Cloudinary; sus páginas quedan disponibles como
    //    imágenes vía transformación de URL (pg_1, pg_2, …).
    let pdfPublicId = null
    let pageImages = []
    try {
      const uploaded = await uploadBuffer(file.buffer, {
        folder: 'nitro-garage/catalogos',
        resourceType: 'image', // Cloudinary trata el PDF como imagen multipágina
      })
      pdfPublicId = uploaded.public_id
      const total = uploaded.pages || pages || 0
      pageImages = Array.from({ length: total }, (_, i) => ({
        page: i + 1,
        url: pdfPageUrl(pdfPublicId, i + 1),
      }))
    } catch (e) {
      // Si falla Cloudinary (p.ej. sin credenciales), seguimos con el texto.
      console.error('Cloudinary:', e.message)
    }

    res.json({
      filename: file.filename,
      pages,
      count: products.length,
      products,
      pdfPublicId,
      pageImages,
    })
  } catch (err) {
    res.status(400).json({ error: 'No se pudo procesar el PDF: ' + err.message })
  }
}
