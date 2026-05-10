import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  RefreshCw,
  ClipboardList,
  CalendarCheck,
  TrendingUp,
  Users,
} from 'lucide-react'
import api from '../api/client'
import { cn } from '../lib/cn'
import {
  CrmHubNav,
  CrmPageHeader,
  CrmKpiCard,
  CrmSection,
  CrmCotizacionBadge,
  CrmEmptyState,
} from '../components/crm/CrmShell'

const labelsCot = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  expirada: 'Expirada',
}

const labelsRes = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  en_proceso: 'En proceso',
  completada: 'Completada',
  cancelada: 'Cancelada',
  reprogramada: 'Reprogramada',
}

/** Orden lógico del embudo comercial (cotización). */
const FUNNEL_COT_ORDER = ['borrador', 'enviada', 'aceptada', 'rechazada', 'expirada']

function FunnelCotizaciones({ counts }) {
  const entries = FUNNEL_COT_ORDER.map((k) => ({
    key: k,
    label: labelsCot[k] || k,
    n: counts[k] ?? 0,
  }))
  const max = Math.max(1, ...entries.map((e) => e.n))
  return (
    <div className="space-y-3">
      {entries.map((e, i) => (
        <div key={e.key} className="flex items-center gap-3">
          <div className="flex w-28 shrink-0 items-center gap-2 text-xs font-medium text-slate-600 sm:w-36">
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white',
                i === 0 && 'bg-slate-500',
                i === 1 && 'bg-sky-500',
                i === 2 && 'bg-emerald-500',
                i >= 3 && 'bg-slate-400'
              )}
            >
              {i + 1}
            </span>
            <span className="truncate">{e.label}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  e.key === 'aceptada' && 'bg-emerald-500',
                  e.key === 'enviada' && 'bg-sky-500',
                  e.key === 'borrador' && 'bg-slate-500',
                  (e.key === 'rechazada' || e.key === 'expirada') && 'bg-rose-400'
                )}
                style={{ width: `${Math.max(8, (e.n / max) * 100)}%` }}
              />
            </div>
          </div>
          <span className="w-10 shrink-0 text-right font-mono text-sm font-semibold tabular-nums text-slate-900">
            {e.n}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function CrmPipeline() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api
      .get('/clientes/crm/pipeline/')
      .then(({ data: d }) => setData(d))
      .catch((e) => setError(e.response?.data?.detail || 'Sin acceso o error al cargar'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (error) {
    return (
      <div className="animate-fade-in">
        <CrmHubNav className="mb-6" />
        <CrmPageHeader
          title="Pipeline comercial"
          description="No se pudo cargar el tablero. Comprueba permisos (crm.pipeline_solicitudes) o vuelve a intentar."
        />
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      </div>
    )
  }

  if (!data || loading) {
    return (
      <div className="animate-fade-in">
        <CrmHubNav className="mb-6" />
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/90 bg-white/80">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <p className="text-sm text-slate-500">Cargando pipeline…</p>
        </div>
      </div>
    )
  }

  const cot = data.cotizaciones_por_estado || {}
  const res = data.reservas_por_estado || {}
  const totalCot = Object.values(cot).reduce((a, b) => a + b, 0)
  const totalRes = Object.values(res).reduce((a, b) => a + b, 0)

  return (
    <div className="animate-fade-in">
      <CrmHubNav className="mb-6" />

      <CrmPageHeader
        title="Pipeline comercial"
        description="Vista operativa del embudo: cotizaciones como oportunidades y reservas como compromisos de servicio. Actúa desde Cotizaciones y Reservas para avanzar estados."
      >
        <button
          type="button"
          onClick={load}
          className="btn-secondary btn-primary-sm inline-flex items-center gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Actualizar
        </button>
      </CrmPageHeader>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CrmKpiCard
          label="Leads abiertos"
          value={data.cotizaciones_activas_leads ?? '—'}
          hint="Borrador + enviada: requieren seguimiento."
          accent="amber"
        />
        <CrmKpiCard
          label="Cotizaciones (total)"
          value={totalCot}
          hint="Todos los estados en sistema."
          accent="primary"
        />
        <CrmKpiCard
          label="Reservas (total)"
          value={totalRes}
          hint="Compromisos generados al aceptar."
          accent="emerald"
        />
        <CrmKpiCard
          label="Reservas confirmadas"
          value={res.confirmada ?? 0}
          hint="Listas para asignar operación."
          accent="violet"
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <CrmSection
          title="Embudo de cotizaciones"
          description="De borrador a cierre — volumen por etapa."
          action={
            <Link to="/cotizaciones" className="btn-secondary btn-primary-sm inline-flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" aria-hidden />
              Ir a cotizaciones
            </Link>
          }
        >
          <FunnelCotizaciones counts={cot} />
        </CrmSection>

        <CrmSection
          title="Reservas por estado"
          description="Seguimiento operativo posterior a la aceptación."
          action={
            <Link to="/reservas" className="btn-secondary btn-primary-sm inline-flex items-center gap-1.5">
              <CalendarCheck className="h-3.5 w-3.5" aria-hidden />
              Ir a reservas
            </Link>
          }
        >
          <ul className="divide-y divide-slate-100">
            {Object.entries(res).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between py-3 first:pt-0">
                <span className="text-sm font-medium text-slate-700">{labelsRes[k] || k}</span>
                <span className="font-mono text-base font-semibold tabular-nums text-emerald-700">{v}</span>
              </li>
            ))}
            {!Object.keys(res).length && (
              <li className="py-6 text-center text-sm text-slate-500">Sin reservas registradas.</li>
            )}
          </ul>
        </CrmSection>
      </div>

      <CrmSection
        title="Actividad reciente"
        description="Últimas cotizaciones con acceso rápido a la ficha del cliente y al detalle."
        action={
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            Ordenadas por fecha
          </span>
        }
      >
        <div className="overflow-hidden rounded-xl border border-slate-200/90">
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur-sm">
                <tr>
                  <th className="px-3 py-3 font-medium">Fecha</th>
                  <th className="px-3 py-3 font-medium">Cot.</th>
                  <th className="px-3 py-3 font-medium">Cliente</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-3 py-3 font-medium">Servicio</th>
                  <th className="px-3 py-3 font-medium">Bs ref.</th>
                  <th className="px-3 py-3 font-medium">Reserva</th>
                  <th className="px-3 py-3 font-medium"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(data.ultimas_cotizaciones || []).map((row) => (
                  <tr key={row.id} className="transition hover:bg-primary-50/40">
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500">
                      {row.creado_en
                        ? new Date(row.creado_en).toLocaleString('es-BO', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-sm font-semibold text-primary-700">{row.id}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        to="/clientes"
                        state={{ openClienteId: row.cliente_id }}
                        className="inline-flex items-center gap-1.5 font-medium text-slate-800 hover:text-primary-700"
                      >
                        <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                        <span className="truncate max-w-[10rem] sm:max-w-[14rem]">
                          {row.cliente_nombre || `Cliente #${row.cliente_id}`}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <CrmCotizacionBadge estado={row.estado} labels={labelsCot} />
                    </td>
                    <td
                      className="max-w-[140px] truncate px-3 py-2.5 text-xs text-slate-600"
                      title={row.tipo_servicio || ''}
                    >
                      {row.tipo_servicio || '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-800">
                      {row.precio_referencia ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{row.reserva_codigo || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <Link
                        to={`/cotizaciones?cotizacion=${row.id}`}
                        className="text-sm font-semibold text-primary-600 hover:text-primary-800 hover:underline"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!(data.ultimas_cotizaciones || []).length && (
            <CrmEmptyState title="Sin movimiento reciente" hint="Las nuevas cotizaciones aparecerán aquí automáticamente." />
          )}
        </div>
      </CrmSection>
    </div>
  )
}
