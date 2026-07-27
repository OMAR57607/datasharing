import { supabase } from './lib/supabase.js'
import { cleanPhotos } from './lib/photos.js'

// Token de sesión actual para llamar a las Vercel Functions.
async function authHeader() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session ? { Authorization: `Bearer ${session.access_token}` } : {}
}

function throwIf(error) {
  if (error) throw new Error(error.message)
}

export const api = {
  // ---------- Cotizaciones (leads) ----------
  async createQuote(payload) {
    const { data, error } = await supabase.from('quotes').insert(payload).select().single()
    throwIf(error)
    return data
  },
  async listQuotes() {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false })
    throwIf(error)
    return data
  },
  async updateQuoteStatus(id, status) {
    const { data, error } = await supabase
      .from('quotes')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    throwIf(error)
    return data
  },

  // ---------- Productos (Supabase directo, protegido por RLS) ----------
  // `raw` devuelve los productos tal cual están en la base, con las fotos
  // viejas del catálogo PDF incluidas: solo lo usa el panel que las limpia.
  async listProducts({ category, search, includeInactive, raw } = {}) {
    let q = supabase.from('products').select('*').order('created_at', { ascending: false })
    if (!includeInactive) q = q.eq('active', true)
    if (category) q = q.eq('category', category)
    if (search) q = q.or(`name.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`)
    const { data, error } = await q
    throwIf(error)
    return raw ? data : data.map(cleanPhotos)
  },

  async getProduct(id) {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
    throwIf(error)
    return cleanPhotos(data)
  },

  // Cuenta una "solicitud" (vista) del producto para el ranking de más
  // solicitados. Silencioso: si falla (RPC no migrada) no rompe la vista.
  async incrementViews(id) {
    try {
      await supabase.rpc('increment_product_views', { p_id: id })
    } catch {
      /* ignora */
    }
  },

  async getCategories() {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .not('category', 'is', null)
    throwIf(error)
    return [...new Set(data.map((r) => r.category).filter(Boolean))].sort()
  },

  async createProduct(payload) {
    const { data, error } = await supabase.from('products').insert(payload).select().single()
    throwIf(error)
    return data
  },

  async updateProduct(id, payload) {
    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    throwIf(error)
    return data
  },

  // La portada es la primera foto de `images` (y se copia en image_url por
  // compatibilidad): elegirla es reordenar la galería.
  async setCover(product, url) {
    const rest = (Array.isArray(product.images) ? product.images : []).filter(
      (u) => u && u !== url
    )
    return api.updateProduct(product.id, { image_url: url, images: [url, ...rest] })
  },

  async deleteProduct(id) {
    const { error } = await supabase.from('products').delete().eq('id', id)
    throwIf(error)
    return { ok: true }
  },

  // ---------- Precios ----------
  async setPrice(id, { price, currency = 'USD', note = null }) {
    const { data, error } = await supabase.rpc('set_price', {
      p_product_id: id,
      p_price: price,
      p_currency: currency,
      p_note: note,
    })
    throwIf(error)
    return Array.isArray(data) ? data[0] : data
  },

  async getPriceHistory(id) {
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false })
    throwIf(error)
    return data
  },

  async bulkPrices(items, currency = 'USD') {
    // Resuelve SKU → id y aplica set_price a cada uno.
    const skus = items.map((i) => i.sku).filter(Boolean)
    const { data: found, error } = await supabase
      .from('products')
      .select('id, sku')
      .in('sku', skus)
    throwIf(error)
    const bySku = Object.fromEntries(found.map((p) => [p.sku, p.id]))
    const results = { updated: [], notFound: [], invalid: [] }
    for (const item of items) {
      const value = Number(item.price)
      if (!item.sku || !Number.isFinite(value) || value < 0) {
        results.invalid.push(item)
        continue
      }
      const id = bySku[item.sku]
      if (!id) {
        results.notFound.push(item.sku)
        continue
      }
      await api.setPrice(id, { price: value, currency, note: 'Carga masiva' })
      results.updated.push({ sku: item.sku, price: value })
    }
    return results
  },

  // ---------- Fotos ya subidas a Cloudinary ----------
  // Lista una carpeta del Media Library (la Function usa las credenciales
  // del servidor). Cada foto trae su `name`, que es el código del producto.
  async listCloudinaryPhotos(folder) {
    const qs = folder ? `?folder=${encodeURIComponent(folder)}` : ''
    const res = await fetch('/api/cloudinary-photos' + qs, {
      headers: await authHeader(),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'No se pudo leer la carpeta de Cloudinary')
    return data
  },

  // Aplica el plan armado en el panel: actualiza la foto de los productos
  // que ya existen y crea los que faltan (SKU = nombre del archivo).
  async applyCloudinaryPhotos({ updates = [], creates = [] }, onProgress) {
    const result = { updated: 0, created: 0, errors: [] }
    const total = updates.length + creates.length
    let done = 0

    for (const u of updates) {
      try {
        await api.updateProduct(u.id, u.payload)
        result.updated++
      } catch (e) {
        result.errors.push(`${u.sku || u.id}: ${e.message}`)
      }
      onProgress?.(++done, total)
    }

    // Los nuevos van en lotes: un insert por cada 50 en vez de uno por fila.
    // Si el lote falla (por ejemplo un SKU repetido) se reintenta fila por
    // fila para no perder los que sí se podían crear.
    for (let i = 0; i < creates.length; i += 50) {
      const chunk = creates.slice(i, i + 50)
      const { error } = await supabase.from('products').insert(chunk)
      if (!error) {
        result.created += chunk.length
      } else {
        for (const row of chunk) {
          const { error: rowError } = await supabase.from('products').insert(row)
          if (rowError) result.errors.push(`${row.sku}: ${rowError.message}`)
          else result.created++
        }
      }
      done += chunk.length
      onProgress?.(done, total)
    }

    return result
  },

  // Baja masiva: desactivar (reversible) o borrar (definitivo, se lleva el
  // historial de precios por el ON DELETE CASCADE). Las cotizaciones ya
  // emitidas no se tocan: guardan su propia copia de los ítems.
  async bulkSetActive(ids, active, onProgress) {
    let done = 0
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100)
      const { error } = await supabase.from('products').update({ active }).in('id', chunk)
      throwIf(error)
      done += chunk.length
      onProgress?.(done, ids.length)
    }
    return { count: ids.length }
  },

  async bulkDeleteProducts(ids, onProgress) {
    let done = 0
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100)
      const { error } = await supabase.from('products').delete().in('id', chunk)
      throwIf(error)
      done += chunk.length
      onProgress?.(done, ids.length)
    }
    return { count: ids.length }
  },

  // ---------- Subida de imagen manual (Vercel Function → Cloudinary) ----------
  async uploadImage(file) {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: await authHeader(),
      body: form,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Error al subir la imagen')
    return data
  },

}
