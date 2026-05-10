/**
 * Búsqueda de lugares vía Nominatim (OpenStreetMap).
 * https://operations.osmfoundation.org/policies/nominatim/ — uso razonable, sin abuso.
 */
const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

export async function nominatimSearch(query, { limit = 5, countryCode = 'bo' } = {}) {
  const q = String(query || '').trim()
  if (!q) return []

  const url = new URL(NOMINATIM)
  url.searchParams.set('format', 'json')
  url.searchParams.set('q', q)
  url.searchParams.set('limit', String(limit))
  if (countryCode) url.searchParams.set('countrycodes', countryCode)

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('No se pudo consultar OpenStreetMap (Nominatim)')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

/** @param {object} hit resultado Nominatim */
export function nominatimToLatLng(hit) {
  if (!hit || hit.lat == null || hit.lon == null) return null
  const lat = parseFloat(hit.lat)
  const lng = parseFloat(hit.lon)
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  return { lat, lng, label: hit.display_name || '' }
}
