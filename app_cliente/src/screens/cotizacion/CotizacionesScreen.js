import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { cotizacionService } from '../../services';
import { Card, Button, Badge, Loading } from '../../components';
import { COLORS } from '../../constants/colors';
import {
  formatFechaCotizacion,
  getEstadoCotizacionMeta,
  precioMostradoCotizacion,
  textoRutaCotizacion,
} from '../../utils/cotizacionDisplay';

const CotizacionesScreen = ({ navigation }) => {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const normalizarLista = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  };

  const cargarCotizaciones = useCallback(async (esRefresh) => {
    try {
      if (esRefresh) setRefreshing(true);
      const response = await cotizacionService.listar();
      setCotizaciones(normalizarLista(response));
    } catch (error) {
      console.error('Error cargando cotizaciones:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarCotizaciones(false);
  }, [cargarCotizaciones]);

  const onRefresh = () => cargarCotizaciones(true);

  if (loading) return <Loading fullScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          title="Nueva Cotización"
          onPress={() => navigation.navigate('NuevaCotizacion')}
          fullWidth
        />
      </View>

      <FlatList
        data={cotizaciones}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const badge = getEstadoCotizacionMeta(item.estado);
          const fechaStr = formatFechaCotizacion(item.fecha_deseada);
          const precioStr = precioMostradoCotizacion(item);
          return (
            <Card
              variant="elevated"
              onPress={() => navigation.navigate('CotizacionDetalle', { id: item.id })}
            >
              <View style={styles.cotizacionHeader}>
                <Text style={styles.cotizacionId}>COT-{item.id}</Text>
                <Badge label={badge.label} variant={badge.variant} />
              </View>
              <Text style={styles.ruta}>{textoRutaCotizacion(item)}</Text>
              {item.tipo_servicio_nombre ? (
                <Text style={styles.meta}>{item.tipo_servicio_nombre}</Text>
              ) : null}
              {item.cantidad_objetos > 0 ? (
                <Text style={styles.meta}>
                  {item.cantidad_objetos} objeto{item.cantidad_objetos !== 1 ? 's' : ''}
                  {item.peso_total_kg != null && Number(item.peso_total_kg) > 0
                    ? ` · ${Number(item.peso_total_kg).toLocaleString('es-BO')} kg`
                    : ''}
                </Text>
              ) : null}
              {fechaStr ? (
                <Text style={styles.fecha}>Fecha deseada: {fechaStr}</Text>
              ) : (
                <Text style={styles.fechaMuted}>Fecha deseada: sin definir</Text>
              )}
              {precioStr != null ? (
                <Text style={styles.precio}>Bs {precioStr}</Text>
              ) : (
                <Text style={styles.precioMuted}>Precio pendiente de cálculo</Text>
              )}
            </Card>
          );
        }}
        ListEmptyComponent={
          <Card variant="outlined" padding="lg">
            <Text style={styles.emptyText}>No tienes cotizaciones</Text>
            <Text style={styles.emptySubtext}>Crea una para comenzar</Text>
          </Card>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  header: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light,
  },
  list: {
    padding: 16,
  },
  cotizacionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cotizacionId: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  ruta: {
    fontSize: 14,
    color: COLORS.dark,
    marginBottom: 6,
  },
  meta: {
    fontSize: 13,
    color: COLORS.dark,
    marginBottom: 6,
    opacity: 0.9,
  },
  fecha: {
    fontSize: 14,
    color: COLORS.dark,
    marginBottom: 8,
  },
  fechaMuted: {
    fontSize: 14,
    color: COLORS.dark,
    marginBottom: 8,
    opacity: 0.65,
  },
  precio: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  precioMuted: {
    fontSize: 14,
    color: COLORS.dark,
    opacity: 0.75,
    fontStyle: 'italic',
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
});

export default CotizacionesScreen;
