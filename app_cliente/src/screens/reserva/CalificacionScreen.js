import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { servicioService } from '../../services/servicio';
import { COLORS } from '../../constants/colors';

const CalificacionScreen = ({ route }) => {
  const { servicio } = route.params;
  const navigation = useNavigation();

  const [calificaciones, setCalificaciones] = useState({
    calificacion_general: 0,
    calificacion_puntualidad: 0,
    calificacion_cuidado: 0,
    calificacion_atencion: 0,
    comentarios: '',
  });

  const [loading, setLoading] = useState(false);

  const handleSetCalificacion = (campo, valor) => {
    setCalificaciones((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const handleEnviar = async () => {
    // Validar que al menos la calificación general esté presente
    if (calificaciones.calificacion_general === 0) {
      Alert.alert(
        'Calificación requerida',
        'Por favor califique el servicio con al menos 1 estrella'
      );
      return;
    }

    Alert.alert(
      'Enviar Calificación',
      '¿Está seguro de enviar su calificación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            setLoading(true);
            const result = await servicioService.calificarServicio(
              servicio.id,
              calificaciones
            );
            setLoading(false);

            if (result.success) {
              Alert.alert(
                'Gracias por su calificación',
                'Su opinión nos ayuda a mejorar nuestro servicio',
                [
                  {
                    text: 'Volver a Servicios',
                    onPress: () => navigation.navigate('MainTabs', { screen: 'Reservas' }),
                  },
                ]
              );
            } else {
              Alert.alert('Error', result.error);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calificar Servicio</Text>
        <Text style={styles.headerSubtitle}>{servicio.reserva_codigo}</Text>
      </View>

      {/* Información */}
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Ayúdanos a mejorar calificando tu experiencia con el servicio
        </Text>
      </View>

      {/* Calificación General */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Calificación General</Text>
        <Text style={styles.sectionSubtitle}>
          ¿Cómo fue tu experiencia en general?
        </Text>
        <StarRating
          value={calificaciones.calificacion_general}
          onChange={(value) =>
            handleSetCalificacion('calificacion_general', value)
          }
        />
      </View>

      {/* Puntualidad */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⏰ Puntualidad</Text>
        <Text style={styles.sectionSubtitle}>
          ¿El equipo llegó a tiempo?
        </Text>
        <StarRating
          value={calificaciones.calificacion_puntualidad}
          onChange={(value) =>
            handleSetCalificacion('calificacion_puntualidad', value)
          }
        />
      </View>

      {/* Cuidado de Objetos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦 Cuidado de Objetos</Text>
        <Text style={styles.sectionSubtitle}>
          ¿Cómo manejaron tus pertenencias?
        </Text>
        <StarRating
          value={calificaciones.calificacion_cuidado}
          onChange={(value) =>
            handleSetCalificacion('calificacion_cuidado', value)
          }
        />
      </View>

      {/* Atención del Equipo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👥 Atención del Equipo</Text>
        <Text style={styles.sectionSubtitle}>
          ¿Cómo fue el trato del personal?
        </Text>
        <StarRating
          value={calificaciones.calificacion_atencion}
          onChange={(value) =>
            handleSetCalificacion('calificacion_atencion', value)
          }
        />
      </View>

      {/* Comentarios */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💬 Comentarios (opcional)</Text>
        <Text style={styles.sectionSubtitle}>
          Cuéntanos más sobre tu experiencia
        </Text>
        <TextInput
          style={styles.textArea}
          placeholder="Escribe tus comentarios aquí..."
          value={calificaciones.comentarios}
          onChangeText={(text) => handleSetCalificacion('comentarios', text)}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
      </View>

      {/* Botón Enviar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.enviarButton, loading && styles.buttonDisabled]}
          onPress={handleEnviar}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.enviarButtonText}>Enviar Calificación</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

// Componente de estrellas
const StarRating = ({ value, onChange }) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.starsContainer}>
      {stars.map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onChange(star)}
          style={styles.starButton}
        >
          <Text style={styles.starText}>
            {star <= value ? '⭐' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
      <Text style={styles.ratingText}>
        {value > 0 ? `${value}/5` : 'Sin calificar'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: COLORS.primary || '#2196f3',
    padding: 20,
    paddingTop: 40,
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
  infoCard: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  starButton: {
    padding: 4,
  },
  starText: {
    fontSize: 40,
  },
  ratingText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 16,
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 120,
  },
  footer: {
    padding: 16,
    paddingTop: 24,
  },
  enviarButton: {
    backgroundColor: '#4caf50',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  enviarButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CalificacionScreen;
