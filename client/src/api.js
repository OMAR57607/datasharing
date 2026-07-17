// Cliente HTTP simple para la API. El token se guarda en localStorage.
const TOKEN_KEY = 'nitro_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request(path, { method = 'GET', body, isForm } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let payload = body
  if (body && !isForm) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const res = await fetch(`/api${path}`, { method, headers, body: payload })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status}`)
  }
  return data
}

export const api = {
  // Auth
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: { username, password } }),
  me: () => request('/auth/me'),

  // Productos
  listProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/products${qs ? '?' + qs : ''}`)
  },
  getProduct: (id) => request(`/products/${id}`),
  getCategories: () => request('/products/categories'),
  createProduct: (data) => request('/products', { method: 'POST', body: data }),
  updateProduct: (id, data) =>
    request(`/products/${id}`, { method: 'PUT', body: data }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Precios
  getPriceHistory: (id) => request(`/products/${id}/prices`),
  setPrice: (id, data) =>
    request(`/products/${id}/price`, { method: 'POST', body: data }),
  bulkPrices: (items, currency) =>
    request('/prices/bulk', { method: 'POST', body: { items, currency } }),

  // Importación PDF
  importPdf: (file) => {
    const form = new FormData()
    form.append('file', file)
    return request('/import/pdf', { method: 'POST', body: form, isForm: true })
  },
  confirmImport: (products) =>
    request('/import/confirm', { method: 'POST', body: { products } }),
}
