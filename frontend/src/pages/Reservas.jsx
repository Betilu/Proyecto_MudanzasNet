import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import MapTwoPoints from '../components/maps/MapTwoPoints'
import { useAuth } from '../context/AuthContext'

export default function Reservas() {
  const { isAdmin, hasRole } = useAuth()
  const esClientePortal = hasRole('cliente')
  const [reservas, setReservas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, r: null })

  const fetch = () => {
    setLoading(true)
    api.get('/reservas/')
      .then(({ data }) => setReservas(data.results ?? data ?? []))
      .catch(() => setReservas([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetch()
  }, [])

  const cancelar = (r) => {
    const motivo = window.prompt('Motivo de cancelación (opcional):')
    api.post(`/reservas/${r.id}/cancelar/`, { motivo_cancelacion: motivo || '' }).then(() => fetch())
  }

  const columns = [
    { key: 'codigo_confirmacion', label: 'Código' },
    { key: 'cliente_nombre', label: 'Cliente' },
    { key: 'fecha_servicio', label: 'Fecha' },
    { key: 'estado', label: 'Estado' },
    { key: 'franja_horaria', label: 'Franja' },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reservas</h1>
        <div className="text-sm text-slate-400">
          Las reservas se generan automáticamente cuando el cliente acepta una cotización
        </div>
      </div>
      <DataTable
        columns={columns}
        data={reservas}
        loading={loading}
        onRowClick={(r) => setModal({ open: true, r })}
        extraActions={
          isAdmin()
            ? (r) => {
                const acts = []
                if (r.estado !== 'cancelada' && r.estado !== 'completada') {
                  acts.push({
                    label: 'Cancelar',
                    onClick: () => cancelar(r),
                    className: 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  })
                }
                return acts
              }
            : []
        }
      />
      <Modal open={modal.open} onClose={() => setModal({ open: false, r: null })} title={modal.r ? `Reserva ${modal.r.codigo_confirmacion}` : ''} size="lg">
        {modal.r && (
          <div className="space-y-2 text-slate-300">
            <p><span className="text-slate-500">Código:</span> {modal.r.codigo_confirmacion}</p>
            <p><span className="text-slate-500">Cliente:</span> {modal.r.cliente_nombre}</p>
            <p><span className="text-slate-500">Fecha:</span> {modal.r.fecha_servicio}</p>
            <p><span className="text-slate-500">Estado:</span> <span className={modal.r.estado === 'confirmada' ? 'text-green-400' : modal.r.estado === 'pendiente' ? 'text-yellow-400' : ''}>{modal.r.estado}</span></p>
            <p><span className="text-slate-500">Franja:</span> {modal.r.franja_horaria}</p>
            {modal.r.ubicacion_cotizacion && (
              <div className="space-y-2 border-t border-slate-200/80 pt-3">
                <p className="text-sm font-medium text-slate-800">Ruta cotizada (OpenStreetMap)</p>
                <p className="text-xs text-slate-600">
                  <span className="text-slate-500">Origen:</span> {modal.r.ubicacion_cotizacion.direccion_origen || '—'}
                </p>
                <p className="text-xs text-slate-600">
                  <span className="text-slate-500">Destino:</span> {modal.r.ubicacion_cotizacion.direccion_destino || '—'}
                </p>
                <MapTwoPoints
                  origen={
                    modal.r.ubicacion_cotizacion.latitud_origen != null &&
                    modal.r.ubicacion_cotizacion.longitud_origen != null
                      ? {
                          lat: modal.r.ubicacion_cotizacion.latitud_origen,
                          lng: modal.r.ubicacion_cotizacion.longitud_origen,
                        }
                      : null
                  }
                  destino={
                    modal.r.ubicacion_cotizacion.latitud_destino != null &&
                    modal.r.ubicacion_cotizacion.longitud_destino != null
                      ? {
                          lat: modal.r.ubicacion_cotizacion.latitud_destino,
                          lng: modal.r.ubicacion_cotizacion.longitud_destino,
                        }
                      : null
                  }
                />
              </div>
            )}
            {modal.r.estado === 'pendiente' && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-400">
                ⏳ Esperando pago del depósito. La reserva se confirmará cuando el operador verifique tu comprobante.
                {esClientePortal && (
                  <span className="block mt-2 text-primary-300">
                    <Link to="/mis-pagos" className="underline font-medium">
                      Mis pagos
                    </Link>{' '}
                    — sube el comprobante desde la app o consulta el estado aquí.
                  </span>
                )}
              </div>
            )}
            {modal.r.estado === 'confirmada' && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-400">
                ✓ Reserva confirmada. El depósito fue verificado.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}