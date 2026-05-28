import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import useAuthStore from '../store/authStore'

function TorchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 2C12 9 8 14 10 21C12 27 16 24 16 24C16 24 20 27 22 21C24 14 20 9 16 2Z"
        fill="currentColor" opacity="0.9"/>
      <path d="M13 22H19V38H13V22Z" fill="currentColor"/>
      <rect x="10" y="38" width="12" height="4" rx="2" fill="currentColor"/>
      <rect x="8"  y="42" width="16" height="3" rx="1.5" fill="currentColor" opacity="0.6"/>
    </svg>
  )
}

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
        <div className="bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">

          {/* Banda institucional superior */}
          <div className="bg-ul-700 px-8 py-6 flex flex-col items-center">
            <TorchIcon className="w-10 h-14 text-white mb-3" />
            <span className="text-white text-xs font-bold uppercase tracking-widest text-center leading-snug">
              Universidad Libre<br />Seccional Barranquilla
            </span>
          </div>

          {/* Formulario */}
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
                className="w-full py-2.5 bg-ul-700 hover:bg-ul-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition"
              >
                {loading ? 'Verificando…' : 'Ingresar'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Universidad Libre Seccional Barranquilla · Sistema de Gestión Académica
        </p>
      </div>
    </div>
  )
}
