import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { User, History, MessageSquare, BellRing, Building2, Mail } from 'lucide-react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import FormSelect from '../components/FormSelect'
import FormTextarea from '../components/FormTextarea'
import {
  CrmHubNav,
  CrmPageHeader,
  CrmCotizacionBadge,
  CrmEmptyState,
} from '../components/crm/CrmShell'
import { useAuth } from '../context/AuthContext'
import { toastApiError, toastSuccess } from '../utils/apiToast'
import { cn } from '../lib/cn'
import { PAGE_SIZE, parsePagedResponse } from '../utils/paging'

const CANALES = [
  { id: 'llamada', nombre: 'Llamada' },
  { id: 'email', nombre: 'Email' },
  { id: 'sms', nombre: 'SMS' },
  { id: 'whatsapp', nombre: 'WhatsApp' },
  { id: 'mensaje', nombre: 'Mensaje / chat' },
  { id: 'sistema', nombre: 'Sistema' },
]

const TIPOS_ALERTA = [
  { id: 'seguimiento', nombre: 'Seguimiento' },
  { id: 'reactivacion', nombre: 'Reactivación' },
  { id: 'promocion', nombre: 'Promoción' },
  { id: 'recordatorio', nombre: 'Recordatorio' },
]

const LABEL_ESTADO_COT = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  expirada: 'Expirada',
}

function fmtShort(s, n = 48) {
  if (!s) return '—'
  const t = String(s).trim()
  return t.length <= n ? t : `${t.slice(0, n)}…`
}

function iniciales(nombre) {
  if (!nombre) return '?'
  const p = String(nombre).trim().split(/\s+/).filter(Boolean)
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase()
  return p[0].slice(0, 2).toUpperCase()
}

const FICHA_TABS = [
  { id: 'resumen', label: 'Resumen', icon: User },
  { id: 'historial', label: 'Historial', icon: History },
  { id: 'comunicaciones', label: 'Comunicaciones', icon: MessageSquare },
  { id: 'alertas', label: 'Alertas', icon: BellRing },
]

