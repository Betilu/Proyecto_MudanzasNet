import toast from 'react-hot-toast'

function normalizePart(val) {
  if (val == null || val === '') return ''
  if (typeof val === 'string') return val
  if (Array.isArray(val)) return val.map(normalizePart).filter(Boolean).join(' ')
  if (typeof val === 'object') {
    const nested = Object.entries(val)
      .map(([k, v]) => {
        const m = normalizePart(v)
        return m ? `${k}: ${m}` : ''
      })
      .filter(Boolean)
    return nested.join('; ')
  }
  return String(val)
}

/**
 * Extrae un mensaje legible del cuerpo de error típico de Django REST Framework.
 */
export function formatApiErrorData(data) {
  if (data == null) return ''
  if (typeof data === 'string') return data
  if (typeof data !== 'object') return String(data)

  const parts = []

  if (data.detail != null) {
    if (typeof data.detail === 'string') {
      parts.push(data.detail)
    } else if (Array.isArray(data.detail)) {
      parts.push(...data.detail.map(String))
    }
  }

  if (data.error != null && parts.length === 0) {
    parts.push(normalizePart(data.error))
  }

  if (typeof data.intentos_restantes === 'number' && data.intentos_restantes > 0) {
    parts.push(`Intentos restantes antes del bloqueo: ${data.intentos_restantes}.`)
  }
  if (typeof data.retry_after_seconds === 'number' && data.retry_after_seconds > 0) {
    const m = Math.ceil(data.retry_after_seconds / 60)
    parts.push(`Puedes volver a intentar en unos ${m} minuto(s).`)
  }

  if (Array.isArray(data.non_field_errors)) {
    parts.push(...data.non_field_errors.map(String))
  }

  const skip = new Set([
    'detail',
    'non_field_errors',
    'error',
    'intentos_restantes',
    'retry_after_seconds',
    'max_intentos',
  ])
  for (const [key, value] of Object.entries(data)) {
    if (skip.has(key)) continue
    const msg = normalizePart(value)
    if (msg) parts.push(`${key}: ${msg}`)
  }

  return parts.join('\n').trim() || ''
}

export function formatApiError(err, fallback = 'Error en la solicitud') {
  const data = err?.response?.data
  const msg = formatApiErrorData(data)
  if (msg) return msg
  if (err?.message) return err.message
  return fallback
}

export function toastApiError(err, fallback) {
  return toast.error(formatApiError(err, fallback))
}

export function toastSuccess(msg) {
  return toast.success(msg)
}

/** Aviso neutro (sin icono de éxito/error), p. ej. “aún no hay factura”. */
export function toastMessage(msg) {
  return toast(msg, { duration: 4000 })
}

export { toast }
