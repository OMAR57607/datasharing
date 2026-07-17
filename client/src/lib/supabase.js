import { createClient } from '@supabase/supabase-js'

// Variables públicas del cliente (definir en Vercel / client/.env.local).
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  // Aviso claro en consola si faltan las credenciales.
  console.warn(
    '[Nitro Garage] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copiá client/.env.example a client/.env.local y completá los valores.'
  )
}

// createClient exige una URL válida; sin credenciales usamos un placeholder
// para que la app pueda renderizar (las llamadas fallarán en runtime con
// un error legible, en vez de romper el arranque de toda la aplicación).
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key'
)
