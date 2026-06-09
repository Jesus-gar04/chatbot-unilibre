import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import useAuthStore from '../store/authStore'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const login = useAuthStore((s) => s.login)
  const token = useAuthStore((s) => s.token)
  const navigate = useNavigate()

  useEffect(() => {
    if (token) navigate('/admin/dashboard', { replace: true })
  }, [token, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username || !password) return
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { username, password })
      login(data.access_token, username)
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Credenciales incorrectas. Intente de nuevo.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">

          {/* ── Cabecera roja con escudo ── */}
          <div className="bg-ul-700 px-8 pt-8 pb-6 flex flex-col items-center gap-3">
            <div className="rounded-full p-1" style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 0 0 3px rgba(255,255,255,0.18), 0 8px 24px rgba(0,0,0,0.45)' }}>
              <img
                src="/logo.png"
                alt="Escudo Universidad Libre"
                className="w-24 h-24 object-contain"
                style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
              />
            </div>
            <div className="text-center">
              <p className="text-white text-sm font-bold tracking-wide leading-snug">
                Universidad Libre
              </p>
              <p className="text-ul-100 text-xs font-semibold tracking-widest uppercase">
                Seccional Barranquilla
              </p>
            </div>
          </div>

          {/* ── Franja decorativa más oscura ── */}
          <div className="h-1 bg-ul-900" />

          {/* ── Formulario ── */}
          <div className="px-8 py-7">
            <div className="text-center mb-6">
              <h1 className="text-base font-bold text-gray-900">Secretaría Académica</h1>
              <p className="text-xs text-gray-500 mt-0.5">Panel administrativo — acceso restringido</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Usuario
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-ul-600 focus:ring-1 focus:ring-ul-600 transition"
                  placeholder="usuario"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-300 rounded-lg outline-none focus:border-ul-600 focus:ring-1 focus:ring-ul-600 transition"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                    aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPwd ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full py-2.5 bg-ul-700 hover:bg-ul-800 active:bg-ul-900 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition"
              >
                {loading ? 'Verificando…' : 'Ingresar'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          © {new Date().getFullYear()} Universidad Libre Seccional Barranquilla
        </p>

      </div>
    </div>
  )
}
