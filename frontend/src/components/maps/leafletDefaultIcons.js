import L from 'leaflet'

/** Leaflet + bundlers: restaurar iconos por defecto del marcador */
export function ensureLeafletDefaultIcons() {
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

export function makeColoredMarkerIcon(color) {
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
      <path fill="${color}" stroke="#111" stroke-width="1" d="M12 0C7 0 3 4 3 9c0 8 9 17 9 17s9-9 9-17c0-5-4-9-9-9z"/>
      <circle fill="#fff" cx="12" cy="9" r="3.5"/>
    </svg>`
  )
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${svg}`,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -32],
  })
}
