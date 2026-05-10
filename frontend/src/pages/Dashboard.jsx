import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import { LayoutDashboard } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/reportes/dashboard/')
      .then(({ data: d }) => setData(d))
      .catch(() =>
        setData({
          vista: 'admin',
          reservas_hoy: 0,
          cotizaciones_pendientes: 0,
          clientes_total: 0,
          ingresos_mes: 0,
          servicios_completados: 0,
        })
      )
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  const vista = data?.vista || 'admin'
  const titulo =
    vista === 'cliente'
      ? 'Tu resumen'
      : vista === 'operativo'
        ? 'Panel operativo'
        : vista === 'operador'
          ? 'Panel operador'
          : 'Dashboard'

  let cards = []
  if (vista === 'cliente') {
    cards = [
      { label: 'Reservas activas', value: data?.reservas_activas ?? 0, accent: 'from-primary-500/25 to-primary-700/10' },
      { label: 'Cotizaciones pendientes', value: data?.cotizaciones_pendientes ?? 0, accent: 'from-sky-500/20 to-blue-700/10' },
      { label: 'Pagos pendientes', value: data?.pagos_pendientes ?? 0, accent: 'from-rose-500/20 to-rose-700/10' },
      { label: 'Próximas mudanzas', value: data?.proximas_mudanzas ?? 0, accent: 'from-emerald-500/20 to-emerald-700/10' },
    ]
  } else if (vista === 'operativo') {
    cards = [
      { label: 'Servicios asignados', value: data?.servicios_asignados ?? 0, accent: 'from-primary-500/25 to-primary-700/10' },
      { label: 'En curso', value: data?.servicios_en_curso ?? 0, accent: 'from-sky-500/20 to-blue-700/10' },
      { label: 'Completados (historial)', value: data?.servicios_completados_total ?? 0, accent: 'from-emerald-500/20 to-emerald-700/10' },
    ]
  } else if (vista === 'operador') {
    cards = [
      { label: 'Reservas hoy', value: data?.reservas_hoy ?? 0, accent: 'from-primary-500/25 to-primary-700/10' },
      { label: 'Cotizaciones pendientes', value: data?.cotizaciones_pendientes ?? 0, accent: 'from-sky-500/20 to-blue-700/10' },
      { label: 'Clientes total', value: data?.clientes_total ?? 0, accent: 'from-emerald-500/20 to-emerald-700/10' },
      {
        label: 'Ingresos del mes (Bs)',
        value: Number(data?.ingresos_mes ?? 0).toFixed(2),
        accent: 'from-success-500/20 to-emerald-800/10',
      },
      { label: 'Servicios completados', value: data?.servicios_completados ?? 0, accent: 'from-accent-500/20 to-purple-900/10' },
      { label: 'Mudanzas activas', value: data?.mudanzas_activas ?? 0, accent: 'from-warning-500/20 to-orange-800/10' },
    ]
  } else {
    cards = [
      { label: 'Reservas hoy', value: data?.reservas_hoy ?? 0, accent: 'from-primary-500/25 to-primary-700/10' },
      { label: 'Cotizaciones pendientes', value: data?.cotizaciones_pendientes ?? 0, accent: 'from-sky-500/20 to-blue-700/10' },
      { label: 'Clientes total', value: data?.clientes_total ?? 0, accent: 'from-emerald-500/20 to-emerald-700/10' },
      {
        label: 'Ingresos del mes (Bs)',
        value: Number(data?.ingresos_mes ?? 0).toFixed(2),
        accent: 'from-success-500/20 to-emerald-800/10',
      },
      { label: 'Servicios completados', value: data?.servicios_completados ?? 0, accent: 'from-accent-500/20 to-purple-900/10' },
    ]
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-800">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Resumen
          </div>
          <h1 className="page-title bg-gradient-to-r from-slate-900 via-slate-800 to-primary-800 bg-clip-text text-transparent">
            {titulo}
          </h1>
          {user?.rol_nombre && (
            <p className="page-subtitle capitalize">
              Rol: <span className="font-medium text-primary-700">{user.rol_nombre}</span>
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map(({ label, value, accent }) => (
          <div key={label} className="card-metric group">
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-80 transition group-hover:opacity-100`}
              aria-hidden
            />
            <div className="relative">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:text-sm">{label}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
