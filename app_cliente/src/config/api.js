// Configuración de API
export const API_BASE_URL = __DEV__
  ? 'http://localhost:8000/api'
  : 'https://api.mudanzascrm.com/api';

export const API_ENDPOINTS = {
  login: '/auth/login/',
  registro: '/auth/register/',
  servicios: '/servicios-mudanza/mis_servicios_cliente/',
  servicioDetalle: (id) => `/servicios-mudanza/${id}/`,
  reportarIncidencia: (id) => `/servicios-mudanza/${id}/reportar_incidencia/`,
  confirmarEntrega: (id) => `/servicios-mudanza/${id}/confirmar_entrega/`,
  calificar: (id) => `/servicios-mudanza/${id}/calificar/`,
  cotizaciones: '/cotizaciones/',
  reservas: '/reservas/',
};
