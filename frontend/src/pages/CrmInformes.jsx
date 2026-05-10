import { useEffect, useState } from 'react'
import { Brain, PieChart, Tags, RefreshCw } from 'lucide-react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import FormInput from '../components/FormInput'
import FormTextarea from '../components/FormTextarea'
import Modal from '../components/Modal'
import { formatApiErrorData, toastApiError, toastSuccess } from '../utils/apiToast'
import {
  CrmHubNav,
  CrmPageHeader,
  CrmSection,
  CrmKpiCard,
} from '../components/crm/CrmShell'

const LABEL_ESTADO_COT = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  expirada: 'Expirada',
}

function Bar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-mono tabular-nums text-slate-900">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function CrmInformes() {
  const [metricas, setMetricas] = useState(null)
  const [segmentos, setSegmentos] = useState([])
  const [segModal, setSegModal] = useState({ open: false, s: null })
  const [segForm, setSegForm] = useState({ nombre: '', descripcion: '', color: '#f59e0b' })
  const [loading, setLoading] = useState(true)
  const [rfBusy, setRfBusy] = useState(false)
  const [rfMsg, setRfMsg] = useState('')
  const [err, setErr] = useState('')

  const loadMetricas = () => {
    api
      .get('/clientes/crm/reportes-comportamiento/')
      .then(({ data }) => setMetricas(data))
      .catch(() => setMetricas(null))
  }

  const loadSegmentos = () => {
    api
      .get('/clientes/segmentos/')
      .then(({ data }) => setSegmentos(data.results ?? data ?? []))
      .catch(() => setSegmentos([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadMetricas()
    loadSegmentos()
  }, [])

  const ejecutarRf = () => {
    setRfMsg('')
    setRfBusy(true)
    api
      .post('/clientes/crm/prediccion-lealtad/')
      .then(({ data }) => {
        const modo = data.metodo || 'ok'
        const msg = `Clientes actualizados: ${data.actualizados}. Método: ${modo}.`
        setRfMsg(
          data.alcance === 'lealtad_cliente_crm'
            ? `${msg} (Solo lealtad CRM — no afecta precios de cotizaciones.)`
            : msg
        )
        toastSuccess(msg)
        loadMetricas()
      })
      .catch((e) => setRfMsg(e.response?.data?.detail || 'Error'))
      .finally(() => setRfBusy(false))
  }

  const openSeg = (s) => {
    if (s) setSegForm({ nombre: s.nombre, descripcion: s.descripcion || '', color: s.color || '#f59e0b' })
    else setSegForm({ nombre: '', descripcion: '', color: '#f59e0b' })
    setSegModal({ open: true, s })
  }

  const saveSeg = (e) => {
    e.preventDefault()
    const req = segModal.s
      ? api.patch(`/clientes/segmentos/${segModal.s.id}/`, segForm)
      : api.post('/clientes/segmentos/', segForm)
    req
      .then(() => {
        toastSuccess(segModal.s ? 'Segmento actualizado' : 'Segmento creado')
        loadSegmentos()
        setSegModal({ open: false, s: null })
        setErr('')
      })
      .catch((e) => {
        setErr(formatApiErrorData(e.response?.data) || 'Error al guardar')
      })
  }

  const delSeg = (s) => {
    if (!window.confirm(`¿Eliminar segmento ${s.nombre}?`)) return
    api
      .delete(`/clientes/segmentos/${s.id}/`)
      .then(() => {
        toastSuccess('Segmento eliminado')
        loadSegmentos()
      })
      .catch((e) => toastApiError(e, 'No se pudo eliminar'))
  }

  const predicho = metricas?.clientes_por_segmento_predicho || {}
  const tipos = metricas?.clientes_por_tipo || {}
  const maxPred = Math.max(1, ...Object.values(predicho))
  const maxTipo = Math.max(1, ...Object.values(tipos))

  const segColumns = [
    { key: 'nombre', label: 'Segmento' },
    { key: 'descripcion', label: 'Descripción' },
    {
      key: 'color',
      label: 'Color',
      render: (r) => r.color && <span className="inline-block h-4 w-4 rounded border border-slate-200" style={{ background: r.color }} />,
    },
  ]

  return (
    <div className="animate-fade-in space-y-8">
      <CrmHubNav />

      <CrmPageHeader
        title="Inteligencia de clientes"
        description="Predicción de lealtad, embudo de cotizaciones reciente y segmentación para priorizar acciones comerciales."
      />

      {err && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">{err}</div>
      )}

      <CrmSection
        title="Lealtad del cliente (Random Forest, CRM)"
        description="Actualiza probabilidad de retención y segmento (alto / medio / bajo) en cada perfil de cliente. Usa mudanzas, gasto y recencia — es independiente de la IA de precios en cotizaciones."
        action={
          <button
            type="button"
            onClick={ejecutarRf}
            disabled={rfBusy}
            className="btn-primary btn-primary-sm inline-flex items-center gap-2 disabled:opacity-60"
          >
            {rfBusy ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Brain className="h-3.5 w-3.5" aria-hidden />
            )}
            {rfBusy ? 'Ejecutando…' : 'Ejecutar modelo'}
          </button>
        }
      >
        <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-4">
          <p className="text-sm text-slate-600">
            El resultado solo escribe <strong>rf_probabilidad_retencion</strong> y{' '}
            <strong>rf_segmento_predicho</strong> en <strong>Cliente</strong> (columnas Lealtad en la cartera y
            ficha CRM). No modifica <strong>rf_precio_predicho</strong> ni otros campos de cotizaciones.
          </p>
          {rfMsg && (
            <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              {rfMsg}
            </p>
          )}
        </div>
      </CrmSection>

      {metricas && (
        <CrmSection
          title="Salud de la cartera"
          description="Actividad, riesgo de inactividad y embudo de cotizaciones (90 días)."
        >
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <CrmKpiCard label="Clientes totales" value={metricas.total_clientes} accent="slate" />
            <CrmKpiCard
              label="Activos (180 días)"
              value={metricas.clientes_activos_ultimos_180d}
              hint="Con servicio reciente."
              accent="emerald"
            />
            <CrmKpiCard
              label="Posible churn (180 días)"
              value={metricas.clientes_posible_churn_180d}
              hint="Histórico sin reserva reciente."
              accent="rose"
            />
          </div>

          <div className="mb-8 rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary-600" aria-hidden />
              <h3 className="text-sm font-semibold text-slate-900">Cotizaciones — últimos 90 días</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <CrmKpiCard
                label="Creadas"
                value={metricas.cotizaciones_creadas_ultimos_90d ?? '—'}
                accent="primary"
              />
              <CrmKpiCard
                label="Enviadas"
                value={metricas.cotizaciones_enviadas_ultimos_90d ?? '—'}
                hint="En pipeline con cliente."
                accent="amber"
              />
              <CrmKpiCard
                label="Aceptadas"
                value={metricas.cotizaciones_aceptadas_ultimos_90d ?? '—'}
                accent="emerald"
              />
              <CrmKpiCard
                label="Rechazadas"
                value={metricas.cotizaciones_rechazadas_ultimos_90d ?? '—'}
                accent="rose"
              />
            </div>
            {metricas.tasa_aceptacion_sobre_cerradas_90d_pct != null && (
              <p className="mt-4 text-sm text-slate-600">
                <span className="font-medium text-slate-800">Tasa de aceptación</span> (sobre cerradas en el periodo):{' '}
                <span className="font-mono font-semibold text-primary-700">
                  {metricas.tasa_aceptacion_sobre_cerradas_90d_pct}%
                </span>
              </p>
            )}
            {metricas.cotizaciones_por_estado_ultimos_90d &&
              Object.keys(metricas.cotizaciones_por_estado_ultimos_90d).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(metricas.cotizaciones_por_estado_ultimos_90d).map(([est, n]) => (
                    <span
                      key={est}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm"
                    >
                      <span className="text-slate-500">{LABEL_ESTADO_COT[est] || est}</span>
                      <span className="font-mono text-slate-900">{n}</span>
                    </span>
                  ))}
                </div>
              )}
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Por segmento predicho (RF)</h3>
              {Object.keys(predicho).length === 0 && (
                <p className="text-sm text-slate-500">Sin datos. Ejecuta el modelo de lealtad.</p>
              )}
              {Object.entries(predicho).map(([k, v]) => (
                <Bar key={k} label={k || '—'} value={v} max={maxPred} color="bg-violet-500" />
              ))}
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Por tipo de cliente</h3>
              {Object.entries(tipos).map(([k, v]) => (
                <Bar key={k} label={k} value={v} max={maxTipo} color="bg-primary-500" />
              ))}
            </div>
          </div>
        </CrmSection>
      )}

      <CrmSection
        title="Segmentos comerciales"
        description="Etiquetas para campañas y priorización (W13)."
        action={
          <button type="button" onClick={() => openSeg(null)} className="btn-primary btn-primary-sm inline-flex items-center gap-1.5">
            <Tags className="h-3.5 w-3.5" aria-hidden />
            Nuevo segmento
          </button>
        }
      >
        <DataTable
          columns={segColumns}
          data={segmentos}
          loading={loading}
          onEdit={(s) => openSeg(s)}
          onDelete={delSeg}
        />
      </CrmSection>

      <Modal open={segModal.open} onClose={() => setSegModal({ open: false, s: null })} title={segModal.s ? 'Editar segmento' : 'Nuevo segmento'}>
        <form onSubmit={saveSeg} className="space-y-3">
          <FormInput
            label="Nombre"
            value={segForm.nombre}
            onChange={(e) => setSegForm({ ...segForm, nombre: e.target.value })}
            required
          />
          <FormTextarea
            label="Descripción"
            value={segForm.descripcion}
            onChange={(e) => setSegForm({ ...segForm, descripcion: e.target.value })}
          />
          <FormInput
            label="Color (#hex)"
            value={segForm.color}
            onChange={(e) => setSegForm({ ...segForm, color: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <button type="submit" className="btn-primary">
              Guardar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
