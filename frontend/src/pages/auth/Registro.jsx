import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { toastApiError } from '../../utils/apiToast'
import { Truck, Mail, User, Phone, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { cn } from '../../lib/cn'

export default function Registro() {
  const [form, setForm] = useState({
    email: '', nombre: '', apellido: '', telefono: '', password: '', password2: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showPassword2, setShowPassword2] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.password2) {
      toastApiError({ message: 'Las contraseñas no coinciden' }, 'Validación')
      return
    }
    if (form.password.length < 8) {
      toastApiError({ message: 'La contraseña debe tener al menos 8 caracteres' }, 'Validación')
      return
    }
    setLoading(true)
    try {
      await register({ ...form, password: form.password })
      navigate('/')
    } catch (err) {
      toastApiError(err, 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25 transition'

  return (
    <div className="relative min-h-screen flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-50 via-white to-slate-100">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="auth-blob -top-24 -right-16 w-72 h-72 bg-primary-300/45" />
        <div className="auth-blob bottom-0 -left-24 w-80 h-80 bg-accent-400/20" />
      </div>

      <div className="relative w-full max-w-lg space-y-6 animate-fade-in">
        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 mb-5 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Volver al inicio de sesión
          </Link>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-soft-lg">
            <Truck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Crear cuenta</h1>
          <p className="mt-2 text-slate-600 text-sm sm:text-base">Regístrate como cliente para solicitar cotizaciones</p>
        </div>

        <div className="rounded-2xl bg-white/90 backdrop-blur-sm p-6 sm:p-8 shadow-soft-lg border border-slate-200/80">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input type="email" name="email" value={form.email} onChange={handleChange} className={inputClass} required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Nombre</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input type="text" name="nombre" value={form.nombre} onChange={handleChange} className={inputClass} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Apellido</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input type="text" name="apellido" value={form.apellido} onChange={handleChange} className={inputClass} required />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Teléfono</label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input type="text" name="telefono" value={form.telefono} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Contraseña</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  minLength={8}
                  className={cn(inputClass, 'pr-12')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                  aria-label="Mostrar u ocultar contraseña"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Confirmar contraseña</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword2 ? 'text' : 'password'}
                  name="password2"
                  value={form.password2}
                  onChange={handleChange}
                  className={cn(inputClass, 'pr-12')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword2((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                  aria-label="Mostrar u ocultar confirmación"
                >
                  {showPassword2 ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 py-3.5 text-sm font-semibold text-white shadow-md transition',
                'hover:from-primary-600 hover:to-primary-700 hover:shadow-lg',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                'disabled:pointer-events-none disabled:opacity-55'
              )}
            >
              {loading ? 'Registrando…' : 'Registrarse'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
