import { createContext, useContext, useEffect, useState } from 'react'

const QuoteContext = createContext(null)
const KEY = 'nitro_quote'

export function QuoteProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items))
  }, [items])

  function add(product) {
    setItems((prev) => {
      const found = prev.find((i) => i.id === product.id)
      if (found) {
        return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i))
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          sku: product.sku || null,
          image_url: product.image_url || null,
          price: product.current_price ?? null,
          qty: 1,
        },
      ]
    })
  }

  const remove = (id) => setItems((prev) => prev.filter((i) => i.id !== id))
  const setQty = (id, qty) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i)))
  const clear = () => setItems([])
  const has = (id) => items.some((i) => i.id === id)
  const count = items.reduce((n, i) => n + i.qty, 0)

  return (
    <QuoteContext.Provider value={{ items, add, remove, setQty, clear, has, count }}>
      {children}
    </QuoteContext.Provider>
  )
}

export function useQuote() {
  return useContext(QuoteContext)
}
