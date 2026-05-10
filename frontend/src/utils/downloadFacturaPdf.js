/**
 * Descarga factura PDF del API web (operador / cliente portal) con JWT en sessionStorage.
 */
export async function downloadFacturaPdf(facturaId, filename) {
  const token = sessionStorage.getItem('access_token')
  const res = await fetch(`/api/pagos/facturas/${facturaId}/pdf/`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `Error ${res.status}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `factura_${facturaId}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
