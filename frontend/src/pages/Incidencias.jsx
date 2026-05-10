import { useState, useEffect, useMemo } from 'react'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import FormSelect from '../components/FormSelect'
import FormTextarea from '../components/FormTextarea'
import { useAuth } from '../context/AuthContext'
import { toastApiError, toastMessage, toastSuccess } from '../utils/apiToast'

const TIPOS_INCIDENCIA = {
  dano_objeto: 'Daño a Objeto',
  objeto_perdido: 'Objeto Perdido',
  retraso: 'Retraso',
  servicio_incompleto: 'Servicio Incompleto',
  otro: 'Otro',
}

const GRAVEDADES = {
  baja: { label: 'Baja', color: 'text-success-500', bg: 'bg-success-500/20' },
  media: { label: 'Media', color: 'text-warning-500', bg: 'bg-warning-500/20' },
  alta: { label: 'Alta', color: 'text-error-500', bg: 'bg-error-500/20' },
}

const ESTADOS = {
  reportada: { label: 'Reportada', color: 'text-warning-500', bg: 'bg-warning-500/20' },
  en_revision: { label: 'En Revisión', color: 'text-blue-500', bg: 'bg-blue-500/20' },
  resuelta: { label: 'Resuelta', color: 'text-green-500', bg: 'bg-green-500/20' },
  rechazada: { label: 'Rechazada', color: 'text-red-500', bg: 'bg-red-500/20' },
}

