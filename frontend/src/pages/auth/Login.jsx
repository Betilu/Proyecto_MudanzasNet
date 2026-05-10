import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { toastApiError, formatApiError } from '../../utils/apiToast'
import { Truck, Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react'
import { cn } from '../../lib/cn'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState(null)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setAuthMessage(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      const msg = formatApiError(err, 'Error al iniciar sesión')
      setAuthMessage(msg)
      toastApiError(err, 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-50 via-white to-slate-100">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="auth-blob -top-32 -right-24 w-80 h-80 bg-primary-300/50" />
        <div className="auth-blob -bottom-28 -left-20 w-96 h-96 bg-accent-400/25" />
      </div>

      <div className="relative w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-soft-lg shadow-glow">
            <Truck className="h-10 w-10" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">CRM Mudanzas</h1>
          <p className="mt-2 text-slate-600 text-sm sm:text-base">Inicia sesión para gestionar cotizaciones, reservas y operaciones</p>
        </div>

        <div className="rounded-2xl bg-white/90 backdrop-blur-sm p-6 sm:p-8 shadow-soft-lg border border-slate-200/80">
          {authMessage ? (
            <div
              className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 whitespace-pre-line"
              role="alert"
            >
              {authMessage}
            </div>
          ) : null}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (authMessage) setAuthMessage(null)
                  }}
                  placeholder="tu@email.com"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25 transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (authMessage) setAuthMessage(null)
                  }}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <Link
                  to="/recuperar-contrasena"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 py-3.5 text-sm font-semibold text-white shadow-md transition',
                'hover:from-primary-600 hover:to-primary-700 hover:shadow-lg hover:shadow-primary-500/20',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                'disabled:pointer-events-none disabled:opacity-55'
              )}
            >
              {loading ? 'Entrando…' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-6">
            <p className="text-center text-sm text-slate-600 mb-3">¿No tienes cuenta?</p>
            <Link
              to="/registro"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-100"
            >
              <UserPlus className="h-5 w-5" />
              Crear cuenta de cliente
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 px-2">
          Acceso seguro · Recuperación de contraseña por correo para todos los roles
        </p>
      </div>
    </div>
  )
}
