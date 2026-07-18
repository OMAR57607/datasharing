import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

// Cloudflare Turnstile (CAPTCHA anti-fuerza-bruta). Se activa solo si está
// definida VITE_TURNSTILE_SITE_KEY; si no, no renderiza nada (login normal).
export const TURNSTILE_ENABLED = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY)
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

function loadScript() {
  if (typeof window === 'undefined') return Promise.reject()
  if (window.turnstile) return Promise.resolve()
  if (window.__turnstilePromise) return window.__turnstilePromise
  window.__turnstilePromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.defer = true
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
  return window.__turnstilePromise
}

const Turnstile = forwardRef(function Turnstile({ onToken }, ref) {
  const elRef = useRef(null)
  const idRef = useRef(null)

  useImperativeHandle(ref, () => ({
    reset() {
      if (idRef.current != null && window.turnstile) {
        try {
          window.turnstile.reset(idRef.current)
        } catch {
          /* ignora */
        }
      }
    },
  }))

  useEffect(() => {
    if (!SITE_KEY) return
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled || !elRef.current || !window.turnstile) return
        idRef.current = window.turnstile.render(elRef.current, {
          sitekey: SITE_KEY,
          theme: 'auto',
          callback: (token) => onToken(token),
          'error-callback': () => onToken(''),
          'expired-callback': () => onToken(''),
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (idRef.current != null && window.turnstile) {
        try {
          window.turnstile.remove(idRef.current)
        } catch {
          /* ignora */
        }
      }
    }
  }, [onToken])

  if (!SITE_KEY) return null
  return <div ref={elRef} className="turnstile" style={{ marginBottom: '1rem' }} />
})

export default Turnstile
