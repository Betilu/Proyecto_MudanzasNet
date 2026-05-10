import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cotizacionService } from '../../services';
import { Button, Input, Loading, Card } from '../../components';
import MapPicker from '../../components/ubicacion/MapPicker';
import { COLORS } from '../../constants/colors';

const NuevaCotizacionScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [zonas, setZonas] = useState([]);
  const [tiposServicio, setTiposServicio] = useState([]);

  const [formData, setFormData] = useState({
    zonaOrigenId: '',
    direccionOrigen: '',
    latitudOrigen: null,
    longitudOrigen: null,
    zonaDestinoId: '',
    direccionDestino: '',
    latitudDestino: null,
    longitudDestino: null,
    fechaDeseada: new Date(),
    franjaHoraria: 'manana',
    tipoServicioId: '',
    descripcion: '',
  });

  const [showMapOrigen, setShowMapOrigen] = useState(false);
  const [showMapDestino, setShowMapDestino] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [zonasRes, tiposRes] = await Promise.all([
        cotizacionService.getZonas(),
        cotizacionService.getTiposServicio(),
      ]);
      setZonas(zonasRes.results || zonasRes);
      setTiposServicio(tiposRes.results || tiposRes);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleMapOrigenSelect = ({ direccion, latitud, longitud }) => {
    setFormData({
      ...formData,
      direccionOrigen: direccion,
      latitudOrigen: latitud,
      longitudOrigen: longitud,
    });
  };

  const handleMapDestinoSelect = ({ direccion, latitud, longitud }) => {
    setFormData({
      ...formData,
      direccionDestino: direccion,
      latitudDestino: latitud,
      longitudDestino: longitud,
    });
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData({ ...formData, fechaDeseada: selectedDate });
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /** DRF devuelve el PK en `id` tras create; tolera otras formas por si el backend cambia. */
  const extraerIdCotizacion = (data) => {
    if (data == null || typeof data !== 'object') return undefined;
    const raw = data.id ?? data.pk;
    if (raw === '' || raw === null || raw === undefined) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  };

  const handleSubmit = async () => {
    if (!formData.zonaOrigenId || !formData.zonaDestinoId || !formData.tipoServicioId) {
      Alert.alert('Error', 'Completa todos los campos obligatorios');
      return;
    }

    if (!formData.latitudOrigen || !formData.latitudDestino) {
      Alert.alert('Error', 'Debes seleccionar las ubicaciones en el mapa');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        fechaDeseada: formatDate(formData.fechaDeseada),
      };
      const cotizacion = await cotizacionService.crear(payload);
      const cotizacionId = extraerIdCotizacion(cotizacion);
      if (cotizacionId == null) {
        Alert.alert(
          'Error',
          'La cotización se creó pero el servidor no devolvió su identificador. Revisa el listado de cotizaciones.',
        );
        return;
      }
      navigation.navigate('Inventario', { cotizacionId });
      Alert.alert('Éxito', 'Cotización creada. Ya puedes registrar objetos.');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading fullScreen />;

  const minBottom =
    Platform.OS === 'android' ? Math.max(insets.bottom, 20) : Math.max(insets.bottom, 8);
  const footerBottomPad = minBottom + 10;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 16 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <Card variant="outlined" padding="lg">
        <Text style={styles.sectionTitle}>Origen</Text>

        <Text style={styles.label}>Zona de Origen *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.zonaOrigenId}
            onValueChange={(value) => handleChange('zonaOrigenId', value)}
          >
            <Picker.Item label="Selecciona una zona" value="" />
            {zonas.map((zona) => (
              <Picker.Item key={zona.id} label={zona.nombre} value={zona.id} />
            ))}
          </Picker>
        </View>

        <View style={styles.ubicacionField}>
          <Text style={styles.label}>Ubicación de Origen *</Text>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => setShowMapOrigen(true)}
          >
            <Text style={styles.mapButtonText}>
              {formData.latitudOrigen
                ? `📍 ${formData.direccionOrigen || 'Ubicación seleccionada'}`
                : '🗺️ Seleccionar en el mapa'}
            </Text>
          </TouchableOpacity>
          {formData.latitudOrigen && (
            <Text style={styles.coordsSmall}>
              {formData.latitudOrigen.toFixed(6)}, {formData.longitudOrigen.toFixed(6)}
            </Text>
          )}
        </View>
      </Card>

      <Card variant="outlined" padding="lg">
        <Text style={styles.sectionTitle}>Destino</Text>

        <Text style={styles.label}>Zona de Destino *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.zonaDestinoId}
            onValueChange={(value) => handleChange('zonaDestinoId', value)}
          >
            <Picker.Item label="Selecciona una zona" value="" />
            {zonas.map((zona) => (
              <Picker.Item key={zona.id} label={zona.nombre} value={zona.id} />
            ))}
          </Picker>
        </View>

        <View style={styles.ubicacionField}>
          <Text style={styles.label}>Ubicación de Destino *</Text>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => setShowMapDestino(true)}
          >
            <Text style={styles.mapButtonText}>
              {formData.latitudDestino
                ? `📍 ${formData.direccionDestino || 'Ubicación seleccionada'}`
                : '🗺️ Seleccionar en el mapa'}
            </Text>
          </TouchableOpacity>
          {formData.latitudDestino && (
            <Text style={styles.coordsSmall}>
              {formData.latitudDestino.toFixed(6)}, {formData.longitudDestino.toFixed(6)}
            </Text>
          )}
        </View>
      </Card>

      <Card variant="outlined" padding="lg">
        <Text style={styles.sectionTitle}>Fecha y Servicio</Text>

        <View style={styles.dateField}>
          <Text style={styles.label}>Fecha Deseada *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              📅 {formatDate(formData.fechaDeseada)}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={formData.fechaDeseada}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        <Input
          label="Descripción de lo que deseas trasladar"
          value={formData.descripcion}
          onChangeText={(value) => handleChange('descripcion', value)}
          placeholder="Ej: Mudanza completa de casa, muebles de sala, electrodomésticos..."
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Franja Horaria *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.franjaHoraria}
            onValueChange={(value) => handleChange('franjaHoraria', value)}
          >
            <Picker.Item label="Mañana (8-12h)" value="manana" />
            <Picker.Item label="Tarde (12-18h)" value="tarde" />
            <Picker.Item label="Noche (18-21h)" value="noche" />
          </Picker>
        </View>

        <Text style={styles.label}>Tipo de Servicio *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.tipoServicioId}
            onValueChange={(value) => handleChange('tipoServicioId', value)}
          >
            <Picker.Item label="Selecciona un tipo" value="" />
            {tiposServicio.map((tipo) => (
              <Picker.Item
                key={tipo.id}
                label={`${tipo.nombre} (${tipo.factor}x)`}
                value={tipo.id}
              />
            ))}
          </Picker>
        </View>
      </Card>
      </ScrollView>

      <View
        style={[
          styles.footerBar,
          {
            paddingBottom: footerBottomPad,
            paddingTop: 12,
          },
        ]}
      >
        <Button
          title="Continuar a Inventario"
          onPress={handleSubmit}
          fullWidth
          loading={submitting}
        />
      </View>

      <MapPicker
        visible={showMapOrigen}
        onClose={() => setShowMapOrigen(false)}
        onSelect={handleMapOrigenSelect}
        ubicacionInicial={{ latitud: formData.latitudOrigen || -17.7834, longitud: formData.longitudOrigen || -63.1821 }}
        titulo="Selecciona el origen"
      />

      <MapPicker
        visible={showMapDestino}
        onClose={() => setShowMapDestino(false)}
        onSelect={handleMapDestinoSelect}
        ubicacionInicial={{ latitud: formData.latitudDestino || -17.7834, longitud: formData.longitudDestino || -63.1821 }}
        titulo="Selecciona el destino"
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark,
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.light,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: COLORS.white,
  },
  ubicacionField: {
    marginBottom: 16,
  },
  mapButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    padding: 14,
    backgroundColor: COLORS.white,
  },
  mapButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  coordsSmall: {
    fontSize: 11,
    color: COLORS.dark,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  dateField: {
    marginBottom: 16,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: COLORS.light,
    borderRadius: 8,
    padding: 14,
    backgroundColor: COLORS.white,
  },
  dateButtonText: {
    color: COLORS.dark,
    fontSize: 14,
  },
  footerBar: {
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.light,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});

export default NuevaCotizacionScreen;
