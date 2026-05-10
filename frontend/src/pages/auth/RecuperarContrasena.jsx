import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import { toastApiError, toastSuccess } from '../../utils/apiToast'
import { Truck, Mail, ArrowLeft } from 'lucide-react'
import { cn } from '../../lib/cn'

export default function RecuperarContrasena() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/password-reset/', { email: email.trim() })
      toastSuccess(data.detail || 'Revisa tu correo para continuar.')
      setSent(true)
    } catch (err) {
      toastApiError(err, 'No se pudo procesar la solicitud')
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Recuperar contraseña</h1>
          <p className="mt-2 text-slate-600 text-sm sm:text-base">
            Indica el correo de tu cuenta. Si está registrado, te enviaremos un enlace para elegir una nueva
            contraseña (válido para cualquier rol: cliente, operador, conductor, etc.).
          </p>
        </div>

        <div className="rounded-2xl bg-white/90 backdrop-blur-sm p-6 sm:p-8 shadow-soft-lg border border-slate-200/80">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25 transition"
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
                {loading ? 'Enviando…' : 'Enviar enlace'}
              </button>
            </form>
          ) : (
            <p className="text-sm text-slate-600 leading-relaxed">
              Si el correo existe en el sistema, recibirás un mensaje con un enlace seguro. Revisa también la
              carpeta de spam.
            </p>
          )}

          <div className="mt-6">
            <Link
              to="/login"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
