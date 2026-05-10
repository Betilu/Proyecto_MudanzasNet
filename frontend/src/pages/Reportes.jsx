import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Play,
  Save,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  FileSpreadsheet,
  FileText,
  FileType,
  Mail,
  Loader2,
} from 'lucide-react'
import api from '../api/client'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import { toastApiError, toastMessage, toastSuccess } from '../utils/apiToast'
import { cn } from '../lib/cn'

const OP_LABELS = {
  exact: 'Igual a',
  icontains: 'Contiene',
  iexact: 'Igual (exacto)',
  gte: 'Mayor o igual',
  lte: 'Menor o igual',
  gt: 'Mayor que',
  lt: 'Menor que',
  in: 'Lista (coma)',
}

function buildPayload(fuente, columnasOrden, filtros, orden, limit = 200, offset = 0) {
  return {
    fuente,
    columnas: columnasOrden,
    filtros: filtros.filter((f) => f.field && f.op && f.value !== '' && f.value != null),
    orden,
    limit,
    offset,
  }
}

async function downloadBlob(res, fallbackName) {
  const cd = res.headers['content-disposition'] || res.headers['Content-Disposition']
  let filename = fallbackName
  if (cd) {
    const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(cd)
    if (m) filename = decodeURIComponent(m[1].replace(/['"]/g, ''))
  }
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function Reportes() {
  const [fuentes, setFuentes] = useState([])
  const [guardados, setGuardados] = useState([])
  const [fuenteSlug, setFuenteSlug] = useState('')
  const [columnasOrden, setColumnasOrden] = useState([])
  const [filtros, setFiltros] = useState([])
  const [orden, setOrden] = useState([])
  const [preview, setPreview] = useState(null)
  const [total, setTotal] = useState(0)
  const [loadingFuentes, setLoadingFuentes] = useState(true)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingExport, setLoadingExport] = useState(null)
  const [saveModal, setSaveModal] = useState(false)
  const [saveForm, setSaveForm] = useState({ nombre: '', descripcion: '', es_compartido: false })
  const [emailModal, setEmailModal] = useState(false)
  const [emailForm, setEmailForm] = useState({
    destinatario: '',
    asunto: 'Reporte exportado',
    adjuntos: ['xlsx'],
  })

  const fuenteActual = useMemo(() => fuentes.find((f) => f.slug === fuenteSlug), [fuentes, fuenteSlug])
  const columnasMap = useMemo(() => {
    const m = {}
    fuenteActual?.columns?.forEach((c) => {
      m[c.key] = c
    })
    return m
  }, [fuenteActual])

  const cargarGuardados = useCallback(() => {
    api
      .get('/reportes/personalizados/')
      .then(({ data }) => setGuardados(data.results ?? data ?? []))
      .catch(() => setGuardados([]))
  }, [])

  useEffect(() => {
    setLoadingFuentes(true)
    api
      .get('/reportes/fuentes/')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : []
        setFuentes(list)
        if (list.length) {
          const first = list[0]
          setFuenteSlug(first.slug)
          setColumnasOrden(first.columns?.slice(0, 8).map((c) => c.key) || [])
          setOrden(first.default_order?.length ? [...first.default_order] : [])
        }
      })
      .catch((e) => toastApiError(e, 'No se cargaron las fuentes'))
      .finally(() => setLoadingFuentes(false))
  }, [])

  useEffect(() => {
    cargarGuardados()
  }, [cargarGuardados])

  const alCambiarFuente = (slug) => {
    setFuenteSlug(slug)
    const f = fuentes.find((x) => x.slug === slug)
    if (f) {
      setColumnasOrden(f.columns?.slice(0, 8).map((c) => c.key) || [])
      setFiltros([])
      setOrden(f.default_order?.length ? [...f.default_order] : [])
      setPreview(null)
    }
  }

  const toggleColumna = (key) => {
    setColumnasOrden((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const moveCol = (key, dir) => {
    setColumnasOrden((prev) => {
      const i = prev.indexOf(key)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const addFiltro = () => {
    const first = fuenteActual?.columns?.[0]
    if (!first) return
    const op = first.filter_ops?.[0] || 'exact'
    setFiltros((f) => [...f, { field: first.key, op, value: '' }])
  }

  const updateFiltro = (idx, patch) => {
    setFiltros((f) => f.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  const removeFiltro = (idx) => setFiltros((f) => f.filter((_, i) => i !== idx))

  const addOrden = () => {
    const first = fuenteActual?.columns?.[0]
    if (!first) return
    setOrden((o) => [...o, { field: first.key, desc: false }])
  }

  const updateOrden = (idx, patch) => {
    setOrden((o) => o.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  const removeOrden = (idx) => setOrden((o) => o.filter((_, i) => i !== idx))

  const ejecutarVistaPrevia = () => {
    if (!fuenteSlug || !columnasOrden.length) {
      toastMessage('Selecciona fuente y al menos una columna')
      return
    }
    setLoadingPreview(true)
    const body = buildPayload(fuenteSlug, columnasOrden, filtros, orden, 150, 0)
    api
      .post('/reportes/ejecutar/', body)
      .then(({ data }) => {
        setPreview(data)
        setTotal(data.total ?? 0)
        toastSuccess(`Vista previa: ${data.filas?.length ?? 0} filas (total ${data.total ?? 0})`)
      })
      .catch((e) => toastApiError(e, 'Error al ejecutar'))
      .finally(() => setLoadingPreview(false))
  }

  const exportar = async (formato) => {
    if (!fuenteSlug || !columnasOrden.length) {
      toastMessage('Selecciona fuente y columnas')
      return
    }
    setLoadingExport(formato)
    const body = {
      ...buildPayload(fuenteSlug, columnasOrden, filtros, orden, 3500, 0),
      formato,
      titulo: saveForm.nombre || `Reporte ${fuenteActual?.label || fuenteSlug}`,
    }
    try {
      if (formato === 'email') {
        setEmailModal(true)
        setLoadingExport(null)
        return
      }
      const res = await api.post('/reportes/exportar/', body, { responseType: 'blob' })
      const ext = formato === 'xlsx' ? 'xlsx' : formato === 'pdf' ? 'pdf' : 'html'
      await downloadBlob(res, `reporte.${ext}`)
      toastSuccess('Descarga iniciada')
    } catch (e) {
      toastApiError(e, 'Error al exportar')
    } finally {
      setLoadingExport(null)
    }
  }

  const enviarEmail = async () => {
    if (!emailForm.destinatario?.trim()) {
      toastMessage('Indica el email destinatario')
      return
    }
    setLoadingExport('email')
    const body = {
      ...buildPayload(fuenteSlug, columnasOrden, filtros, orden, 3500, 0),
      formato: 'email',
      titulo: saveForm.nombre || `Reporte ${fuenteActual?.label || fuenteSlug}`,
      email_destinatario: emailForm.destinatario.trim(),
      email_asunto: emailForm.asunto || 'Reporte',
      email_adjuntos: emailForm.adjuntos?.length ? emailForm.adjuntos : ['xlsx'],
    }
    try {
      await api.post('/reportes/exportar/', body)
      toastSuccess('Correo enviado (revisa la consola si usas backend de desarrollo)')
      setEmailModal(false)
    } catch (e) {
      toastApiError(e, 'No se pudo enviar el email')
    } finally {
      setLoadingExport(null)
    }
  }

  const guardarDefinicion = () => {
    if (!saveForm.nombre?.trim()) {
      toastMessage('Nombre obligatorio')
      return
    }
    if (!fuenteSlug || !columnasOrden.length) return
    api
      .post('/reportes/personalizados/', {
        nombre: saveForm.nombre.trim(),
        descripcion: saveForm.descripcion,
        fuente: fuenteSlug,
        columnas: columnasOrden,
        filtros: filtros.filter((f) => f.field && f.op && f.value !== ''),
        orden,
        es_compartido: saveForm.es_compartido,
      })
      .then(() => {
        toastSuccess('Reporte guardado')
        setSaveModal(false)
        setSaveForm({ nombre: '', descripcion: '', es_compartido: false })
        cargarGuardados()
      })
      .catch((e) => toastApiError(e, 'No se pudo guardar'))
  }

  const cargarDefinicion = async (id) => {
    try {
      const { data } = await api.get(`/reportes/personalizados/${id}/`)
      setFuenteSlug(data.fuente)
      setColumnasOrden(data.columnas?.length ? data.columnas : [])
      setFiltros(Array.isArray(data.filtros) ? data.filtros : [])
      setOrden(Array.isArray(data.orden) ? data.orden : [])
      setPreview(null)
      toastSuccess(`Cargado: ${data.nombre}`)
    } catch (e) {
      toastApiError(e, 'Error al cargar')
    }
  }

  const eliminarDefinicion = (id) => {
    if (!window.confirm('¿Eliminar esta definición?')) return
    api
      .delete(`/reportes/personalizados/${id}/`)
      .then(() => {
        toastSuccess('Eliminado')
        cargarGuardados()
      })
      .catch((e) => toastApiError(e, 'No se pudo eliminar'))
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
          <p className="text-slate-600 text-sm mt-1 max-w-3xl">
            Construye consultas con columnas, filtros y orden; previsualiza y exporta a Excel, HTML, PDF o envía por
            correo. Las definiciones guardadas pueden compartirse con el equipo.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard KPIs
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Mis reportes guardados</h2>
        {guardados.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay plantillas. Usa &quot;Guardar definición&quot; tras configurar columnas y filtros.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {guardados.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <span className="font-medium text-slate-800">{g.nombre}</span>
                  <span className="text-slate-400 text-sm ml-2">{g.fuente}</span>
                  {g.es_compartido && (
                    <span className="ml-2 text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">Compartido</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn-ghost text-sm" onClick={() => cargarDefinicion(g.id)}>
                    Cargar
                  </button>
                  {g.es_mio && (
                    <button
                      type="button"
                      className="text-error-600 text-sm hover:underline"
                      onClick={() => eliminarDefinicion(g.id)}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-sm space-y-6">
        <h2 className="text-lg font-semibold text-slate-800">Constructor</h2>

        {loadingFuentes ? (
          <div className="flex justify-center py-12 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Fuente de datos</label>
              <select
                value={fuenteSlug}
                onChange={(e) => alCambiarFuente(e.target.value)}
                className="w-full max-w-xl rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900"
              >
                {fuentes.map((f) => (
                  <option key={f.slug} value={f.slug}>
                    {f.label}
                  </option>
                ))}
              </select>
              {fuenteActual?.description && (
                <p className="text-xs text-slate-500 mt-1">{fuenteActual.description}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Columnas a mostrar (orden de salida)</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {fuenteActual?.columns?.map((c) => (
                  <div
                    key={c.key}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm',
                      columnasOrden.includes(c.key) ? 'border-primary-300 bg-primary-50/50' : 'border-slate-200 bg-slate-50/50'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={columnasOrden.includes(c.key)}
                      onChange={() => toggleColumna(c.key)}
                      className="rounded border-slate-300"
                    />
                    <span className="flex-1 text-slate-800">{c.label}</span>
                    {columnasOrden.includes(c.key) && (
                      <span className="flex gap-0.5">
                        <button type="button" className="p-1 rounded hover:bg-white" onClick={() => moveCol(c.key, -1)}>
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button type="button" className="p-1 rounded hover:bg-white" onClick={() => moveCol(c.key, 1)}>
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Criterios de filtro (antes de generar)</span>
                <button type="button" onClick={addFiltro} className="inline-flex items-center gap-1 text-sm text-primary-600 font-medium">
                  <Plus className="h-4 w-4" /> Añadir filtro
                </button>
              </div>
              <div className="space-y-2">
                {filtros.map((row, idx) => {
                  const col = columnasMap[row.field]
                  const ops = col?.filter_ops || ['exact']
                  return (
                    <div key={idx} className="flex flex-wrap gap-2 items-end p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <select
                        value={row.field}
                        onChange={(e) => {
                          const c = fuenteActual?.columns?.find((x) => x.key === e.target.value)
                          updateFiltro(idx, {
                            field: e.target.value,
                            op: c?.filter_ops?.[0] || 'exact',
                            value: '',
                          })
                        }}
                        className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                      >
                        {fuenteActual?.columns?.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={row.op}
                        onChange={(e) => updateFiltro(idx, { op: e.target.value })}
                        className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                      >
                        {ops.map((op) => (
                          <option key={op} value={op}>
                            {OP_LABELS[op] || op}
                          </option>
                        ))}
                      </select>
                      <input
                        className="flex-1 min-w-[8rem] rounded-lg border border-slate-200 px-2 py-2 text-sm"
                        placeholder={row.op === 'in' ? 'a,b,c' : 'Valor'}
                        value={row.value ?? ''}
                        onChange={(e) => updateFiltro(idx, { value: e.target.value })}
                      />
                      <button type="button" className="p-2 text-error-600" onClick={() => removeFiltro(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Ordenación</span>
                <button type="button" onClick={addOrden} className="inline-flex items-center gap-1 text-sm text-primary-600 font-medium">
                  <Plus className="h-4 w-4" /> Añadir criterio
                </button>
              </div>
              <div className="space-y-2">
                {orden.map((row, idx) => (
                  <div key={idx} className="flex flex-wrap gap-2 items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <select
                      value={row.field}
                      onChange={(e) => updateOrden(idx, { field: e.target.value })}
                      className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                    >
                      {fuenteActual?.columns?.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={!!row.desc}
                        onChange={(e) => updateOrden(idx, { desc: e.target.checked })}
                      />
                      Descendente
                    </label>
                    <button type="button" className="p-2 text-error-600 ml-auto" onClick={() => removeOrden(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={ejecutarVistaPrevia}
                disabled={loadingPreview}
                className="inline-flex items-center gap-2 btn-primary"
              >
                {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Vista previa
              </button>
              <button type="button" onClick={() => setSaveModal(true)} className="inline-flex items-center gap-2 btn-ghost border border-slate-200">
                <Save className="h-4 w-4" />
                Guardar definición
              </button>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-700 mb-3">Exportar (respeta filtros y columnas)</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!!loadingExport}
                  onClick={() => exportar('xlsx')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  Excel
                </button>
                <button
                  type="button"
                  disabled={!!loadingExport}
                  onClick={() => exportar('html')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  <FileText className="h-4 w-4 text-amber-600" />
                  HTML
                </button>
                <button
                  type="button"
                  disabled={!!loadingExport}
                  onClick={() => exportar('pdf')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  <FileType className="h-4 w-4 text-red-600" />
                  PDF
                </button>
                <button
                  type="button"
                  disabled={!!loadingExport}
                  onClick={() => exportar('email')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  <Mail className="h-4 w-4 text-primary-600" />
                  e-mail
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {preview?.filas?.length > 0 && (
        <section className="rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-sm overflow-x-auto">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">
            Vista previa ({preview.filas.length} de {total} registros)
          </h3>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-600">
                {preview.columnas?.map((c) => (
                  <th key={c.key} className="px-3 py-2 font-medium whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {preview.filas.map((fila, i) => (
                <tr key={i} className="text-slate-800">
                  {preview.columnas?.map((c) => (
                    <td key={c.key} className="px-3 py-2 whitespace-nowrap max-w-[14rem] truncate" title={String(fila[c.key] ?? '')}>
                      {fila[c.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <Modal open={saveModal} onClose={() => setSaveModal(false)} title="Guardar reporte personalizado">
        <div className="space-y-4">
          <FormInput
            label="Nombre"
            value={saveForm.nombre}
            onChange={(e) => setSaveForm((s) => ({ ...s, nombre: e.target.value }))}
            required
          />
          <FormInput
            label="Descripción"
            value={saveForm.descripcion}
            onChange={(e) => setSaveForm((s) => ({ ...s, descripcion: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={saveForm.es_compartido}
              onChange={(e) => setSaveForm((s) => ({ ...s, es_compartido: e.target.checked }))}
            />
            Compartir con otros usuarios (solo lectura / cargar)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setSaveModal(false)}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={guardarDefinicion}>
              Guardar
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={emailModal} onClose={() => setEmailModal(false)} title="Enviar reporte por correo">
        <div className="space-y-4">
          <FormInput
            label="Destinatario"
            type="email"
            value={emailForm.destinatario}
            onChange={(e) => setEmailForm((s) => ({ ...s, destinatario: e.target.value }))}
            required
          />
          <FormInput
            label="Asunto"
            value={emailForm.asunto}
            onChange={(e) => setEmailForm((s) => ({ ...s, asunto: e.target.value }))}
          />
          <div>
            <p className="text-sm text-slate-600 mb-2">Adjuntos</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={emailForm.adjuntos.includes('xlsx')}
                onChange={(e) => {
                  const on = e.target.checked
                  setEmailForm((s) => ({
                    ...s,
                    adjuntos: on ? [...new Set([...s.adjuntos, 'xlsx'])] : s.adjuntos.filter((x) => x !== 'xlsx'),
                  }))
                }}
              />
              Excel (.xlsx)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={emailForm.adjuntos.includes('pdf')}
                onChange={(e) => {
                  const on = e.target.checked
                  setEmailForm((s) => ({
                    ...s,
                    adjuntos: on ? [...new Set([...s.adjuntos, 'pdf'])] : s.adjuntos.filter((x) => x !== 'pdf'),
                  }))
                }}
              />
              PDF
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setEmailModal(false)}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" disabled={loadingExport === 'email'} onClick={enviarEmail}>
              {loadingExport === 'email' ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
