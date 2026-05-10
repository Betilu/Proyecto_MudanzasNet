import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormSelect from '../components/FormSelect'
import FormInput from '../components/FormInput'
import ServicioTimeline from '../components/ServicioTimeline'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/cn'
import { PAGE_SIZE, parsePagedResponse } from '../utils/paging'

/** Badges de estado: alto contraste sobre fondo claro (tabla + modal). */
const ESTADOS_LABELS = {
  asignado: {
    label: 'Asignado',
    badge: 'bg-slate-100 text-slate-800 ring-slate-300/90 shadow-sm',
  },
  en_camino: {
    label: 'En camino',
    badge: 'bg-sky-100 text-sky-950 ring-sky-400/70 shadow-sm',
  },
  en_origen: {
    label: 'En origen',
    badge: 'bg-blue-100 text-blue-950 ring-blue-400/65 shadow-sm',
  },
  cargando: {
    label: 'Cargando',
    badge: 'bg-indigo-100 text-indigo-950 ring-indigo-400/65 shadow-sm',
  },
  en_ruta: {
    label: 'En ruta',
    badge: 'bg-violet-100 text-violet-950 ring-violet-400/65 shadow-sm',
  },
  en_destino: {
    label: 'En destino',
    badge: 'bg-emerald-100 text-emerald-950 ring-emerald-400/70 shadow-sm',
  },
  descargando: {
    label: 'Descargando',
    badge: 'bg-teal-100 text-teal-950 ring-teal-400/65 shadow-sm',
  },
  completado: {
    label: 'Completado',
    badge: 'bg-green-100 text-green-950 ring-green-500/50 shadow-sm font-bold',
  },
  cancelado: {
    label: 'Cancelado',
    badge: 'bg-red-100 text-red-950 ring-red-400/70 shadow-sm',
  },
}