export default function Clientes() {
  const { isAdmin, hasPermission } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const puedeVer = () => isAdmin() || hasPermission('crm.ver_clientes')
  const puedeRegistrar = () => isAdmin() || hasPermission('crm.registro_cliente') || hasPermission('crm.editar_clientes')
  const puedeHistorial = () => isAdmin() || hasPermission('crm.historial_mudanzas')
  const puedeCom = () => isAdmin() || hasPermission('crm.log_comunicaciones')
  const puedeAlertas = () => isAdmin() || hasPermission('crm.alertas_seguimiento')
  const puedeEliminar = () => isAdmin() || hasPermission('crm.eliminar_cliente')

  const [clientes, setClientes] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [tiposServicio, setTiposServicio] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, cliente: null })
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [ficha, setFicha] = useState({ open: false, cliente: null, tab: 'resumen' })
  const [historial, setHistorial] = useState(null)
  const [histLoad, setHistLoad] = useState(false)
  const [coms, setComs] = useState([])
  const [alerts, setAlerts] = useState([])
  const [comForm, setComForm] = useState({ canal: 'llamada', asunto: '', contenido: '', direccion: 'saliente' })
  const [alertForm, setAlertForm] = useState({
    tipo: 'seguimiento', titulo: '', descripcion: '', fecha_programada: '', estado: 'pendiente',
  })

  const fetchClientes = () => {
    setLoading(true)
    const params = { page }
    if (search) params.search = search
    api
      .get('/clientes/', { params })
      .then(({ data }) => {
        const { results, count } = parsePagedResponse(data)
        setClientes(results)
        setTotalCount(count)
      })
      .catch(() => {
        setClientes([])
        setTotalCount(0)
      })
      .finally(() => setLoading(false))
  }

  const fetchUsuarios = () => {
    api.get('/auth/usuarios/').then(({ data }) => setUsuarios(data.results ?? data ?? [])).catch(() => setUsuarios([]))
  }

  useEffect(() => {
    if (puedeVer()) fetchClientes()
  }, [search, page])

  useEffect(() => {
    if (puedeRegistrar()) {
      fetchUsuarios()
      api.get('/servicios/tipos/').then(({ data }) => setTiposServicio(data.results ?? data ?? [])).catch(() => setTiposServicio([]))
    }
  }, [])

  /** Desde pipeline CRM: abrir ficha en pestaña historial comercial */
  useEffect(() => {
    const id = location.state?.openClienteId
    if (!id || !puedeVer()) return
    api
      .get(`/clientes/${id}/`)
      .then(({ data }) => {
        if (!data?.id) return
        setFicha({ open: true, cliente: data, tab: 'historial' })
        setHistorial(null)
        setComForm({ canal: 'llamada', asunto: '', contenido: '', direccion: 'saliente' })
        setAlertForm({
          tipo: 'seguimiento',
          titulo: '',
          descripcion: '',
          fecha_programada: '',
          estado: 'pendiente',
        })
        navigate('/clientes', { replace: true, state: {} })
      })
      .catch(() => {})
  }, [location.state, navigate])

  const loadFichaData = (clienteId) => {
    if (puedeHistorial()) {
      setHistLoad(true)
      api.get(`/clientes/${clienteId}/historial/`)
        .then(({ data }) => setHistorial(data))
        .catch(() => setHistorial(null))
        .finally(() => setHistLoad(false))
    }
    if (puedeCom()) {
      api.get('/clientes/comunicaciones/', { params: { cliente: clienteId } })
        .then(({ data }) => setComs(data.results ?? data ?? []))
        .catch(() => setComs([]))
    }
    if (puedeAlertas()) {
      api.get('/clientes/alertas/', { params: { cliente: clienteId } })
        .then(({ data }) => setAlerts(data.results ?? data ?? []))
        .catch(() => setAlerts([]))
    }
  }

  useEffect(() => {
    if (ficha.open && ficha.cliente?.id) loadFichaData(ficha.cliente.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarga al abrir ficha
  }, [ficha.open, ficha.cliente?.id])

  const isEditing = !!modal.cliente?.id

  const openCreate = () => {
    setModal({ open: true, cliente: null })
    setForm({
      usuario: '',
      tipo_cliente: 'residencial',
      nombre_empresa: '',
      nit: '',
      direccion_predeterminada: '',
      direccion_origen_habitual: '',
      direccion_destino_habitual: '',
      tipo_mudanza_preferido: '',
      preferencia_comunicacion: 'email',
    })
    setErrors({})
  }

  const openEdit = (c) => {
    setModal({ open: true, cliente: c })
    setForm({
      usuario: c.usuario,
      tipo_cliente: c.tipo_cliente || 'residencial',
      nombre_empresa: c.nombre_empresa || '',
      nit: c.nit || '',
      direccion_predeterminada: c.direccion_predeterminada || '',
      direccion_origen_habitual: c.direccion_origen_habitual || '',
      direccion_destino_habitual: c.direccion_destino_habitual || '',
      tipo_mudanza_preferido: c.tipo_mudanza_preferido ?? '',
      preferencia_comunicacion: c.preferencia_comunicacion || 'email',
    })
    setErrors({})
  }

  const openFicha = (c) => {
    setFicha({ open: true, cliente: c, tab: 'resumen' })
    setHistorial(null)
    setComForm({ canal: 'llamada', asunto: '', contenido: '', direccion: 'saliente' })
    setAlertForm({ tipo: 'seguimiento', titulo: '', descripcion: '', fecha_programada: '', estado: 'pendiente' })
  }

  const closeModal = () => setModal({ open: false, cliente: null })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrors({})
    const payload = {
      ...form,
      usuario: form.usuario ? parseInt(form.usuario, 10) : null,
      tipo_mudanza_preferido: form.tipo_mudanza_preferido ? parseInt(form.tipo_mudanza_preferido, 10) : null,
    }
    setSaving(true)
    const req = isEditing
      ? api.patch(`/clientes/${modal.cliente.id}/`, payload)
      : api.post('/clientes/', payload)
    req
      .then(() => {
        toastSuccess(isEditing ? 'Cliente actualizado' : 'Cliente registrado')
        fetchClientes()
        closeModal()
      })
      .catch((err) => {
        setErrors(err.response?.data || {})
        toastApiError(err)
      })
      .finally(() => setSaving(false))
  }

  const handleDelete = (c) => {
    if (!window.confirm(`¿Eliminar cliente ${c.usuario_nombre}?`)) return
    api
      .delete(`/clientes/${c.id}/`)
      .then(() => {
        toastSuccess('Cliente eliminado')
        fetchClientes()
      })
      .catch((err) => toastApiError(err, 'Error al eliminar'))
  }

  const addComunicacion = (e) => {
    e.preventDefault()
    if (!ficha.cliente) return
    api
      .post('/clientes/comunicaciones/', {
        cliente: ficha.cliente.id,
        canal: comForm.canal,
        asunto: comForm.asunto,
        contenido: comForm.contenido,
        direccion: comForm.direccion,
      })
      .then(() => {
        toastSuccess('Comunicación registrada')
        loadFichaData(ficha.cliente.id)
      })
      .catch((err) => toastApiError(err, 'No se pudo registrar la comunicación'))
  }

  const addAlerta = (e) => {
    e.preventDefault()
    if (!ficha.cliente || !alertForm.fecha_programada) return
    api
      .post('/clientes/alertas/', {
        cliente: ficha.cliente.id,
        tipo: alertForm.tipo,
        titulo: alertForm.titulo,
        descripcion: alertForm.descripcion,
        fecha_programada: new Date(alertForm.fecha_programada).toISOString(),
        estado: alertForm.estado,
      })
      .then(() => {
        toastSuccess('Alerta creada')
        loadFichaData(ficha.cliente.id)
      })
      .catch((err) => toastApiError(err, 'No se pudo crear la alerta'))
  }

  const usuariosSinCliente = usuarios.filter((u) => !clientes.some((c) => c.usuario === u.id))

  const columns = [
    { key: 'usuario_nombre', label: 'Cliente' },
    { key: 'usuario_email', label: 'Email' },
    { key: 'tipo_cliente', label: 'Tipo' },
    { key: 'cantidad_mudanzas', label: 'Mudanzas' },
    { key: 'monto_total_gastado', label: 'Total gastado', render: (r) => `Bs ${r.monto_total_gastado || 0}` },
    {
      key: 'rf_segmento_predicho',
      label: 'Lealtad (RF)',
      render: (r) => r.rf_segmento_predicho || '—',
    },
  ]

  if (!puedeVer()) {
    return <p className="text-slate-500">No tienes permiso para ver el módulo de clientes.</p>
  }

  return (
    <div className="animate-fade-in">
      <CrmHubNav className="mb-6" />

      <CrmPageHeader
        title="Cartera de clientes"
        description="Perfiles, historial comercial (cotizaciones y reservas), bitácora de contacto y alertas de seguimiento. Pulsa una fila para abrir la ficha."
      >
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <input
            type="search"
            placeholder="Buscar por nombre, email, empresa…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="input-search-toolbar min-w-[14rem]"
            aria-label="Buscar clientes"
          />
          {puedeRegistrar() && (
            <button type="button" onClick={openCreate} className="btn-primary shrink-0">
              + Nuevo cliente
            </button>
          )}
        </div>
      </CrmPageHeader>

      <DataTable
        columns={columns}
        data={clientes}
        loading={loading}
        onRowClick={openFicha}
        onEdit={puedeRegistrar() ? openEdit : undefined}
        onDelete={puedeEliminar() ? handleDelete : undefined}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          totalCount,
          loading,
          onPageChange: setPage,
        }}
      />

      {puedeRegistrar() && (
        <Modal open={modal.open} onClose={closeModal} title={isEditing ? 'Editar cliente' : 'Nuevo cliente'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormSelect
              label="Usuario"
              name="usuario"
              value={form.usuario}
              onChange={handleChange}
              required
              disabled={isEditing}
              options={isEditing ? usuarios : usuariosSinCliente}
              valueKey="id"
              labelKey={(u) => `${u.nombre} ${u.apellido} (${u.email})`}
              error={errors.usuario}
            />
            <FormSelect
              label="Tipo de cliente"
              name="tipo_cliente"
              value={form.tipo_cliente}
              onChange={handleChange}
              options={[
                { id: 'residencial', nombre: 'Residencial' },
                { id: 'empresarial', nombre: 'Empresarial' },
              ]}
            />
            <FormInput label="Nombre empresa (si empresarial)" name="nombre_empresa" value={form.nombre_empresa} onChange={handleChange} />
            <FormInput label="NIT" name="nit" value={form.nit} onChange={handleChange} />
            <FormTextarea label="Dirección predeterminada" name="direccion_predeterminada" value={form.direccion_predeterminada} onChange={handleChange} />
            <FormTextarea
              label="Dirección origen habitual (W9)"
              name="direccion_origen_habitual"
              value={form.direccion_origen_habitual}
              onChange={handleChange}
            />
            <FormTextarea
              label="Dirección destino habitual (W9)"
              name="direccion_destino_habitual"
              value={form.direccion_destino_habitual}
              onChange={handleChange}
            />
            <FormSelect
              label="Tipo de mudanza preferido (W9)"
              name="tipo_mudanza_preferido"
              value={form.tipo_mudanza_preferido}
              onChange={handleChange}
              options={[{ id: '', nombre: '—' }, ...tiposServicio.map((t) => ({ id: t.id, nombre: t.nombre }))]}
            />
            <FormSelect
              label="Preferencia de comunicación"
              name="preferencia_comunicacion"
              value={form.preferencia_comunicacion}
              onChange={handleChange}
              options={[
                { id: 'email', nombre: 'Email' },
                { id: 'sms', nombre: 'SMS' },
                { id: 'telefono', nombre: 'Teléfono' },
              ]}
            />
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={closeModal} className="btn-ghost">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                {saving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <Modal
        open={ficha.open}
        onClose={() => setFicha({ open: false, cliente: null, tab: 'resumen' })}
        title={ficha.cliente ? ficha.cliente.usuario_nombre : 'Cliente'}
        size="xl"
      >
        {ficha.cliente && (
          <div className="-mx-1 text-slate-800 sm:-mx-0">
            <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-primary-50/90 via-white to-slate-50/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-lg font-bold text-white shadow-md shadow-primary-500/25">
                  {iniciales(ficha.cliente.usuario_nombre)}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                    <span className="truncate">{ficha.cliente.usuario_email}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200/90">
                      <Building2 className="h-3 w-3 text-slate-400" aria-hidden />
                      {ficha.cliente.tipo_cliente === 'empresarial' ? 'Empresarial' : 'Residencial'}
                    </span>
                    {ficha.cliente.nombre_empresa && (
                      <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200/90">
                        {ficha.cliente.nombre_empresa}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                ID cliente: <span className="font-mono font-semibold text-slate-700">{ficha.cliente.id}</span>
              </p>
            </div>

            <div className="mb-5 flex gap-1.5 overflow-x-auto rounded-xl border border-slate-200/90 bg-slate-50/80 p-1.5">
              {FICHA_TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFicha((s) => ({ ...s, tab: id }))}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition',
                    ficha.tab === id
                      ? 'bg-white text-primary-800 shadow-sm ring-1 ring-primary-200/80'
                      : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                  )}
                >
                  <Icon className="h-4 w-4 opacity-80" aria-hidden />
                  {label}
                </button>
              ))}
            </div>

            {ficha.tab === 'resumen' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Actividad</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                    {ficha.cliente.cantidad_mudanzas ?? 0}
                    <span className="ml-1 text-base font-semibold text-slate-500">mudanzas</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Gasto acumulado:{' '}
                    <span className="font-semibold text-slate-900">Bs {ficha.cliente.monto_total_gastado ?? 0}</span>
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Inteligencia (RF)</p>
                  <p className="mt-2 text-sm text-slate-700">
                    <span className="font-medium text-slate-500">Prob. retención:</span>{' '}
                    {ficha.cliente.rf_probabilidad_retencion ?? '—'}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    <span className="font-medium text-slate-500">Segmento:</span>{' '}
                    <span className="font-semibold text-violet-800">
                      {ficha.cliente.rf_segmento_predicho || '—'}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {ficha.tab === 'historial' && (
              <div className="text-sm">
                {!puedeHistorial() && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">Sin permiso para ver el historial comercial.</p>
                )}
                {puedeHistorial() && histLoad && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                    Cargando historial…
                  </div>
                )}
                {puedeHistorial() && !histLoad && historial && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200/90 bg-slate-50 px-3 py-2 text-slate-700">
                      <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold ring-1 ring-slate-200">
                        {historial.totales?.cotizaciones} cotizaciones
                      </span>
                      <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold ring-1 ring-slate-200">
                        {historial.totales?.reservas} reservas
                      </span>
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200/80">
                        {historial.totales?.mudanzas_completadas} completadas
                      </span>
                    </div>

                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-slate-800">Cotizaciones</h3>
                      <div className="max-h-[22rem] overflow-auto rounded-xl border border-slate-200/90">
                        {(historial.cotizaciones || []).length ? (
                          <table className="w-full min-w-[640px] text-left text-xs">
                            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 text-slate-500 backdrop-blur-sm">
                              <tr>
                                <th className="px-3 py-2.5 font-semibold">Fecha</th>
                                <th className="px-3 py-2.5 font-semibold">#</th>
                                <th className="px-3 py-2.5 font-semibold">Estado</th>
                                <th className="px-3 py-2.5 font-semibold">Servicio</th>
                                <th className="px-3 py-2.5 font-semibold">Ruta</th>
                                <th className="px-3 py-2.5 font-semibold">Bs ref.</th>
                                <th className="px-3 py-2.5 font-semibold">Reserva</th>
                                <th className="px-3 py-2.5 font-semibold"> </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {(historial.cotizaciones || []).map((c) => (
                                <tr key={`c-${c.id}`} className="transition hover:bg-primary-50/50">
                                  <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                                    {c.creado_en
                                      ? new Date(c.creado_en).toLocaleString('es-BO', {
                                          dateStyle: 'short',
                                          timeStyle: 'short',
                                        })
                                      : '—'}
                                  </td>
                                  <td className="px-3 py-2 font-mono font-semibold text-primary-700">{c.id}</td>
                                  <td className="px-3 py-2">
                                    <CrmCotizacionBadge estado={c.estado} labels={LABEL_ESTADO_COT} />
                                  </td>
                                  <td className="max-w-[120px] truncate px-3 py-2" title={c.tipo_servicio || ''}>
                                    {c.tipo_servicio || '—'}
                                  </td>
                                  <td
                                    className="max-w-[200px] px-3 py-2 text-slate-600"
                                    title={`${c.direccion_origen} → ${c.direccion_destino}`}
                                  >
                                    {fmtShort(c.direccion_origen, 22)} → {fmtShort(c.direccion_destino, 22)}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 font-mono text-slate-900">
                                    {c.precio_referencia != null ? c.precio_referencia : '—'}
                                  </td>
                                  <td className="px-3 py-2 text-slate-600">
                                    {c.reserva_codigo ? (
                                      <span title={c.reserva_estado || ''}>{c.reserva_codigo}</span>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2">
                                    <Link
                                      to={`/cotizaciones?cotizacion=${c.id}`}
                                      className="font-semibold text-primary-600 hover:text-primary-800 hover:underline"
                                    >
                                      Ver
                                    </Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <CrmEmptyState title="Sin cotizaciones" hint="Las solicitudes del cliente aparecerán aquí." />
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-slate-800">Reservas</h3>
                      <div className="max-h-52 space-y-2 overflow-y-auto">
                        {historial.reservas?.map((r) => (
                          <div
                            key={`r-${r.id}`}
                            className="rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-slate-700 shadow-sm"
                          >
                            <span className="font-semibold text-primary-700">Reserva {r.codigo}</span>
                            <span className="text-slate-500"> — {r.estado} — {r.fecha_servicio}</span>
                            {r.mudanza_estado && (
                              <span className="block text-xs text-slate-500">Mudanza: {r.mudanza_estado}</span>
                            )}
                          </div>
                        ))}
                        {!(historial.reservas || []).length && (
                          <p className="text-sm text-slate-500">Sin reservas vinculadas.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {ficha.tab === 'comunicaciones' && (
              <div>
                {!puedeCom() && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Sin permiso para registrar comunicaciones.</p>
                )}
                {puedeCom() && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <form
                      onSubmit={addComunicacion}
                      className="space-y-3 rounded-xl border border-slate-200/90 bg-slate-50/50 p-4"
                    >
                      <p className="text-sm font-semibold text-slate-800">Nueva interacción</p>
                      <FormSelect
                        label="Canal"
                        name="canal"
                        value={comForm.canal}
                        onChange={(e) => setComForm({ ...comForm, canal: e.target.value })}
                        options={CANALES}
                      />
                      <FormInput
                        label="Asunto"
                        value={comForm.asunto}
                        onChange={(e) => setComForm({ ...comForm, asunto: e.target.value })}
                      />
                      <FormTextarea
                        label="Contenido"
                        value={comForm.contenido}
                        onChange={(e) => setComForm({ ...comForm, contenido: e.target.value })}
                        required
                      />
                      <FormSelect
                        label="Dirección"
                        value={comForm.direccion}
                        onChange={(e) => setComForm({ ...comForm, direccion: e.target.value })}
                        options={[{ id: 'entrante', nombre: 'Entrante' }, { id: 'saliente', nombre: 'Saliente' }]}
                      />
                      <button type="submit" className="btn-primary btn-primary-sm w-full sm:w-auto">
                        Registrar en bitácora
                      </button>
                    </form>
                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-800">Historial</p>
                      <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                        {coms.length === 0 && (
                          <li className="text-sm text-slate-500">Aún no hay registros.</li>
                        )}
                        {coms.map((x) => (
                          <li
                            key={x.id}
                            className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                          >
                            <span className="text-xs text-slate-500">
                              {new Date(x.creado_en).toLocaleString('es-BO')}
                            </span>
                            <span className="mx-2 text-slate-300">·</span>
                            <span className="font-medium capitalize text-slate-800">{x.canal}</span>
                            <p className="mt-0.5 text-slate-600">{x.asunto || '(sin asunto)'}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {ficha.tab === 'alertas' && (
              <div>
                {!puedeAlertas() && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Sin permiso para alertas.</p>
                )}
                {puedeAlertas() && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <form
                      onSubmit={addAlerta}
                      className="space-y-3 rounded-xl border border-slate-200/90 bg-slate-50/50 p-4"
                    >
                      <p className="text-sm font-semibold text-slate-800">Programar seguimiento</p>
                      <FormSelect
                        label="Tipo"
                        value={alertForm.tipo}
                        onChange={(e) => setAlertForm({ ...alertForm, tipo: e.target.value })}
                        options={TIPOS_ALERTA}
                      />
                      <FormInput
                        label="Título"
                        value={alertForm.titulo}
                        onChange={(e) => setAlertForm({ ...alertForm, titulo: e.target.value })}
                        required
                      />
                      <FormTextarea
                        label="Descripción"
                        value={alertForm.descripcion}
                        onChange={(e) => setAlertForm({ ...alertForm, descripcion: e.target.value })}
                      />
                      <FormInput
                        label="Fecha programada"
                        type="datetime-local"
                        value={alertForm.fecha_programada}
                        onChange={(e) => setAlertForm({ ...alertForm, fecha_programada: e.target.value })}
                        required
                      />
                      <button type="submit" className="btn-primary btn-primary-sm w-full sm:w-auto">
                        Crear alerta
                      </button>
                    </form>
                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-800">Próximas alertas</p>
                      <ul className="max-h-72 space-y-2 overflow-y-auto">
                        {alerts.length === 0 && (
                          <li className="text-sm text-slate-500">No hay alertas para este cliente.</li>
                        )}
                        {alerts.map((a) => (
                          <li
                            key={a.id}
                            className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm shadow-sm"
                          >
                            <p className="font-semibold text-slate-900">{a.titulo}</p>
                            <p className="text-xs text-slate-500">
                              {a.estado} · {new Date(a.fecha_programada).toLocaleString('es-BO')}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