export default function Incidencias() {
  const { isAdmin, hasPermission } = useAuth()
  const puedeGestionar = isAdmin() || hasPermission('mudanzas.gestionar')

  const [incidencias, setIncidencias] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todas')
  const [modal, setModal] = useState({ open: false, incidencia: null })
  const [accionModal, setAccionModal] = useState({ open: false, incidencia: null })
  const [resolucion, setResolucion] = useState('')
  const [saving, setSaving] = useState(false)

  const fetch = () => {
    setLoading(true)
    api
      .get('/mudanzas/incidencias/')
      .then(({ data }) => setIncidencias(data.results ?? data ?? []))
      .catch((err) => {
        console.error('Error al cargar incidencias:', err)
        setIncidencias([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch()
  }, [])

  const visibles = useMemo(() => {
    if (filtro === 'pendientes')
      return incidencias.filter((i) => i.estado === 'reportada' || i.estado === 'en_revision')
    if (filtro === 'altas')
      return incidencias.filter((i) => i.gravedad === 'alta')
    return incidencias
  }, [incidencias, filtro])

  const cambiarEstado = (incidencia, nuevoEstado) => {
    setSaving(true)
    api
      .patch(`/mudanzas/incidencias/${incidencia.id}/`, { estado: nuevoEstado })
      .then(() => {
        toastSuccess('Estado actualizado')
        fetch()
        setAccionModal({ open: false, incidencia: null })
      })
      .catch((err) => toastApiError(err, 'Error al actualizar'))
      .finally(() => setSaving(false))
  }

  const agregarResolucion = (incidencia) => {
    if (!resolucion.trim()) {
      toastMessage('Por favor ingrese una resolución')
      return
    }
    setSaving(true)
    api
      .patch(`/mudanzas/incidencias/${incidencia.id}/`, {
        estado: 'resuelta',
        resolucion: resolucion,
      })
      .then(() => {
        toastSuccess('Incidencia resuelta')
        fetch()
        setAccionModal({ open: false, incidencia: null })
        setResolucion('')
      })
      .catch((err) => toastApiError(err, 'Error al resolver'))
      .finally(() => setSaving(false))
  }

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'servicio_codigo',
      label: 'Servicio',
      render: (inc) => inc.servicio_codigo || `#${inc.servicio}`,
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (inc) => TIPOS_INCIDENCIA[inc.tipo] || inc.tipo,
    },
    {
      key: 'gravedad',
      label: 'Gravedad',
      render: (inc) => {
        const g = GRAVEDADES[inc.gravedad]
        return g ? (
          <span className={`px-2 py-1 rounded text-xs font-medium ${g.color} ${g.bg}`}>
            {g.label}
          </span>
        ) : (
          inc.gravedad
        )
      },
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (inc) => {
        const e = ESTADOS[inc.estado]
        return e ? (
          <span className={`px-2 py-1 rounded text-xs font-medium ${e.color} ${e.bg}`}>
            {e.label}
          </span>
        ) : (
          inc.estado
        )
      },
    },
    {
      key: 'reportado_por',
      label: 'Reportado por',
      render: (inc) => inc.reportado_por_nombre || '-',
    },
    {
      key: 'fecha_reporte',
      label: 'Fecha',
      render: (inc) =>
        inc.fecha_reporte ? new Date(inc.fecha_reporte).toLocaleDateString() : '-',
    },
  ]

  const estadisticas = useMemo(() => {
    return {
      total: incidencias.length,
      pendientes: incidencias.filter(
        (i) => i.estado === 'reportada' || i.estado === 'en_revision'
      ).length,
      altas: incidencias.filter((i) => i.gravedad === 'alta').length,
      resueltas: incidencias.filter((i) => i.estado === 'resuelta').length,
    }
  }, [incidencias])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Incidencias</h1>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-slate-400 text-sm">Total</div>
          <div className="text-2xl font-bold">{estadisticas.total}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-slate-400 text-sm">Pendientes</div>
          <div className="text-2xl font-bold text-primary-500">{estadisticas.pendientes}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-slate-400 text-sm">Alta Gravedad</div>
          <div className="text-2xl font-bold text-red-500">{estadisticas.altas}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-slate-400 text-sm">Resueltas</div>
          <div className="text-2xl font-bold text-green-500">{estadisticas.resueltas}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFiltro('todas')}
          className={`tab-pill text-sm font-medium ${filtro === 'todas' ? 'tab-pill-active' : 'tab-pill-idle'}`}
        >
          Todas
        </button>
        <button
          onClick={() => setFiltro('pendientes')}
          className={`tab-pill text-sm font-medium ${filtro === 'pendientes' ? 'tab-pill-active' : 'tab-pill-idle'}`}
        >
          Pendientes
        </button>
        <button
          onClick={() => setFiltro('altas')}
          className={`tab-pill text-sm font-medium ${filtro === 'altas' ? 'tab-pill-active' : 'tab-pill-idle'}`}
        >
          Alta Gravedad
        </button>
      </div>

      {/* Tabla */}
      <DataTable
        columns={columns}
        data={visibles}
        loading={loading}
        onRowClick={(inc) => setModal({ open: true, incidencia: inc })}
        extraActions={
          puedeGestionar
            ? [
                {
                  label: 'Gestionar',
                  onClick: (inc) => setAccionModal({ open: true, incidencia: inc }),
                },
              ]
            : []
        }
      />

      {/* Modal de Detalle */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, incidencia: null })}
        title={modal.incidencia ? `Incidencia #${modal.incidencia.id}` : ''}
        size="lg"
      >
        {modal.incidencia && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-500 text-sm">Servicio</label>
                <p className="text-slate-200">
                  {modal.incidencia.servicio_codigo || `#${modal.incidencia.servicio}`}
                </p>
              </div>
              <div>
                <label className="text-slate-500 text-sm">Tipo</label>
                <p className="text-slate-200">
                  {TIPOS_INCIDENCIA[modal.incidencia.tipo] || modal.incidencia.tipo}
                </p>
              </div>
              <div>
                <label className="text-slate-500 text-sm">Gravedad</label>
                <p>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      GRAVEDADES[modal.incidencia.gravedad]?.color || ''
                    } ${GRAVEDADES[modal.incidencia.gravedad]?.bg || 'bg-slate-700'}`}
                  >
                    {GRAVEDADES[modal.incidencia.gravedad]?.label ||
                      modal.incidencia.gravedad}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-slate-500 text-sm">Estado</label>
                <p>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      ESTADOS[modal.incidencia.estado]?.color || ''
                    } ${ESTADOS[modal.incidencia.estado]?.bg || 'bg-slate-700'}`}
                  >
                    {ESTADOS[modal.incidencia.estado]?.label || modal.incidencia.estado}
                  </span>
                </p>
              </div>
            </div>

            <div>
              <label className="text-slate-500 text-sm">Descripción</label>
              <p className="text-slate-200 bg-slate-800 p-3 rounded">
                {modal.incidencia.descripcion || 'Sin descripción'}
              </p>
            </div>

            {modal.incidencia.objeto_nombre && (
              <div>
                <label className="text-slate-500 text-sm">Objeto afectado</label>
                <p className="text-slate-200">{modal.incidencia.objeto_nombre}</p>
              </div>
            )}

            {modal.incidencia.resolucion && (
              <div>
                <label className="text-slate-500 text-sm">Resolución</label>
                <p className="text-slate-200 bg-green-500/10 p-3 rounded border border-green-500/30">
                  {modal.incidencia.resolucion}
                </p>
              </div>
            )}

            {modal.incidencia.foto && (
              <div>
                <label className="text-slate-500 text-sm">Foto de evidencia</label>
                <img
                  src={modal.incidencia.foto}
                  alt="Evidencia"
                  className="mt-2 max-w-full h-auto rounded-lg"
                />
              </div>
            )}

            <div className="text-xs text-slate-500 pt-2">
              Reportado por {modal.incidencia.reportado_por_nombre || 'N/A'} el{' '}
              {modal.incidencia.fecha_reporte
                ? new Date(modal.incidencia.fecha_reporte).toLocaleString()
                : 'N/A'}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Acciones */}
      <Modal
        open={accionModal.open}
        onClose={() => {
          setAccionModal({ open: false, incidencia: null })
          setResolucion('')
        }}
        title="Gestionar Incidencia"
      >
        {accionModal.incidencia && (
          <div className="space-y-4">
            <div className="bg-slate-800 p-4 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Incidencia</p>
              <p className="font-medium">
                #{accionModal.incidencia.id} -{' '}
                {TIPOS_INCIDENCIA[accionModal.incidencia.tipo]}
              </p>
              <p className="text-sm text-slate-400 mt-2">Estado actual</p>
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${
                  ESTADOS[accionModal.incidencia.estado]?.color || ''
                } ${ESTADOS[accionModal.incidencia.estado]?.bg || 'bg-slate-700'}`}
              >
                {ESTADOS[accionModal.incidencia.estado]?.label ||
                  accionModal.incidencia.estado}
              </span>
            </div>

            {accionModal.incidencia.estado !== 'resuelta' && (
              <>
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-2 block">
                    Cambiar Estado
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => cambiarEstado(accionModal.incidencia, 'en_revision')}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      En Revisión
                    </button>
                    <button
                      onClick={() => cambiarEstado(accionModal.incidencia, 'rechazada')}
                      disabled={saving}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 text-sm font-medium mb-2 block">
                    Resolver Incidencia
                  </label>
                  <FormTextarea
                    placeholder="Describa la resolución aplicada..."
                    value={resolucion}
                    onChange={(e) => setResolucion(e.target.value)}
                    rows={4}
                  />
                  <button
                    onClick={() => agregarResolucion(accionModal.incidencia)}
                    disabled={saving || !resolucion.trim()}
                    className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium disabled:opacity-50 w-full"
                  >
                    {saving ? 'Guardando...' : 'Marcar como Resuelta'}
                  </button>
                </div>
              </>
            )}

            {accionModal.incidencia.estado === 'resuelta' && (
              <div className="text-center py-4 text-slate-400">
                Esta incidencia ya fue resuelta
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
