import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import { toastApiError, toastSuccess } from '../utils/apiToast'

const defaultPrefs = {
  notificar_email: true,
  notificar_sms: false,
  notificar_whatsapp: false,
}

export default function Perfil() {
  const { user, updatePerfil } = useAuth()
  const [form, setForm] = useState({ nombre: '', apellido: '', telefono: '', avatar_url: '' })
  const [prefs, setPrefs] = useState(defaultPrefs)
  const [historial, setHistorial] = useState([])
  const [histLoading, setHistLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user) return
    setForm({
      nombre: user.nombre ?? '',
      apellido: user.apellido ?? '',
      telefono: user.telefono ?? '',
      avatar_url: user.avatar_url ?? '',
    })
    const p = user.preferencias_comunicacion && typeof user.preferencias_comunicacion === 'object'
      ? { ...defaultPrefs, ...user.preferencias_comunicacion }
      : defaultPrefs
    setPrefs(p)
  }, [user])

  useEffect(() => {
    if (!user) return
    setHistLoading(true)
    api.get('/auth/perfil/historial/')
      .then(({ data }) => setHistorial(Array.isArray(data) ? data : []))
      .catch(() => setHistorial([]))
      .finally(() => setHistLoading(false))
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await updatePerfil({
        ...form,
        preferencias_comunicacion: prefs,
      })
      toastSuccess('Perfil actualizado')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      toastApiError(err, 'No se pudo guardar el perfil')
    }
  }

  const togglePref = (key) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-6">Mi perfil</h1>
        <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input type="text" value={user?.email} disabled className="w-full px-4 py-2 bg-slate-800 rounded-lg opacity-75" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Apellido</label>
            <input
              type="text"
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Teléfono</label>
            <input
              type="text"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">URL foto de perfil</label>
            <input
              type="url"
              value={form.avatar_url}
              onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
              placeholder="https://..."
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg"
            />
            {form.avatar_url && (
              <img src={form.avatar_url} alt="" className="mt-2 h-16 w-16 rounded-full object-cover border border-slate-600" />
            )}
          </div>

          <div className="border border-slate-700 rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-slate-200">Preferencias de comunicación</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!prefs.notificar_email} onChange={() => togglePref('notificar_email')} />
              <span className="text-slate-300">Notificaciones por email</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!prefs.notificar_sms} onChange={() => togglePref('notificar_sms')} />
              <span className="text-slate-300">Notificaciones por SMS</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!prefs.notificar_whatsapp} onChange={() => togglePref('notificar_whatsapp')} />
              <span className="text-slate-300">Notificaciones por WhatsApp</span>
            </label>
          </div>

          <button type="submit" className="btn-primary">
            Guardar
          </button>
          {saved && <span className="ml-2 text-emerald-400">Guardado</span>}
        </form>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-200 mb-3">Historial de tu cuenta</h2>
        <p className="text-slate-500 text-sm mb-4">Acciones recientes registradas en el sistema (inicios de sesión, etc.).</p>
        {histLoading ? (
          <div className="text-slate-500">Cargando…</div>
        ) : historial.length === 0 ? (
          <p className="text-slate-500">Sin actividad registrada aún.</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto border border-slate-800 rounded-lg p-3">
            {historial.map((h) => (
              <li key={h.id} className="text-sm text-slate-300 border-b border-slate-800/80 pb-2 last:border-0">
                <span className="text-slate-500">{new Date(h.creado_en).toLocaleString('es-BO')}</span>
                {' · '}
                <span className="text-primary-400/90">{h.accion}</span>
                {h.entidad_tipo ? ` · ${h.entidad_tipo}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