export default function Mudanzas() {
  const { isAdmin } = useAuth()
  const [servicios, setServicios] = useState([])
  const [reservas, setReservas] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [personal, setPersonal] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, srv: null })
  const [formModal, setFormModal] = useState({ open: false })
  const [estadoModal, setEstadoModal] = useState({ open: false, srv: null })
  const [equipoModal, setEquipoModal] = useState({ open: false, srv: null })
  const [detalleServicio, setDetalleServicio] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const fetchServicios = () => {
    setLoading(true)
    api
      .get('/mudanzas/', { params: { page } })
      .then(({ data }) => {
        const { results, count } = parsePagedResponse(data)
        setServicios(results)
        setTotalCount(count)
      })
      .catch(() => {
        setServicios([])
        setTotalCount(0)
      })
      .finally(() => setLoading(false))
  }

  const fetchReservasSinServicio = () => {
    Promise.all([api.get('/reservas/'), api.get('/mudanzas/')])
      .then(([resRes, mudRes]) => {
        const resList = resRes.data.results ?? resRes.data ?? []
        const mudList = mudRes.data.results ?? mudRes.data ?? []
        const conServicio = new Set(mudList.map((m) => m.reserva))
        setReservas(
          resList.filter((r) => r.estado === 'confirmada' && !conServicio.has(r.id))
        )
      })
      .catch(() => setReservas([]))
  }

  const fetchDetalleServicio = async (id) => {
    try {
      const { data } = await api.get(`/mudanzas/${id}/`)
      setDetalleServicio(data)
    } catch (err) {
      console.error('Error al cargar detalle:', err)
    }
  }

  useEffect(() => {
    fetchServicios()
  }, [page])

  useEffect(() => {
    if (isAdmin()) {
      api
        .get('/vehiculos/')
        .then(({ data }) => setVehiculos(data.results ?? data ?? []))
        .catch(() => {})
      api
        .get('/personal/')
        .then(({ data }) => setPersonal(data.results ?? data ?? []))
        .catch(() => {})
    }
  }, [])

  const openCreate = () => {
    fetchReservasSinServicio()
    setFormModal({ open: true })
    setForm({ reserva: '', vehiculo: '', notas_operador: '' })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setSaving(true)
    api
      .post('/mudanzas/', {
        reserva: parseInt(form.reserva),
        vehiculo: form.vehiculo ? parseInt(form.vehiculo) : null,
        notas_operador: form.notas_operador || '',
      })
      .then(() => {
        fetchServicios()
        setFormModal({ open: false })
      })
      .catch(() => {})
      .finally(() => setSaving(false))
  }

  const cambiarEstado = (srv, estadoNuevo) => {
    api
      .post(`/mudanzas/${srv.id}/cambiar_estado/`, { estado_nuevo: estadoNuevo })
      .then(() => {
        fetchServicios()
        setEstadoModal({ open: false, srv: null })
        if (detalleServicio?.id === srv.id) {
          fetchDetalleServicio(srv.id)
        }
      })
  }

  const asignarEquipo = (srv, personalId, rol) => {
    api
      .post(`/mudanzas/${srv.id}/asignar_equipo/`, {
        personal: personalId,
        rol_asignado: rol,
      })
      .then(() => {
        fetchServicios()
        setEquipoModal({ open: false, srv: null })
        if (detalleServicio?.id === srv.id) {
          fetchDetalleServicio(srv.id)
        }
      })
  }

  const handleRowClick = (srv) => {
    setModal({ open: true, srv })
    fetchDetalleServicio(srv.id)
  }

  const estados = [
    'asignado',
    'en_camino',
    'en_origen',
    'cargando',
    'en_ruta',
    'en_destino',
    'descargando',
    'completado',
    'cancelado',
  ]

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'reserva_codigo', label: 'Reserva' },
    { key: 'vehiculo_placa', label: 'Vehículo' },
    {
      key: 'estado',
      label: 'Estado',
      render: (srv) => {
        const est = ESTADOS_LABELS[srv.estado]
        return est ? (
          <span
            className={cn(
              'inline-flex min-h-[1.625rem] items-center rounded-lg px-2.5 py-1 text-xs font-semibold leading-tight ring-1 ring-inset',
              est.badge
            )}
          >
            {est.label}
          </span>
        ) : (
          <span className="badge-soft-primary">{srv.estado}</span>
        )
      },
    },
  ]

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">Servicios de mudanza</h1>
          <p className="page-subtitle max-w-2xl">
            Estado y equipo de cada servicio en tiempo real. Abre una fila para ver el detalle y la línea de tiempo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/incidencias" className="btn-secondary gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning-500" aria-hidden />
            Incidencias
          </Link>
          {isAdmin() && (
            <button type="button" onClick={openCreate} className="btn-primary">
              + Nuevo servicio
            </button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={servicios}
        loading={loading}
        onRowClick={handleRowClick}
        extraActions={
          isAdmin()
            ? [
                {
                  label: 'Estado',
                  onClick: (s) => setEstadoModal({ open: true, srv: s }),
                },
                {
                  label: 'Equipo',
                  onClick: (s) => setEquipoModal({ open: true, srv: s }),
                },
              ]
            : []
        }
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          totalCount,
          loading,
          onPageChange: setPage,
        }}
      />

      {/* Modal de Detalle Mejorado */}
      <Modal
        open={modal.open}
        onClose={() => {
          setModal({ open: false, srv: null })
          setDetalleServicio(null)
        }}
        title={modal.srv ? `Servicio #${modal.srv.id} - ${modal.srv.reserva_codigo}` : ''}
        size="xl"
      >
        {detalleServicio ? (
          <div className="space-y-6">
            {/* Estado y Timeline */}
            <div>
              <h3 className="mb-3 text-base font-semibold text-slate-800">Estado del servicio</h3>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                {ESTADOS_LABELS[detalleServicio.estado] ? (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold leading-tight ring-1 ring-inset',
                      ESTADOS_LABELS[detalleServicio.estado].badge
                    )}
                  >
                    {ESTADOS_LABELS[detalleServicio.estado].label}
                  </span>
                ) : (
                  <span className="badge-soft-primary text-sm">{detalleServicio.estado}</span>
                )}
                {isAdmin() && (
                  <button
                    type="button"
                    onClick={() =>
                      setEstadoModal({ open: true, srv: detalleServicio })
                    }
                    className="btn-secondary btn-primary-sm"
                  >
                    Cambiar estado
                  </button>
                )}
              </div>
              <ServicioTimeline
                servicio={detalleServicio}
                historialEstados={detalleServicio.historial_estados ?? detalleServicio.historialEstados}
              />
            </div>

            {/* Información de Reserva */}
            <div className="panel-inset grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-slate-400 text-sm">Fecha de Servicio</p>
                <p className="font-medium">
                  {detalleServicio.reserva?.fecha_servicio || '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Franja Horaria</p>
                <p className="font-medium">
                  {detalleServicio.reserva?.franja_horaria || '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Origen</p>
                <p className="text-sm">
                  {detalleServicio.reserva?.cotizacion?.direccion_origen || '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Destino</p>
                <p className="text-sm">
                  {detalleServicio.reserva?.cotizacion?.direccion_destino || '-'}
                </p>
              </div>
            </div>

            {/* Vehículo */}
            <div>
              <h3 className="mb-2 text-base font-semibold text-slate-800">Vehículo asignado</h3>
              <div className="panel-inset py-3">
                {detalleServicio.vehiculo_placa ? (
                  <p className="font-medium">{detalleServicio.vehiculo_placa}</p>
                ) : (
                  <p className="text-slate-400">No asignado</p>
                )}
              </div>
            </div>

            {/* Equipo */}
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-800">Equipo asignado</h3>
                {isAdmin() && (
                  <button
                    type="button"
                    onClick={() =>
                      setEquipoModal({ open: true, srv: detalleServicio })
                    }
                    className="btn-secondary btn-primary-sm"
                  >
                    + Agregar persona
                  </button>
                )}
              </div>
              {detalleServicio.equipo && detalleServicio.equipo.length > 0 ? (
                <div className="space-y-2">
                  {detalleServicio.equipo.map((miembro, idx) => (
                    <div
                      key={idx}
                      className="panel-inset flex items-center justify-between py-3"
                    >
                      <div>
                        <p className="font-medium">{miembro.personal_nombre}</p>
                        <p className="text-sm text-slate-400">
                          {miembro.rol_asignado}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="panel-inset text-slate-400">
                  No hay equipo asignado
                </p>
              )}
            </div>

            {/* Incidencias */}
            {detalleServicio.incidencias && detalleServicio.incidencias.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-error-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                  Incidencias reportadas
                </h3>
                <div className="space-y-2">
                  {detalleServicio.incidencias.map((inc, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-error-500/30 bg-error-500/10 p-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-error-300">
                            {inc.tipo} - {inc.gravedad}
                          </p>
                          <p className="text-sm text-slate-300 mt-1">
                            {inc.descripcion}
                          </p>
                        </div>
                        <span
                          className={
                            inc.estado === 'resuelta' ? 'badge-soft-success' : 'badge-soft-primary'
                          }
                        >
                          {inc.estado}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  to="/incidencias"
                  className="btn-table-action mt-3 inline-flex"
                >
                  Ver todas las incidencias
                </Link>
              </div>
            )}

            {/* Notas del Operador */}
            {detalleServicio.notas_operador && (
              <div>
                <h3 className="mb-2 text-base font-semibold text-slate-800">Notas del operador</h3>
                <div className="panel-inset py-3">
                  <p className="text-slate-300">{detalleServicio.notas_operador}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-slate-400 mt-2">Cargando detalles...</p>
          </div>
        )}
      </Modal>

      {/* Modal de Creación */}
      <Modal
        open={formModal.open}
        onClose={() => setFormModal({ open: false })}
        title="Nuevo servicio de mudanza"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormSelect
            label="Reserva confirmada"
            name="reserva"
            value={form.reserva}
            onChange={(e) => setForm((f) => ({ ...f, reserva: e.target.value }))}
            required
            options={reservas}
            labelKey={(r) => `${r.codigo_confirmacion} - ${r.fecha_servicio}`}
          />
          <FormSelect
            label="Vehículo"
            name="vehiculo"
            value={form.vehiculo}
            onChange={(e) => setForm((f) => ({ ...f, vehiculo: e.target.value }))}
            options={vehiculos}
            labelKey="placa"
          />
          <FormInput
            label="Notas"
            name="notas_operador"
            value={form.notas_operador}
            onChange={(e) =>
              setForm((f) => ({ ...f, notas_operador: e.target.value }))
            }
          />
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setFormModal({ open: false })}
              className="btn-ghost"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Cambio de Estado */}
      <Modal
        open={estadoModal.open}
        onClose={() => setEstadoModal({ open: false, srv: null })}
        title="Cambiar estado"
      >
        {estadoModal.srv && (
          <div>
            <p className="text-slate-400 mb-4">
              Estado actual:{' '}
              <span className="font-medium text-slate-900">
                {ESTADOS_LABELS[estadoModal.srv.estado]?.label ||
                  estadoModal.srv.estado}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {estados.map((est) => (
                <button
                  key={est}
                  onClick={() => cambiarEstado(estadoModal.srv, est)}
                  className={`tab-pill px-3 py-2 text-sm font-medium ${
                    estadoModal.srv.estado === est ? 'tab-pill-active' : 'tab-pill-idle'
                  }`}
                >
                  {ESTADOS_LABELS[est]?.label || est}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Asignación de Equipo */}
      <Modal
        open={equipoModal.open}
        onClose={() => setEquipoModal({ open: false, srv: null })}
        title="Asignar equipo"
        size="lg"
      >
        {equipoModal.srv && (
          <EquipoForm
            personal={personal}
            onAsignar={(personalId, rol) =>
              asignarEquipo(equipoModal.srv, personalId, rol)
            }
          />
        )}
      </Modal>
    </div>
  )
}

function EquipoForm({ personal, onAsignar }) {
  const [sel, setSel] = useState({ personal: '', rol: 'conductor' })
  return (
    <div className="space-y-4">
      <FormSelect
        label="Personal"
        options={personal}
        valueKey="id"
        labelKey={(p) => `${p.usuario_nombre} (${p.tipo_personal})`}
        value={sel.personal}
        onChange={(e) => setSel((s) => ({ ...s, personal: e.target.value }))}
      />
      <FormSelect
        label="Rol"
        options={[
          { id: 'conductor', nombre: 'Conductor' },
          { id: 'cargador_principal', nombre: 'Cargador Principal' },
          { id: 'cargador_apoyo', nombre: 'Cargador de Apoyo' },
        ]}
        value={sel.rol}
        onChange={(e) => setSel((s) => ({ ...s, rol: e.target.value }))}
      />
      <button
        type="button"
        onClick={() => sel.personal && onAsignar(parseInt(sel.personal), sel.rol)}
        disabled={!sel.personal}
        className="btn-primary w-full"
      >
        Asignar
      </button>
    </div>
  )
}
