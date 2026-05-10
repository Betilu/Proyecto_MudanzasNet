import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { servicioService } from '../../services/servicio';
import { COLORS } from '../../constants/colors';

const TIPOS_INCIDENCIA = [
  { value: 'dano_objeto', label: 'Daño a Objeto', icon: '💔' },
  { value: 'objeto_perdido', label: 'Objeto Perdido', icon: '🔍' },
  { value: 'retraso', label: 'Retraso', icon: '⏰' },
  { value: 'servicio_incompleto', label: 'Servicio Incompleto', icon: '⚠️' },
  { value: 'otro', label: 'Otro', icon: '📝' },
];

const GRAVEDADES = [
  { value: 'baja', label: 'Baja', color: '#4caf50' },
  { value: 'media', label: 'Media', color: '#ff9800' },
  { value: 'alta', label: 'Alta', color: '#f44336' },
];

const ReportarIncidenciaScreen = ({ route }) => {
  const { servicio } = route.params;
  const navigation = useNavigation();

  const [tipo, setTipo] = useState('');
  const [gravedad, setGravedad] = useState('media');
  const [descripcion, setDescripcion] = useState('');
  const [foto, setFoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const cotizacion = servicio.reserva?.cotizacion;
  const objetos = cotizacion?.objetos || [];

  const handleTomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso denegado',
        'Necesitamos permiso para usar la cámara'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFoto(result.assets[0]);
    }
  };

  const handleSeleccionarFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permiso denegado',
        'Necesitamos permiso para acceder a tu galería'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFoto(result.assets[0]);
    }
  };

  const handleEnviar = async () => {
    if (!tipo) {
      Alert.alert('Error', 'Por favor seleccione el tipo de incidencia');
      return;
    }

    if (!descripcion.trim()) {
      Alert.alert('Error', 'Por favor describa la incidencia');
      return;
    }

    Alert.alert('Reportar Incidencia', '¿Está seguro de reportar esta incidencia?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reportar',
        onPress: async () => {
          setLoading(true);
          const result = await servicioService.reportarIncidencia(
            servicio.id,
            {
              tipo,
              descripcion,
              gravedad,
            },
            foto
          );
          setLoading(false);

          if (result.success) {
            Alert.alert(
              'Incidencia Reportada',
              'Su reporte ha sido registrado y será revisado por nuestro equipo',
              [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]
            );
          } else {
            Alert.alert('Error', result.error);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reportar Incidencia</Text>
        <Text style={styles.headerSubtitle}>{servicio.reserva_codigo}</Text>
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Reporte cualquier problema o daño ocurrido durante el servicio
        </Text>
      </View>

      {/* Tipo de Incidencia */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tipo de Incidencia</Text>
        <View style={styles.optionsGrid}>
          {TIPOS_INCIDENCIA.map((tipoItem) => (
            <TouchableOpacity
              key={tipoItem.value}
              style={[
                styles.optionCard,
                tipo === tipoItem.value && styles.optionCardSelected,
              ]}
              onPress={() => setTipo(tipoItem.value)}
            >
              <Text style={styles.optionIcon}>{tipoItem.icon}</Text>
              <Text
                style={[
                  styles.optionLabel,
                  tipo === tipoItem.value && styles.optionLabelSelected,
                ]}
              >
                {tipoItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Gravedad */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gravedad</Text>
        <View style={styles.gravedadContainer}>
          {GRAVEDADES.map((gravedadItem) => (
            <TouchableOpacity
              key={gravedadItem.value}
              style={[
                styles.gravedadButton,
                {
                  backgroundColor:
                    gravedad === gravedadItem.value
                      ? gravedadItem.color
                      : '#f5f5f5',
                },
              ]}
              onPress={() => setGravedad(gravedadItem.value)}
            >
              <Text
                style={[
                  styles.gravedadText,
                  {
                    color:
                      gravedad === gravedadItem.value ? '#fff' : '#333',
                  },
                ]}
              >
                {gravedadItem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Descripción */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Descripción Detallada</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Describa lo sucedido con el mayor detalle posible..."
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>

      {/* Foto */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Foto de Evidencia (opcional)</Text>
        {foto ? (
          <View style={styles.fotoContainer}>
            <Image source={{ uri: foto.uri }} style={styles.fotoPreview} />
            <View style={styles.fotoButtons}>
              <TouchableOpacity
                style={styles.fotoButtonSecondary}
                onPress={() => setFoto(null)}
              >
                <Text style={styles.fotoButtonSecondaryText}>Quitar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fotoButtonSecondary}
                onPress={handleTomarFoto}
              >
                <Text style={styles.fotoButtonSecondaryText}>
                  Tomar otra
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.fotoButtons}>
            <TouchableOpacity
              style={styles.fotoButton}
              onPress={handleTomarFoto}
            >
              <Text style={styles.fotoButtonText}>📷 Tomar Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fotoButton}
              onPress={handleSeleccionarFoto}
            >
              <Text style={styles.fotoButtonText}>🖼️ Seleccionar</Text>
            </TouchableOpacity>
          </View>
        )}
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
            <Text style={styles.enviarButtonText}>Reportar Incidencia</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#f44336',
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
    color: '#ffebee',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#fff3e0',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  infoText: {
    fontSize: 14,
    color: '#e65100',
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
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  optionCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    padding: 16,
    margin: '1%',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  optionCardSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  optionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: '#1976d2',
    fontWeight: '600',
  },
  gravedadContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gravedadButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  gravedadText: {
    fontSize: 16,
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
  fotoContainer: {
    alignItems: 'center',
  },
  fotoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  fotoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  fotoButton: {
    flex: 1,
    backgroundColor: '#2196f3',
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  fotoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fotoButtonSecondary: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  fotoButtonSecondaryText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    paddingTop: 24,
  },
  enviarButton: {
    backgroundColor: '#f44336',
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

export default ReportarIncidenciaScreen;
