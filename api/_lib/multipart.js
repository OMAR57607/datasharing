import Busboy from 'busboy'

/**
 * Parsea un cuerpo multipart/form-data de una request de Vercel.
 * Devuelve { fields, file: { buffer, filename, mimetype } }.
 */
export function parseMultipart(req, { maxBytes = 50 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: { fileSize: maxBytes, files: 1 },
    })
    const fields = {}
    let file = null
    let tooLarge = false

    busboy.on('field', (name, val) => {
      fields[name] = val
    })
    busboy.on('file', (name, stream, info) => {
      const chunks = []
      stream.on('data', (c) => chunks.push(c))
      stream.on('limit', () => {
        tooLarge = true
        stream.resume()
      })
      stream.on('end', () => {
        if (!tooLarge) {
          file = {
            buffer: Buffer.concat(chunks),
            filename: info.filename,
            mimetype: info.mimeType,
          }
        }
      })
    })
    busboy.on('close', () => {
      if (tooLarge) return reject(new Error('El archivo supera el tamaño máximo'))
      resolve({ fields, file })
    })
    busboy.on('error', reject)

    req.pipe(busboy)
  })
}
