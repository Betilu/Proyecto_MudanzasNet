/**
 * Archivo de configuración central de la aplicación
 *
 * IMPORTANTE: Este es el ÚNICO lugar donde se debe configurar:
 * - URL del backend
 * - Timeouts
 * - Configuraciones globales
 *
 * Para cambiar la IP del backend:
 * 1. Edita el archivo .env en la raíz del proyecto
 * 2. Cambia EXPO_PUBLIC_API_URL=http://TU_IP:8000
 * 3. Reinicia el servidor de Expo
 */

// URL del backend - Configurado desde .env
export const API_CONFIG = {
  // URL base del backend Django
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000',

  // Prefijo para endpoints de app móvil
  APP_PREFIX: '/api/app-cliente',

  // Timeout por defecto (30 segundos)
  TIMEOUT: 30000,

  // Reintentos en caso de error de red
  MAX_RETRIES: 3,
};

// Ambiente actual
export const ENV = process.env.EXPO_PUBLIC_ENV || 'development';

// Configuración de debugging
export const DEBUG = {
  SHOW_API_LOGS: ENV === 'development',
  SHOW_REDUX_LOGS: ENV === 'development',
};

// Información de la app
export const APP_INFO = {
  NAME: 'Mudanzas CRM Cliente',
  VERSION: '1.0.0',
  BUILD: 1,
};

export default {
  API_CONFIG,
  ENV,
  DEBUG,
  APP_INFO,
};
