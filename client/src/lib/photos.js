// Fotos que venían del catálogo en PDF: páginas enteras servidas desde el
// repo (/productos/pagXX_YYY.jpg) o renderizadas por Cloudinary desde el PDF
// (carpeta nitro-garage/catalogos). Dejaron de usarse: las fotos de producto
// salen del Media Library, con el SKU como nombre de archivo.
export function isLegacyPhoto(url) {
  if (typeof url !== 'string' || !url) return false
  return url.startsWith('/productos/') || url.includes('/nitro-garage/catalogos/')
}

/**
 * Devuelve el producto sin las fotos viejas del catálogo. La portada pasa a
 * ser la primera foto válida (o ninguna), así una página del PDF no se
 * muestra aunque siga guardada en la base.
 */
export function cleanPhotos(product) {
  if (!product) return product
  const gallery = (Array.isArray(product.images) ? product.images : []).filter(
    (u) => u && !isLegacyPhoto(u)
  )
  const cover = isLegacyPhoto(product.image_url) ? null : product.image_url
  const images = gallery.length ? gallery : cover ? [cover] : []
  return { ...product, images, image_url: images[0] || null }
}
