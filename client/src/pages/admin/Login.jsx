import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import ConfigBanner from '../../components/ConfigBanner.jsx'
import Turnstile, { TURNSTILE_ENABLED } from '../../components/Turnstile.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const turnstileRef = useRef(null)

  // Estable: evita re-renderizar el widget en cada render.
  const onToken = useCallback((t) => setCaptchaToken(t), [])

  async function onSubmit(e) {
    e.preventDefault()
    if (TURNSTILE_ENABLED && !captchaToken) {
      setError('Completa la verificación de seguridad para continuar.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await login(email, password, captchaToken)
      navigate('/admin')
    } catch (err) {
      setError(err.message)
      // El token es de un solo uso: pide uno nuevo para el siguiente intento.
      setCaptchaToken('')
      turnstileRef.current?.reset()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap" style={{ flexDirection: 'column' }}>
      <ConfigBanner />
      <form
        className="card login-card"
        style={{ margin: 'auto' }}
        onSubmit={onSubmit}
      >
        <div className="brand">
          <img src="/logo.jpg" alt="Nitro Garage" style={{ height: 48 }} />
        </div>
        <h2 className="display" style={{ textAlign: 'center' }}>
          Panel de administración
        </h2>
        <p className="muted" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          Ingresa tus credenciales
        </p>

        {error && (
          <div className="error-box" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Turnstile ref={turnstileRef} onToken={onToken} />

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={loading}
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
