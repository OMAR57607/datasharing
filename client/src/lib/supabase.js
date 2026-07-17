import { createClient } from '@supabase/supabase-js'

// Variables públicas del cliente (definir en Vercel / client/.env.local).
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Aviso claro en consola si faltan las credenciales.
  console.warn(
    '[Nitro Garage] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copiá client/.env.example a client/.env.local y completá los valores.'
  )
}

export const supabase = createClient(url || '', anonKey || '')
