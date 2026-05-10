import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { servicioService } from '../services/servicio';
import { useAuth } from '../context/AuthContext';

const ESTADOS_LABELS = {
  asignado: 'Asignado',
  en_camino: 'En Camino',
  en_origen: 'En Origen',
  cargando: 'Cargando',
  en_ruta: 'En Ruta',
  en_destino: 'En Destino',
  descargando: 'Descargando',
  completado: 'Completado',
};

const ESTADOS_COLORS = {
  asignado: '#9e9e9e',
  en_camino: '#2196f3',
  en_origen: '#03a9f4',
  cargando: '#00bcd4',
  en_ruta: '#009688',
  en_destino: '#4caf50',
  descargando: '#8bc34a',
  completado: '#4caf50',
};

export default function ServiciosScreen() {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { logout, user } = useAuth();

  useEffect(() => {
    cargarServicios();
  }, []);

  const cargarServicios = async () => {
    setLoading(true);
    const result = await servicioService.getMisServicios();
    if (result.success) {
      setServicios(result.data);
    }
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await cargarServicios();
    setRefreshing(false);
  }, []);

  const renderServicio = ({ item }) => {
    const cotizacion = item.reserva?.cotizacion;
    const fecha = new Date(item.reserva?.fecha_servicio);
    const fechaStr = fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('TrackingServicio', { servicio: item })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.codigo}>{item.reserva_codigo}</Text>
          <View
            style={[
              styles.estadoBadge,
              { backgroundColor: ESTADOS_COLORS[item.estado] || '#9e9e9e' },
            ]}
          >
            <Text style={styles.estadoText}>
              {ESTADOS_LABELS[item.estado] || item.estado}
            </Text>
          </View>
        </View>

        <Text style={styles.fecha}>{fechaStr}</Text>
        <Text style={styles.franja}>{item.reserva?.franja_horaria}</Text>

        <View style={styles.divider} />

        <View style={styles.direcciones}>
          <Text style={styles.direccionLabel}>Origen:</Text>
          <Text style={styles.direccion} numberOfLines={1}>
            {cotizacion?.direccion_origen}
          </Text>

          <Text style={styles.direccionLabel}>Destino:</Text>
          <Text style={styles.direccion} numberOfLines={1}>
            {cotizacion?.direccion_destino}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.objetos}>
            {cotizacion?.cantidad_objetos || 0} objetos
          </Text>
          {item.estado === 'completado' && (
            <Text style={styles.completado}>✅ Ver detalles</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196f3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mis Mudanzas</Text>
          <Text style={styles.headerSubtitle}>
            {user?.nombre_completo || 'Cliente'}
          </Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {servicios.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No tienes servicios registrados
          </Text>
        </View>
      ) : (
        <FlatList
          data={servicios}
          renderItem={renderServicio}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#2196f3',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e3f2fd',
    marginTop: 4,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fff',
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  codigo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  estadoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  fecha: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  franja: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  direcciones: {
    marginBottom: 12,
  },
  direccionLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  direccion: {
    fontSize: 14,
    color: '#333',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  objetos: {
    fontSize: 14,
    color: '#666',
  },
  completado: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
