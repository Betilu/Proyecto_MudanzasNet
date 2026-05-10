// ============================================
// API — un solo prefijo para la app móvil
// ============================================
// EXPO_PUBLIC_API_URL = origen del backend (ej. http://192.168.1.10:8000)
// Todas las peticiones van a: {origen}/api/app-cliente/...
// El portal web sigue en {origen}/api/... (no se usa desde esta app).

const RAW_API_URL = (process.env.EXPO_PUBLIC_API_URL || '').trim();

if (!RAW_API_URL) {
  throw new Error('EXPO_PUBLIC_API_URL no está definida. Configúrala en .env');
}

if (!/^https?:\/\//.test(RAW_API_URL)) {
  throw new Error('EXPO_PUBLIC_API_URL debe incluir protocolo (http:// o https://)');
}

/** Origen del servidor (sin barra final). */
export const API_ORIGIN = RAW_API_URL.replace(/\/$/, '');

/** Prefijo exclusivo app cliente en Django. */
export const APP_API_PREFIX = '/api/app-cliente';

/** Base URL que usa axios (origen + prefijo). Todas las rutas abajo son relativas a esto. */
export const APP_API_BASE_URL = `${API_ORIGIN}${APP_API_PREFIX}`;

/** @deprecated Usar APP_API_BASE_URL. Se mantiene por compatibilidad con imports antiguos. */
export const API_BASE_URL = API_ORIGIN;
export const API_PREFIX = APP_API_PREFIX;
export const API_FULL_BASE_URL = APP_API_BASE_URL;

/**
 * Normaliza ruta: sin barra inicial, con barra final si Django la exige.
 * @param {string} path ej. "reservas/" o "auth/token/"
 */
export const apiPath = (path) => String(path || '').replace(/^\//, '');

// --- Auth (mismas vistas JWT que el backend en /api/auth/, expuestas aquí en /api/app-cliente/auth/) ---
export const AUTH_ENDPOINTS = {
  TOKEN: apiPath('auth/token/'),
  REFRESH: apiPath('auth/token/refresh/'),
  REGISTRO: apiPath('auth/registro/'),
  PERFIL: apiPath('auth/perfil/'),
};

// --- Cotizaciones ---
export const COTIZACION_ENDPOINTS = {
  BASE: apiPath('cotizaciones/'),
  DETALLE: (id) => apiPath(`cotizaciones/${id}/`),
  ACEPTAR: (id) => apiPath(`cotizaciones/${id}/aceptar/`),
  CALCULAR_PRECIO: (id) => apiPath(`cotizaciones/${id}/calcular-precio/`),
  OBJETOS: (id) => apiPath(`cotizaciones/${id}/objetos/`),
};

// --- Inventario ---
export const INVENTARIO_ENDPOINTS = {
  OBJETO_DETALLE: (id) => apiPath(`objetos/${id}/`),
  OBJETO_FOTO: (id) => apiPath(`objetos/${id}/foto/`),
  CATEGORIAS: apiPath('categorias-objeto/'),
};

// --- Zonas y servicios ---
export const ZONAS_ENDPOINTS = {
  ZONAS: apiPath('zonas/'),
  TIPOS_SERVICIO: apiPath('tipos-servicio/'),
  SERVICIOS_ADICIONALES: apiPath('servicios-adicionales/'),
};

// --- Reservas ---
export const RESERVA_ENDPOINTS = {
  BASE: apiPath('reservas/'),
  DETALLE: (id) => apiPath(`reservas/${id}/`),
  SEGUIMIENTO: (id) => apiPath(`reservas/${id}/seguimiento/`),
  CANCELAR: (id) => apiPath(`reservas/${id}/cancelar/`),
  CONFIRMAR_ENTREGA: (id) => apiPath(`reservas/${id}/confirmar-entrega/`),
  CALIFICAR: (id) => apiPath(`reservas/${id}/calificar/`),
};

// --- Pagos / facturas ---
export const PAGO_ENDPOINTS = {
  PAGOS_RESERVA: (reservaId) => apiPath(`reservas/${reservaId}/pagos/`),
  FACTURA_PDF: (facturaId) => apiPath(`facturas/${facturaId}/pdf/`),
};

// --- Incidencias ---
export const INCIDENCIA_ENDPOINTS = {
  BASE: (reservaId) => apiPath(`reservas/${reservaId}/incidencias/`),
};

// --- Notificaciones ---
export const NOTIFICACION_ENDPOINTS = {
  BASE: apiPath('notificaciones/'),
  MARCAR_LEIDA: (id) => apiPath(`notificaciones/${id}/marcar_leida/`),
  REGISTRAR_TOKEN: apiPath('notificaciones/token/'),
};

// Estados de cotización
export const ESTADOS_COTIZACION = {
  BORRADOR: 'borrador',
  ENVIADA: 'enviada',
  ACEPTADA: 'aceptada',
  RECHAZADA: 'rechazada',
  VENCIDA: 'vencida',
};

// Estados de reserva
export const ESTADOS_RESERVA = {
  PENDIENTE: 'pendiente',
  CONFIRMADA: 'confirmada',
  ASIGNADA: 'asignada',
  EN_CAMINO: 'en_camino',
  EN_ORIGEN: 'en_origen',
  CARGANDO: 'cargando',
  EN_RUTA: 'en_ruta',
  EN_DESTINO: 'en_destino',
  DESCARGANDO: 'descargando',
  COMPLETADA: 'completada',
  CANCELADA: 'cancelada',
};

// Niveles de riesgo (clasificación IA)
export const NIVELES_RIESGO = {
  BAJO: 'bajo',
  MEDIO: 'medio',
  ALTO: 'alto',
};

// Tipos de pago
export const TIPOS_PAGO = {
  DEPOSITO: 'deposito',
  SALDO: 'saldo',
};

// Métodos de pago
export const METODOS_PAGO = {
  EFECTIVO: 'efectivo',
  TRANSFERENCIA_BCP: 'transferencia_bcp',
  TRANSFERENCIA_BNB: 'transferencia_bnb',
  TRANSFERENCIA_MERCANTIL: 'transferencia_mercantil',
  QR: 'qr',
};
