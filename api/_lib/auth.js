import { createClient } from '@supabase/supabase-js'

// Cliente con la anon key: solo lo usamos para validar el token del usuario.
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

/**
 * Verifica el token de Supabase enviado en Authorization: Bearer <token>.
 * Devuelve el usuario si es válido, o null.
 */
export async function getUserFromRequest(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}
