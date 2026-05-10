import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ClipboardList,
  Car,
  MapPin,
  Package,
  Truck,
  Flag,
  PackageOpen,
  CheckCircle,
} from 'lucide-react'
import { cn } from '../lib/cn'

const ESTADOS_FLUJO = [
  { key: 'asignado', label: 'Asignado', Icon: ClipboardList },
  { key: 'en_camino', label: 'En camino', Icon: Car },
  { key: 'en_origen', label: 'En origen', Icon: MapPin },
  { key: 'cargando', label: 'Cargando', Icon: Package },
  { key: 'en_ruta', label: 'En ruta', Icon: Truck },
  { key: 'en_destino', label: 'En destino', Icon: Flag },
  { key: 'descargando', label: 'Descargando', Icon: PackageOpen },
  { key: 'completado', label: 'Completado', Icon: CheckCircle },
]

/**
 * @param {object} [servicio] — objeto servicio (estado, duracion_minutos, …)
 * @param {string} [estado] — atajo si solo se pasa el código de estado
 * @param {array} [historialEstados] — hitos con estado_nuevo, creado_en, …
 */
export default function ServicioTimeline({ servicio, estado, historialEstados }) {
  const estadoActual = estado ?? servicio?.estado ?? 'asignado'
  const historial = historialEstados ?? servicio?.historial_estados ?? servicio?.historialEstados

  if (estadoActual === 'cancelado') {
    return (
      <div className="rounded-2xl border border-error-200 bg-error-50/80 p-4 text-sm text-error-800">
        <p className="font-semibold">Servicio cancelado</p>
        <p className="mt-1 text-error-700/90">Este servicio no continuará el flujo de estados.</p>
      </div>
    )
  }

  const indexActual = ESTADOS_FLUJO.findIndex((e) => e.key === estadoActual)
  const safeIndex = indexActual >= 0 ? indexActual : 0

  const obtenerInfoEstado = (estadoKey) => historial?.find((h) => h.estado_nuevo === estadoKey)

  return (
    <div className="servicio-timeline">
      <h3 className="mb-4 text-base font-semibold text-slate-800">Línea de tiempo del servicio</h3>
      <div className="relative">
        <div className="absolute bottom-0 left-6 top-0 w-0.5 bg-slate-200" aria-hidden />

        {ESTADOS_FLUJO.map((item, index) => {
          const { Icon } = item
          const info = obtenerInfoEstado(item.key)
          const completado = index <= safeIndex
          const activo = item.key === estadoActual && indexActual >= 0

          return (
            <div
              key={item.key}
              className={cn('relative mb-6 flex items-start', completado ? 'opacity-100' : 'opacity-45')}
            >
              <div
                className={cn(
                  'z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition',
                  activo
                    ? 'scale-110 border-primary-500 bg-primary-500 text-white shadow-md shadow-primary-500/25'
                    : completado
                      ? 'border-success-500 bg-success-500 text-white'
                      : 'border-slate-200 bg-white text-slate-400'
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
              </div>

              <div className="ml-4 min-w-0 flex-1">
                <h4
                  className={cn(
                    'font-medium',
                    activo
                      ? 'font-semibold text-primary-700'
                      : completado
                        ? 'text-success-700'
                        : 'text-slate-400'
                  )}
                >
                  {item.label}
                  {activo && <span className="ml-2 text-sm font-normal text-primary-600">(actual)</span>}
                </h4>
                {info && (
                  <div className="mt-1 text-sm text-slate-600">
                    <p className="font-medium">
                      {format(new Date(info.creado_en), "d 'de' MMMM, h:mm a", { locale: es })}
                    </p>
                    {info.latitud != null && info.longitud != null && (
                      <p className="text-xs text-slate-500">
                        {Number(info.latitud).toFixed(4)}, {Number(info.longitud).toFixed(4)}
                      </p>
                    )}
                    {info.notas && <p className="mt-1 text-xs italic text-slate-600">{info.notas}</p>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {servicio?.duracion_minutos != null && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
          <p className="text-sm text-slate-700">
            <strong>Duración total:</strong> {Math.floor(servicio.duracion_minutos / 60)}h{' '}
            {servicio.duracion_minutos % 60}min
          </p>
          {servicio.rf_tiempo_estimado_min != null && (
            <p className="mt-1 text-xs text-slate-500">
              Tiempo estimado por IA: {Math.floor(servicio.rf_tiempo_estimado_min / 60)}h{' '}
              {servicio.rf_tiempo_estimado_min % 60}min
            </p>
          )}
        </div>
      )}
    </div>
  )
}
