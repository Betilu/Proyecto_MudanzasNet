import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { servicioService } from '../../services/servicio';
import { COLORS } from '../../constants/colors';

const ConfirmacionEntregaScreen = ({ route }) => {
  const { servicio } = route.params;
  const navigation = useNavigation();

  const [conforme, setConforme] = useState(true);
  const [observaciones, setObservaciones] = useState('');
  const [firmando, setFirmando] = useState(false);
  const [firmaBase64, setFirmaBase64] = useState(null);
  const [loading, setLoading] = useState(false);

  const cotizacion = servicio.reserva?.cotizacion;
  const objetos = cotizacion?.objetos || [];

  const handleReportarIncidencia = () => {
    navigation.navigate('ReportarIncidencia', { servicio });
  };

  const handleOpenFirma = () => {
    setFirmando(true);
  };

  const handleSaveFirma = (signature) => {
    setFirmaBase64(signature);
    setFirmando(false);
  };

  const handleConfirmar = async () => {
    if (!firmaBase64) {
      Alert.alert('Firma requerida', 'Por favor firme para confirmar la entrega');
      return;
    }

    Alert.alert(
      'Confirmar Entrega',
      `¿Está seguro de confirmar la entrega ${conforme ? 'conforme' : 'con observaciones'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setLoading(true);
            const result = await servicioService.confirmarEntrega(
              servicio.id,
              firmaBase64,
              conforme,
              observaciones
            );
            setLoading(false);

            if (result.success) {
              Alert.alert('Éxito', 'Entrega confirmada correctamente', [
                {
                  text: 'Calificar Servicio',
                  onPress: () =>
                    navigation.replace('Calificacion', { servicio }),
                },
              ]);
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
        <Text style={styles.headerTitle}>Confirmar Entrega</Text>
        <Text style={styles.headerSubtitle}>{servicio.reserva_codigo}</Text>
      </View>

      {/* Checklist de Objetos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          📦 Checklist de Objetos ({objetos.length})
        </Text>
        {objetos.length === 0 ? (
          <Text style={styles.emptyText}>No hay objetos registrados</Text>
        ) : (
          objetos.map((objeto, index) => (
            <View key={index} style={styles.objetoItem}>
              <Text style={styles.objetoNombre}>
                {objeto.nombre || objeto.tipo_objeto_nombre}
              </Text>
              <Text style={styles.objetoDescripcion}>
                {objeto.descripcion}
              </Text>
              {objeto.requiere_embalaje && (
                <Text style={styles.objetoTag}>📦 Con embalaje</Text>
              )}
            </View>
          ))
        )}
      </View>

      {/* Botón Reportar Incidencia */}
      <TouchableOpacity
        style={styles.reportButton}
        onPress={handleReportarIncidencia}
      >
        <Text style={styles.reportButtonText}>
          ⚠️ Reportar Incidencia o Daño
        </Text>
      </TouchableOpacity>

      {/* Estado de Conformidad */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estado de la Entrega</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={styles.radioOption}
            onPress={() => setConforme(true)}
          >
            <View
              style={[
                styles.radioCircle,
                conforme && styles.radioCircleSelected,
              ]}
            >
              {conforme && <View style={styles.radioCircleInner} />}
            </View>
            <Text style={styles.radioLabel}>Conforme - Todo en orden</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.radioOption}
            onPress={() => setConforme(false)}
          >
            <View
              style={[
                styles.radioCircle,
                !conforme && styles.radioCircleSelected,
              ]}
            >
              {!conforme && <View style={styles.radioCircleInner} />}
            </View>
            <Text style={styles.radioLabel}>Con observaciones</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Observaciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Observaciones (opcional)</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Ingrese observaciones adicionales..."
          value={observaciones}
          onChangeText={setObservaciones}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Firma Digital */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✍️ Firma Digital</Text>
        {firmaBase64 ? (
          <View style={styles.firmaContainer}>
            <Text style={styles.firmaTexto}>✅ Firma capturada</Text>
            <TouchableOpacity onPress={handleOpenFirma}>
              <Text style={styles.firmaLink}>Firmar nuevamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.firmaButton}
            onPress={handleOpenFirma}
          >
            <Text style={styles.firmaButtonText}>Abrir Panel de Firma</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Botón Confirmar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmarButton, loading && styles.buttonDisabled]}
          onPress={handleConfirmar}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmarButtonText}>
              Confirmar Entrega y Continuar
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de Firma */}
      <Modal visible={firmando} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Firmar con su dedo</Text>
            <TouchableOpacity onPress={() => setFirmando(false)}>
              <Text style={styles.modalClose}>Cancelar</Text>
            </TouchableOpacity>
          </View>
          <FirmaCanvas onSave={handleSaveFirma} onCancel={() => setFirmando(false)} />
        </View>
      </Modal>
    </ScrollView>
  );
};

// Componente simple de firma (sin librería externa por ahora)
// TODO: Implementar con react-native-signature-canvas o react-native-draw
const FirmaCanvas = ({ onSave, onCancel }) => {
  const [hasDrawn, setHasDrawn] = useState(false);

  const handleSave = () => {
    // Por ahora simulamos una firma base64
    // En producción, usar una librería de firma real
    const simulatedSignature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    onSave(simulatedSignature);
  };

  return (
    <View style={styles.firmaCanvasContainer}>
      <View style={styles.firmaCanvasArea}>
        <Text style={styles.firmaCanvasText}>
          {hasDrawn ? 'Firma capturada' : 'Dibuje su firma aquí'}
        </Text>
        <Text style={styles.firmaCanvasHint}>
          (Use su dedo para firmar en esta área)
        </Text>
        {/* Aquí iría el canvas real de firma */}
      </View>
      <View style={styles.firmaCanvasButtons}>
        <TouchableOpacity
          style={styles.firmaCanvasButton}
          onPress={() => setHasDrawn(false)}
        >
          <Text style={styles.firmaCanvasButtonText}>Limpiar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.firmaCanvasButton, styles.firmaCanvasSaveButton]}
          onPress={() => {
            setHasDrawn(true);
            handleSave();
          }}
        >
          <Text style={[styles.firmaCanvasButtonText, { color: '#fff' }]}>
            Guardar Firma
          </Text>
        </TouchableOpacity>
      </View>
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
  section: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  objetoItem: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  objetoNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  objetoDescripcion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  objetoTag: {
    fontSize: 12,
    color: '#2196f3',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  reportButton: {
    backgroundColor: '#ff9800',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  radioGroup: {
    marginTop: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#2196f3',
  },
  radioCircleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196f3',
  },
  radioLabel: {
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 100,
  },
  firmaContainer: {
    padding: 16,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    alignItems: 'center',
  },
  firmaTexto: {
    fontSize: 16,
    color: '#4caf50',
    fontWeight: '600',
    marginBottom: 8,
  },
  firmaLink: {
    fontSize: 14,
    color: '#2196f3',
    textDecorationLine: 'underline',
  },
  firmaButton: {
    backgroundColor: '#2196f3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  firmaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  confirmarButton: {
    backgroundColor: '#4caf50',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  confirmarButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#2196f3',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalClose: {
    fontSize: 16,
    color: '#fff',
  },
  firmaCanvasContainer: {
    flex: 1,
    padding: 16,
  },
  firmaCanvasArea: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderWidth: 2,
    borderColor: '#2196f3',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  firmaCanvasText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
  },
  firmaCanvasHint: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  firmaCanvasButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  firmaCanvasButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  firmaCanvasSaveButton: {
    backgroundColor: '#4caf50',
  },
  firmaCanvasButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

export default ConfirmacionEntregaScreen;
