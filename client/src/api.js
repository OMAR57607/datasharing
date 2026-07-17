import { supabase } from './lib/supabase.js'

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
  // ---------- Productos (Supabase directo, protegido por RLS) ----------
  async listProducts({ category, search, includeInactive } = {}) {
    let q = supabase.from('products').select('*').order('created_at', { ascending: false })
    if (!includeInactive) q = q.eq('active', true)
    if (category) q = q.eq('category', category)
    if (search) q = q.or(`name.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`)
    const { data, error } = await q
    throwIf(error)
    return data
  },

  async getProduct(id) {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
    throwIf(error)
    return data
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

  // ---------- Importación PDF (Vercel Function) ----------
  async importPdf(file) {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: await authHeader(),
      body: form,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Error al importar')
    return data
  },

  async confirmImport(products) {
    // Inserta los productos elegidos directamente en Supabase.
    // Omite los que tengan un SKU ya existente.
    const skus = products.map((p) => p.sku).filter(Boolean)
    let existing = []
    if (skus.length) {
      const { data } = await supabase.from('products').select('sku').in('sku', skus)
      existing = (data || []).map((r) => r.sku)
    }
    const toInsert = products.filter((p) => p.name && !(p.sku && existing.includes(p.sku)))
    const skipped = products.filter((p) => p.sku && existing.includes(p.sku)).map((p) => p.sku)
    if (toInsert.length) {
      const { error } = await supabase.from('products').insert(
        toInsert.map((p) => ({
          sku: p.sku || null,
          name: p.name,
          description: p.description || null,
          category: p.category || null,
          brand: p.brand || null,
          image_url: p.image_url || null,
        }))
      )
      throwIf(error)
    }
    return { imported: toInsert.length, skipped }
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
