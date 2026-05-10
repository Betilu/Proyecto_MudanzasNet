import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { LatLngBounds } from 'leaflet'
import { ensureLeafletDefaultIcons, makeColoredMarkerIcon } from './leafletDefaultIcons'
import { DEFAULT_MAP_CENTER } from './MapPicker'

ensureLeafletDefaultIcons()

const iconOrigen = makeColoredMarkerIcon('#38bdf8')
const iconDestino = makeColoredMarkerIcon('#4ade80')

function normPoint(p) {
  if (!p || p.lat == null || p.lng == null) return null
  const lat = Number(p.lat)
  const lng = Number(p.lng)
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  return [lat, lng]
}

function FitPoints({ origen, destino }) {
  const map = useMap()
  useEffect(() => {
    const o = normPoint(origen)
    const d = normPoint(destino)
    if (o && d) {
      const b = new LatLngBounds(o, d)
      map.fitBounds(b, { padding: [48, 48], maxZoom: 15 })
    } else if (o) {
      map.setView(o, 15)
    } else if (d) {
      map.setView(d, 15)
    } else {
      map.setView(DEFAULT_MAP_CENTER, 12)
    }
  }, [origen, destino, map])
  return null
}

/**
 * Solo lectura: origen (azul) y destino (verde). Coordenadas desde la cotización / app.
 */
export default function MapTwoPoints({
  origen,
  destino,
  heightClass = 'h-64',
  emptyMessage = 'No hay coordenadas GPS guardadas para esta cotización.',
}) {
  const o = normPoint(origen)
  const d = normPoint(destino)
  const hasAny = !!(o || d)
  const start = o || d || DEFAULT_MAP_CENTER

  if (!hasAny) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className={`overflow-hidden rounded-lg border border-slate-200 shadow-sm ${heightClass}`}>
      <MapContainer center={start} zoom={12} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitPoints origen={origen} destino={destino} />
        {o && (
          <Marker position={o} icon={iconOrigen}>
            <Popup>Origen</Popup>
          </Marker>
        )}
        {d && (
          <Marker position={d} icon={iconDestino}>
            <Popup>Destino</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}
