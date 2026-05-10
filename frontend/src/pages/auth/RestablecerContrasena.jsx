import { useState, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../api/client'
import { toastApiError, toastSuccess, toast } from '../../utils/apiToast'
import { Truck, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { cn } from '../../lib/cn'

export default function RestablecerContrasena() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const uid = useMemo(() => searchParams.get('uid') || '', [searchParams])
  const token = useMemo(() => searchParams.get('token') || '', [searchParams])

  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!uid || !token) {
      toast.error('Falta el enlace completo. Abre el enlace del correo o solicita uno nuevo.')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/password-reset/confirm/', {
        uid,
        token,
        new_password: password,
        new_password_confirm: password2,
      })
      toastSuccess(data.detail || 'Contraseña actualizada.')
      navigate('/login', { replace: true })
    } catch (err) {
      toastApiError(err, 'No se pudo restablecer la contraseña')
    } finally {
      setLoading(false)
    }
  }

  const linkInvalid = !uid || !token

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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Nueva contraseña</h1>
          <p className="mt-2 text-slate-600 text-sm sm:text-base">
            Elige una contraseña segura. Este paso aplica a tu cuenta en el portal, con el mismo correo con el que
            inicias sesión.
          </p>
        </div>

        <div className="rounded-2xl bg-white/90 backdrop-blur-sm p-6 sm:p-8 shadow-soft-lg border border-slate-200/80">
          {linkInvalid ? (
            <div className="space-y-4 text-sm text-slate-600">
              <p>
                Este enlace no incluye el identificador de recuperación. Usa el botón del correo o solicita un nuevo
                enlace.
              </p>
              <Link
                to="/recuperar-contrasena"
                className="flex w-full items-center justify-center rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Solicitar nuevo enlace
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="new-pass" className="block text-sm font-medium text-slate-700">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="new-pass"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
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
              </div>

              <div className="space-y-1.5">
                <label htmlFor="new-pass2" className="block text-sm font-medium text-slate-700">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="new-pass2"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25 transition"
                  />
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
                {loading ? 'Guardando…' : 'Guardar contraseña'}
              </button>
            </form>
          )}

          <div className="mt-6">
            <Link
              to="/login"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Ir al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
