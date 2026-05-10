import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import { ensureLeafletDefaultIcons } from './leafletDefaultIcons'

ensureLeafletDefaultIcons()

/** La Paz aprox. */
export const DEFAULT_MAP_CENTER = [-16.5, -68.15]

function Recenter({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center?.length === 2 && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.flyTo(center, zoom ?? map.getZoom())
    }
  }, [center, zoom, map])
  return null
}

function ClickMarker({ position, onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return position ? <Marker position={[position.lat, position.lng]} /> : null
}

/**
 * Mapa OSM: clic para elegir un punto. `value` = { lat, lng } | null
 */
export default function MapPicker({
  value,
  onChange,
  center = DEFAULT_MAP_CENTER,
  zoom = 13,
  heightClass = 'h-56',
  hint = 'Haz clic en el mapa para fijar el punto.',
}) {
  const pos = value && value.lat != null && value.lng != null ? value : null
  const initialCenter = pos ? [pos.lat, pos.lng] : center

  return (
    <div className={`overflow-hidden rounded-lg border border-slate-200 shadow-sm ${heightClass}`}>
      <MapContainer
        center={initialCenter}
        zoom={pos ? 15 : zoom}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter center={pos ? [pos.lat, pos.lng] : center} zoom={pos ? 15 : zoom} />
        <ClickMarker position={pos} onPick={onChange} />
      </MapContainer>
      <p className="border-t border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-600">
        {hint}
        {pos && (
          <span className="ml-2 font-mono text-slate-800">
            {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
          </span>
        )}
      </p>
    </div>
  )
}
