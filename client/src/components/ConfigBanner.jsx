import { isSupabaseConfigured } from '../lib/supabase.js'
import Icon from './Icon.jsx'

export default function ConfigBanner() {
  if (isSupabaseConfigured) return null
  return (
    <div
      style={{
        background: '#3a1a00',
        borderBottom: '1px solid var(--orange)',
        color: '#ffd9a8',
        fontSize: '0.85rem',
        textAlign: 'center',
        padding: '0.5rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
      }}
    >
      <Icon name="alert" size={15} /> Supabase no está configurado — copiá{' '}
      <code>client/.env.example</code> a <code>client/.env.local</code> con tus
      credenciales para ver datos reales.
    </div>
  )
}
