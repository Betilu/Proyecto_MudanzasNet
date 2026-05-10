import { useState, useEffect, useRef } from 'react';
import { notificacionService } from '../services';

// Importación dinámica para evitar error en Expo Go
let Notifications = null;

/**
 * Hook para manejar notificaciones (locales y push)
 *
 * NOTA: Push notifications requieren development build desde SDK 53+
 * En Expo Go las notificaciones están deshabilitadas
 */
export const useNotifications = () => {
  const [notification, setNotification] = useState(null);
  const [token, setToken] = useState(null);
  const [isPushAvailable, setIsPushAvailable] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Configurar notificaciones
    const setup = async () => {
      try {
        await notificacionService.configurar();

        // Verificar si push está disponible
        const pushAvailable = notificacionService.isPushAvailable();
        setIsPushAvailable(pushAvailable);

        // Solo intentar registrar push token si está disponible
        if (pushAvailable) {
          const pushToken = await notificacionService.registrarToken();
          setToken(pushToken);
        }

        // Solo configurar listeners si no estamos en Expo Go
        if (!notificacionService.isExpoGo && notificacionService.notificationsModule) {
          const NotificationsModule = notificacionService.notificationsModule;

          // Listener para notificaciones recibidas mientras la app está abierta
          notificationListener.current = NotificationsModule.addNotificationReceivedListener(
            (notification) => {
              setNotification(notification);
            }
          );

          // Listener para cuando el usuario toca una notificación
          responseListener.current = NotificationsModule.addNotificationResponseReceivedListener(
            (response) => {
              // Manejar acción del usuario al tocar la notificación
              const data = response.notification.request.content.data;
              handleNotificationAction(data);
            }
          );
        }
      } catch (error) {
        console.error('Error en setup de notificaciones:', error.message);
      }
    };

    setup();

    // Cleanup
    return () => {
      if (notificationListener.current && notificacionService.notificationsModule) {
        notificacionService.notificationsModule.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current && notificacionService.notificationsModule) {
        notificacionService.notificationsModule.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const handleNotificationAction = (data) => {
    // Aquí puedes navegar a pantallas específicas según el tipo de notificación
    console.log('Notificación tocada:', data);
    // Por ejemplo: navigation.navigate('ReservaDetalle', { id: data.reserva_id });
  };

  // Programar notificación local (funciona en Expo Go)
  const scheduleNotification = async (titulo, mensaje, fecha) => {
    return await notificacionService.programarNotificacionLocal(titulo, mensaje, fecha);
  };

  // Mostrar notificación inmediata (útil para testing en Expo Go)
  const showNotificationNow = async (titulo, mensaje) => {
    return await notificacionService.mostrarNotificacionAhora(titulo, mensaje);
  };

  // Cancelar todas las notificaciones locales
  const cancelAllNotifications = async () => {
    await notificacionService.cancelarTodasLocales();
  };

  // Obtener notificaciones programadas
  const getScheduledNotifications = async () => {
    return await notificacionService.obtenerNotificacionesProgramadas();
  };

  return {
    notification,
    token,
    isPushAvailable,
    scheduleNotification,
    showNotificationNow,
    cancelAllNotifications,
    getScheduledNotifications,
  };
};

export default useNotifications;
