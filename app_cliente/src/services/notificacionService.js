import httpClient from './httpClient';
import { NOTIFICACION_ENDPOINTS } from '../constants/api';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Importación dinámica de Notifications para evitar warning en Expo Go
let Notifications = null;

class NotificacionService {
  constructor() {
    this.isExpoGo = Constants.appOwnership === 'expo';
    this.pushToken = null;
    this.notificationsModule = null;
  }

  // Cargar módulo de notificaciones solo cuando se necesite
  async loadNotificationsModule() {
    if (!this.notificationsModule && !this.isExpoGo) {
      try {
        this.notificationsModule = await import('expo-notifications');
        Notifications = this.notificationsModule;
        return this.notificationsModule;
      } catch (error) {
        console.error('Error cargando módulo de notificaciones:', error);
        return null;
      }
    }
    return this.notificationsModule;
  }

  // Verificar si push notifications están disponibles
  isPushAvailable() {
    // Push notifications requieren development build desde SDK 53+
    // En Expo Go solo funcionan notificaciones locales
    return !this.isExpoGo && Device.isDevice;
  }

  // Configurar notificaciones
  async configurar() {
    try {
      // En Expo Go SDK 53+ las push notifications no funcionan
      // Solo usar notificaciones locales en modo desarrollo
      if (this.isExpoGo) {
        console.log(
          '📱 Modo Expo Go: Notificaciones push deshabilitadas.\n' +
          '   Para habilitar, crea un development build: npx expo run:android'
        );
        return; // Salir sin configurar nada en Expo Go
      }

      // Cargar módulo de notificaciones
      const NotificationsModule = await this.loadNotificationsModule();
      if (!NotificationsModule) {
        console.warn('No se pudo cargar el módulo de notificaciones');
        return;
      }

      // Configurar comportamiento de notificaciones (solo en development build)
      NotificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Registrar push token si está en dispositivo físico
      if (this.isPushAvailable()) {
        console.log('🚀 Registrando token de push notifications...');
        await this.registrarToken();
      } else {
        console.warn('⚠️  Push notifications solo funcionan en dispositivos físicos');
      }
    } catch (error) {
      console.error('Error configurando notificaciones:', error.message);
      // No lanzar el error, solo loguearlo
    }
  }

  // Registrar token de notificaciones push (solo development builds)
  async registrarToken() {
    if (!this.isPushAvailable()) {
      console.warn('Push notifications no disponibles en este entorno');
      return null;
    }

    const NotificationsModule = await this.loadNotificationsModule();
    if (!NotificationsModule) return null;

    try {
      // Verificar permisos
      const { status: existingStatus } = await NotificationsModule.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await NotificationsModule.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('No se otorgaron permisos para notificaciones');
        return null;
      }

      // Obtener token de Expo Push (solo funciona en development builds)
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        console.warn('ProjectId no configurado. Configura eas.projectId en app.json');
        return null;
      }

      const tokenData = await NotificationsModule.getExpoPushTokenAsync({
        projectId,
      });

      const token = tokenData.data;
      this.pushToken = token;

      console.log('✅ Push token obtenido:', token);

      // Enviar token al backend
      await httpClient.post(NOTIFICACION_ENDPOINTS.REGISTRAR_TOKEN, {
        token,
        device_type: Device.osName,
        device_model: Device.modelName,
      });

      console.log('✅ Push token registrado en backend');
      return token;
    } catch (error) {
      console.error('❌ Error al registrar token:', error.message);
      return null;
    }
  }

  // Listar notificaciones del servidor
  async listar(filtros = {}) {
    try {
      const response = await httpClient.get(NOTIFICACION_ENDPOINTS.BASE, {
        params: filtros,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Marcar notificación como leída
  async marcarLeida(id) {
    try {
      await httpClient.post(NOTIFICACION_ENDPOINTS.MARCAR_LEIDA(id));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Programar notificación local (solo development builds)
  async programarNotificacionLocal(titulo, mensaje, fecha) {
    if (this.isExpoGo) {
      console.warn('Notificaciones locales no disponibles en Expo Go SDK 53+');
      return null;
    }

    const NotificationsModule = await this.loadNotificationsModule();
    if (!NotificationsModule) return null;

    try {
      // Verificar permisos primero
      const { status } = await NotificationsModule.getPermissionsAsync();

      if (status !== 'granted') {
        const { status: newStatus } = await NotificationsModule.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          console.warn('Permisos de notificaciones denegados');
          return null;
        }
      }

      const notificationId = await NotificationsModule.scheduleNotificationAsync({
        content: {
          title: titulo,
          body: mensaje,
          sound: true,
          priority: NotificationsModule.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          date: fecha,
        },
      });

      console.log('✅ Notificación local programada:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('❌ Error al programar notificación local:', error);
      return null;
    }
  }

  // Mostrar notificación local inmediata (solo development builds)
  async mostrarNotificacionAhora(titulo, mensaje) {
    if (this.isExpoGo) {
      console.warn('Notificaciones locales no disponibles en Expo Go SDK 53+');
      return null;
    }

    const NotificationsModule = await this.loadNotificationsModule();
    if (!NotificationsModule) return null;

    try {
      const { status } = await NotificationsModule.getPermissionsAsync();

      if (status !== 'granted') {
        const { status: newStatus } = await NotificationsModule.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          console.warn('Permisos de notificaciones denegados');
          return null;
        }
      }

      const notificationId = await NotificationsModule.scheduleNotificationAsync({
        content: {
          title: titulo,
          body: mensaje,
          sound: true,
          priority: NotificationsModule.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // null = mostrar inmediatamente
      });

      console.log('✅ Notificación local mostrada:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('❌ Error al mostrar notificación:', error);
      return null;
    }
  }

  // Cancelar todas las notificaciones locales programadas
  async cancelarTodasLocales() {
    if (this.isExpoGo) return;

    const NotificationsModule = await this.loadNotificationsModule();
    if (!NotificationsModule) return;

    try {
      await NotificationsModule.cancelAllScheduledNotificationsAsync();
      console.log('✅ Todas las notificaciones locales canceladas');
    } catch (error) {
      console.error('❌ Error al cancelar notificaciones:', error);
    }
  }

  // Obtener notificaciones locales programadas
  async obtenerNotificacionesProgramadas() {
    if (this.isExpoGo) return [];

    const NotificationsModule = await this.loadNotificationsModule();
    if (!NotificationsModule) return [];

    try {
      const notifications = await NotificationsModule.getAllScheduledNotificationsAsync();
      return notifications;
    } catch (error) {
      console.error('Error obteniendo notificaciones programadas:', error);
      return [];
    }
  }

  handleError(error) {
    if (error.response) {
      const message = error.response.data?.message ||
                      error.response.data?.detail ||
                      'Error en la solicitud';
      return new Error(message);
    } else if (error.request) {
      return new Error('No se pudo conectar con el servidor');
    } else {
      return new Error('Error al procesar la solicitud');
    }
  }
}

export default new NotificacionService();
