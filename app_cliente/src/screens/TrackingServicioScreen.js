import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { servicioService } from '../services/servicio';

const ESTADOS = [
  { value: 'asignado', label: 'Asignado', icon: '📋', desc: 'Equipo asignado' },
  { value: 'en_camino', label: 'En Camino', icon: '🚗', desc: 'Equipo en camino al origen' },
  { value: 'en_origen', label: 'En Origen', icon: '📍', desc: 'Equipo llegó al origen' },
  { value: 'cargando', label: 'Cargando', icon: '📦', desc: 'Cargando pertenencias' },
  { value: 'en_ruta', label: 'En Ruta', icon: '🛣️', desc: 'En camino al destino' },
  { value: 'en_destino', label: 'En Destino', icon: '🏠', desc: 'Equipo llegó al destino' },
  { value: 'descargando', label: 'Descargando', icon: '📤', desc: 'Descargando pertenencias' },
  { value: 'completado', label: 'Completado', icon: '✅', desc: 'Servicio completado' },
];

export default function TrackingServicioScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const [servicio, setServicio] = useState(route.params?.servicio);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      cargarDetalle(true);
    }, 30000); // Actualizar cada 30 segundos

    return () => clearInterval(interval);
  }, []);

  const cargarDetalle = async (silencioso = false) => {
    if (!servicio?.id) return;

    if (!silencioso) setLoading(true);

    const result = await servicioService.getServicioDetalle(servicio.id);
    if (result.success) {
      setServicio(result.data);
    }

    if (!silencioso) setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDetalle();
    setRefreshing(false);
  };

  if (loading && !servicio) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196f3" />
      </View>
    );
  }

  const cotizacion = servicio.reserva?.cotizacion;
  const estadoActual = ESTADOS.findIndex((e) => e.value === servicio.estado);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.codigo}>{servicio.reserva_codigo}</Text>
          <Text style={styles.fecha}>
            {new Date(servicio.reserva?.fecha_servicio).toLocaleDateString(
              'es-ES',
              {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              }
            )}
          </Text>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estado en Tiempo Real</Text>
          <View style={styles.timeline}>
            {ESTADOS.map((estado, index) => {
              const isCompleted = index <= estadoActual;
              const isCurrent = index === estadoActual;

              return (
                <View key={estado.value} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.timelineIcon,
                        isCompleted && styles.timelineIconCompleted,
                        isCurrent && styles.timelineIconCurrent,
                      ]}
                    >
                      <Text style={styles.timelineEmoji}>{estado.icon}</Text>
                    </View>
                    {index < ESTADOS.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          isCompleted && styles.timelineLineCompleted,
                        ]}
                      />
                    )}
                  </View>

                  <View style={styles.timelineContent}>
                    <Text
                      style={[
                        styles.timelineLabel,
                        isCompleted && styles.timelineLabelCompleted,
                        isCurrent && styles.timelineLabelCurrent,
                      ]}
                    >
                      {estado.label}
                    </Text>
                    <Text style={styles.timelineDesc}>{estado.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Direcciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Direcciones</Text>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Origen:</Text>
            <Text style={styles.cardValue}>{cotizacion?.direccion_origen}</Text>

            <View style={styles.divider} />

            <Text style={styles.cardLabel}>Destino:</Text>
            <Text style={styles.cardValue}>{cotizacion?.direccion_destino}</Text>
          </View>
        </View>

        {/* Equipo */}
        {servicio.equipo && servicio.equipo.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Equipo Asignado</Text>
            <View style={styles.card}>
              {servicio.equipo.map((miembro, index) => (
                <View key={index} style={styles.equipoItem}>
                  <Text style={styles.equipoNombre}>
                    {miembro.personal_nombre}
                  </Text>
                  <Text style={styles.equipoRol}>{miembro.rol_asignado}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Botón de confirmación cuando está completado */}
      {servicio.estado === 'completado' && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              navigation.navigate('ConfirmacionEntrega', { servicio })
            }
          >
            <Text style={styles.buttonText}>
              ✍️ Confirmar Entrega y Calificar
            </Text>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: '#2196f3',
    padding: 20,
    paddingTop: 60,
  },
  codigo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  fecha: {
    fontSize: 16,
    color: '#e3f2fd',
    textTransform: 'capitalize',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  timeline: {
    paddingLeft: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineIconCompleted: {
    backgroundColor: '#4caf50',
  },
  timelineIconCurrent: {
    backgroundColor: '#2196f3',
  },
  timelineEmoji: {
    fontSize: 20,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e0e0e0',
    marginTop: 4,
  },
  timelineLineCompleted: {
    backgroundColor: '#4caf50',
  },
  timelineContent: {
    flex: 1,
    paddingTop: 8,
  },
  timelineLabel: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
  timelineLabelCompleted: {
    color: '#4caf50',
  },
  timelineLabelCurrent: {
    color: '#2196f3',
  },
  timelineDesc: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 16,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  equipoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  equipoNombre: {
    fontSize: 14,
    color: '#333',
  },
  equipoRol: {
    fontSize: 12,
    color: '#666',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    backgroundColor: '#2196f3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
