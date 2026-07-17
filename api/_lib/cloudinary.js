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
 * URL de una página del PDF como imagen (Cloudinary convierte el PDF
 * a imágenes por página de forma nativa).
 */
export function pdfPageUrl(publicId, page, { width = 800 } = {}) {
  return cloudinary.url(publicId, {
    resource_type: 'image',
    format: 'jpg',
    transformation: [{ page }, { width, crop: 'fit', quality: 'auto' }],
  })
}

export { cloudinary }
