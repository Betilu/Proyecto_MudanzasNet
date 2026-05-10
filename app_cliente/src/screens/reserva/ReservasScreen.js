import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Card, Badge, Loading } from '../../components';
import { reservaService } from '../../services';
import { COLORS } from '../../constants/colors';
import { ESTADOS_RESERVA } from '../../constants/api';

const ReservasScreen = ({ navigation }) => {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargarReservas = useCallback(async () => {
    try {
      const response = await reservaService.listar();
      setReservas(response?.results || response || []);
    } catch (error) {
      console.error('Error cargando reservas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarReservas();
  }, [cargarReservas]);

  const getEstadoBadge = (estadoSeguimiento, estadoReserva) => {
    const estado = estadoSeguimiento || estadoReserva;
    const map = {
      [ESTADOS_RESERVA.PENDIENTE]: { variant: 'warning', label: 'Pendiente' },
      [ESTADOS_RESERVA.CONFIRMADA]: { variant: 'success', label: 'Confirmada' },
      asignado: { variant: 'info', label: 'Asignada' },
      [ESTADOS_RESERVA.EN_CAMINO]: { variant: 'info', label: 'En camino' },
      [ESTADOS_RESERVA.EN_ORIGEN]: { variant: 'warning', label: 'En origen' },
      [ESTADOS_RESERVA.CARGANDO]: { variant: 'warning', label: 'Cargando' },
      [ESTADOS_RESERVA.EN_RUTA]: { variant: 'info', label: 'En ruta' },
      [ESTADOS_RESERVA.EN_DESTINO]: { variant: 'warning', label: 'En destino' },
      [ESTADOS_RESERVA.DESCARGANDO]: { variant: 'warning', label: 'Descargando' },
      completado: { variant: 'success', label: 'Servicio completado' },
      [ESTADOS_RESERVA.COMPLETADA]: { variant: 'success', label: 'Completada' },
      [ESTADOS_RESERVA.CANCELADA]: { variant: 'danger', label: 'Cancelada' },
    };
    return map[estado] || { variant: 'default', label: estado || 'Sin estado' };
  };

  if (loading) return <Loading fullScreen message="Cargando reservas..." />;

  return (
    <View style={styles.container}>
      <FlatList
        data={reservas}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              cargarReservas();
            }}
          />
        }
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card variant="elevated" onPress={() => navigation.navigate('ReservaDetalle', { id: item.id })}>
            <View style={styles.headerRow}>
              <Text style={styles.codigo}>{item.codigo_confirmacion || `RES-${item.id}`}</Text>
              <Badge {...getEstadoBadge(item.estado_seguimiento, item.estado)} />
            </View>
            <Text style={styles.ruta}>{item.zona_origen} → {item.zona_destino}</Text>
            <Text style={styles.fecha}>
              {item.fecha_servicio ? new Date(item.fecha_servicio).toLocaleDateString() : 'Fecha pendiente'}
            </Text>
          </Card>
        )}
        ListEmptyComponent={
          <Card variant="outlined" padding="lg">
            <Text style={styles.emptyText}>No tienes reservas registradas</Text>
          </Card>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  list: { padding: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  codigo: { fontSize: 16, fontWeight: '600', color: COLORS.black },
  ruta: { fontSize: 14, color: COLORS.dark, marginBottom: 6 },
  fecha: { fontSize: 13, color: COLORS.dark },
  emptyText: { textAlign: 'center', color: COLORS.dark },
});

export default ReservasScreen;
