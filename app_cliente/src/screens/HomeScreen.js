import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuth } from '../hooks';
import { Card, Button, Badge, Loading } from '../components';
import { reservaService } from '../services';
import { COLORS } from '../constants/colors';
import { ESTADOS_RESERVA } from '../constants/api';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [reservasActivas, setReservasActivas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargarReservas = async () => {
    try {
      setLoading(true);
      // Backend app-cliente: mudanzas activas (reserva + servicio en curso, Fase 4–6)
      const response = await reservaService.listar({ activas: 1 });
      console.log('response', response);
      setReservasActivas(response.results || response);
    } catch (error) {
      console.error('Error cargando reservas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarReservas();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    cargarReservas();
  };

  const etiquetaEstado = (estadoSeguimiento, estadoReserva) => {
    const e = estadoSeguimiento || estadoReserva;
    const estadoMap = {
      [ESTADOS_RESERVA.PENDIENTE]: { variant: 'warning', label: 'Pendiente' },
      [ESTADOS_RESERVA.CONFIRMADA]: { variant: 'success', label: 'Confirmada' },
      asignado: { variant: 'info', label: 'Asignada' },
      [ESTADOS_RESERVA.EN_CAMINO]: { variant: 'info', label: 'En camino' },
      [ESTADOS_RESERVA.EN_ORIGEN]: { variant: 'warning', label: 'En origen' },
      [ESTADOS_RESERVA.CARGANDO]: { variant: 'warning', label: 'Cargando' },
      [ESTADOS_RESERVA.EN_RUTA]: { variant: 'info', label: 'En ruta' },
      [ESTADOS_RESERVA.EN_DESTINO]: { variant: 'warning', label: 'En destino' },
      [ESTADOS_RESERVA.DESCARGANDO]: { variant: 'warning', label: 'Descargando' },
      completado: { variant: 'success', label: 'Completada' },
      [ESTADOS_RESERVA.COMPLETADA]: { variant: 'success', label: 'Completada' },
    };
    return estadoMap[e] || { variant: 'default', label: e || estadoReserva };
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola, {user?.nombre}!</Text>
        <Text style={styles.subtitle}>Bienvenido a Mudanzas CRM</Text>
      </View>

      <View style={styles.actions}>
        <Card variant="elevated" padding="md">
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <Button
            title="Nueva Cotización"
            onPress={() => navigation.navigate('NuevaCotizacion')}
            fullWidth
            style={styles.actionButton}
          />
          <Button
            title="Mis Cotizaciones"
            onPress={() => navigation.navigate('Cotizaciones')}
            variant="outline"
            fullWidth
            style={styles.actionButton}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mudanzas Activas</Text>
        {reservasActivas.length === 0 ? (
          <Card variant="outlined" padding="lg">
            <Text style={styles.emptyText}>No tienes mudanzas activas</Text>
            <Text style={styles.emptySubtext}>
              Crea una cotización para comenzar
            </Text>
          </Card>
        ) : (
          reservasActivas.map((reserva) => {
            const badge = etiquetaEstado(reserva.estado_seguimiento, reserva.estado);
            return (
              <Card
                key={reserva.id}
                variant="elevated"
                onPress={() =>
                  navigation.navigate('ReservaDetalle', { id: reserva.id })
                }
              >
                <View style={styles.reservaHeader}>
                  <Text style={styles.reservaCodigo}>{reserva.codigo_confirmacion}</Text>
                  <Badge label={badge.label} variant={badge.variant} />
                </View>
                <Text style={styles.reservaRuta}>
                  {reserva.zona_origen} → {reserva.zona_destino}
                </Text>
                <Text style={styles.reservaFecha}>
                  📅 {new Date(reserva.fecha_servicio).toLocaleDateString()}
                </Text>
                <Button
                  title="Ver Seguimiento"
                  size="sm"
                  onPress={() =>
                    navigation.navigate('Seguimiento', { id: reserva.id })
                  }
                  style={styles.seguimientoButton}
                />
              </Card>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  header: {
    padding: 24,
    backgroundColor: COLORS.primary,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },
  actions: {
    padding: 16,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 16,
  },
  actionButton: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.dark,
    textAlign: 'center',
  },
  reservaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reservaCodigo: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  reservaRuta: {
    fontSize: 14,
    color: COLORS.dark,
    marginBottom: 8,
  },
  reservaFecha: {
    fontSize: 14,
    color: COLORS.dark,
    marginBottom: 12,
  },
  seguimientoButton: {
    marginTop: 8,
  },
});

export default HomeScreen;
