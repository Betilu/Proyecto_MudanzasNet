import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Loading, Badge } from '../../components';
import { reservaService } from '../../services';
import { COLORS } from '../../constants/colors';

const SeguimientoScreen = ({ route }) => {
  const { id } = route.params;
  const [seguimiento, setSeguimiento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargarSeguimiento = async () => {
    try {
      const data = await reservaService.getSeguimiento(id);
      setSeguimiento(data);
    } catch (error) {
      console.error('Error cargando seguimiento:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarSeguimiento();
  }, [id]);

  if (loading) return <Loading fullScreen message="Cargando seguimiento..." />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            cargarSeguimiento();
          }}
        />
      }
    >
      <Card variant="elevated">
        <Text style={styles.title}>Seguimiento en Tiempo Real</Text>
        <Text style={styles.subtitle}>Reserva ID: {id}</Text>
        <Badge label={seguimiento?.estado_actual || 'sin estado'} variant="info" />
      </Card>

      {(seguimiento?.eventos || []).map((evento, index) => (
        <Card key={`${evento.estado}-${index}`} variant="outlined">
          <Text style={styles.estado}>{evento.estado}</Text>
          <Text style={styles.detalle}>{evento.descripcion || 'Actualización de estado'}</Text>
          {evento.fecha && (
            <Text style={styles.fecha}>{new Date(evento.fecha).toLocaleString()}</Text>
          )}
        </Card>
      ))}

      {!seguimiento?.eventos?.length && (
        <Card variant="outlined">
          <Text style={styles.detalle}>Aún no hay eventos de seguimiento para esta reserva.</Text>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, color: COLORS.black },
  subtitle: { fontSize: 14, marginBottom: 10, color: COLORS.dark },
  estado: { fontSize: 16, fontWeight: '600', color: COLORS.black, marginBottom: 6 },
  detalle: { fontSize: 14, color: COLORS.dark, marginBottom: 6 },
  fecha: { fontSize: 12, color: COLORS.dark },
});

export default SeguimientoScreen;
