import { getUserFromRequest } from './_lib/auth.js'
import { parseMultipart } from './_lib/multipart.js'
import { parsePdfText } from './_lib/pdf.js'

// En Vercel: desactivar el bodyParser para manejar el cuerpo manualmente
// (multipart para archivos subidos, o JSON con una URL de PDF ya alojado).
export const config = { api: { bodyParser: false } }

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const user = await getUserFromRequest(req)
  if (!user) return res.status(401).json({ error: 'No autenticado' })

  const contentType = req.headers['content-type'] || ''

  try {
    let buffer
    let filename

    if (contentType.includes('application/json')) {
      // Modo URL: la Function descarga el PDF (evita el límite de tamaño
      // del cuerpo de la petición en las Vercel Functions).
      const raw = await readRawBody(req)
      const { url } = JSON.parse(raw.toString('utf8') || '{}')
      if (!url) return res.status(400).json({ error: 'Falta la URL del PDF' })
      const pdfRes = await fetch(url)
      if (!pdfRes.ok) {
        return res.status(400).json({ error: 'No se pudo descargar el PDF (' + pdfRes.status + ')' })
      }
      buffer = Buffer.from(await pdfRes.arrayBuffer())
      filename = url.split('/').pop()
    } else {
      // Modo archivo subido (multipart/form-data).
      const { file } = await parseMultipart(req)
      if (!file) return res.status(400).json({ error: 'No se recibió el archivo' })
      if (file.mimetype !== 'application/pdf') {
        return res.status(400).json({ error: 'Solo se aceptan archivos PDF' })
      }
      buffer = file.buffer
      filename = file.filename
    }

    // Del PDF solo se extrae el texto → candidatos de producto (sin precio).
    // Las páginas ya no se suben como imagen: las fotos salen del Media
    // Library de Cloudinary, con el SKU como nombre de archivo.
    const { pages, products } = await parsePdfText(buffer)

    res.json({
      filename,
      pages,
      count: products.length,
      products,
    })
  } catch (err) {
    res.status(400).json({ error: 'No se pudo procesar el PDF: ' + err.message })
  }
}
