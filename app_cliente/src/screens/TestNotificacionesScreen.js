import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Card } from '../components';
import { useNotifications } from '../hooks';
import { COLORS } from '../constants/colors';

/**
 * Pantalla de prueba para notificaciones
 * Útil para testing en Expo Go (solo notificaciones locales)
 */
const TestNotificacionesScreen = () => {
  const {
    token,
    isPushAvailable,
    showNotificationNow,
    scheduleNotification,
    getScheduledNotifications,
    cancelAllNotifications,
  } = useNotifications();

  const [programadas, setProgramadas] = useState([]);

  const handleTestInmediata = async () => {
    try {
      await showNotificationNow(
        '🎉 Notificación de Prueba',
        'Esta es una notificación local inmediata'
      );
      Alert.alert('Éxito', 'Notificación mostrada');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleTestProgramada = async () => {
    try {
      const fecha = new Date();
      fecha.setSeconds(fecha.getSeconds() + 10);

      await scheduleNotification(
        '⏰ Recordatorio',
        'Esta notificación fue programada hace 10 segundos',
        fecha
      );

      Alert.alert(
        'Éxito',
        'Notificación programada para dentro de 10 segundos'
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleVerProgramadas = async () => {
    try {
      const notificaciones = await getScheduledNotifications();
      setProgramadas(notificaciones);
      Alert.alert(
        'Notificaciones Programadas',
        `Hay ${notificaciones.length} notificaciones programadas`
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCancelarTodas = async () => {
    try {
      await cancelAllNotifications();
      setProgramadas([]);
      Alert.alert('Éxito', 'Todas las notificaciones canceladas');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card variant="elevated" padding="lg">
        <Text style={styles.title}>Estado de Notificaciones</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Push Notifications:</Text>
          <Text style={[
            styles.value,
            { color: isPushAvailable ? COLORS.success : COLORS.warning }
          ]}>
            {isPushAvailable ? '✅ Disponible' : '⚠️  No disponible (Expo Go)'}
          </Text>
        </View>

        {isPushAvailable && token && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Push Token:</Text>
            <Text style={styles.valueSmall} numberOfLines={1} ellipsizeMode="middle">
              {token}
            </Text>
          </View>
        )}

        {!isPushAvailable && (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              ⚠️  Push notifications requieren un development build.
              {'\n\n'}
              Ejecuta: npx expo run:android
              {'\n\n'}
              Mientras tanto, puedes probar notificaciones locales.
            </Text>
          </View>
        )}
      </Card>

      <Card variant="elevated" padding="lg">
        <Text style={styles.title}>Probar Notificaciones Locales</Text>
        <Text style={styles.subtitle}>
          (Funcionan en Expo Go y Development Builds)
        </Text>

        <Button
          title="Mostrar Notificación Inmediata"
          onPress={handleTestInmediata}
          fullWidth
          style={styles.button}
        />

        <Button
          title="Programar en 10 Segundos"
          onPress={handleTestProgramada}
          variant="outline"
          fullWidth
          style={styles.button}
        />

        <Button
          title="Ver Programadas"
          onPress={handleVerProgramadas}
          variant="outline"
          fullWidth
          style={styles.button}
        />

        {programadas.length > 0 && (
          <View style={styles.programadasInfo}>
            <Text style={styles.programadasText}>
              📋 {programadas.length} notificaciones programadas
            </Text>
          </View>
        )}

        <Button
          title="Cancelar Todas"
          onPress={handleCancelarTodas}
          variant="danger"
          fullWidth
        />
      </Card>

      <Card variant="outlined" padding="lg">
        <Text style={styles.infoTitle}>💡 Información</Text>
        <Text style={styles.infoText}>
          • Notificaciones locales: Funcionan en Expo Go
          {'\n'}
          • Push notifications: Requieren development build
          {'\n'}
          • Para producción: Usar EAS Build
          {'\n\n'}
          Ver NOTIFICACIONES_GUIA.md para más información
        </Text>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.dark,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  infoRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark,
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },
  valueSmall: {
    fontSize: 12,
    color: COLORS.dark,
  },
  warning: {
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.warning + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  warningText: {
    fontSize: 12,
    color: COLORS.black,
    lineHeight: 18,
  },
  button: {
    marginBottom: 12,
  },
  programadasInfo: {
    padding: 12,
    backgroundColor: COLORS.info + '20',
    borderRadius: 8,
    marginBottom: 12,
  },
  programadasText: {
    fontSize: 14,
    color: COLORS.black,
    textAlign: 'center',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.dark,
    lineHeight: 20,
  },
});

export default TestNotificacionesScreen;
