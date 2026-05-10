import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  FlatList,
  Platform,
  Switch,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Loading, Card } from '../../components';
import { cotizacionService } from '../../services';
import { COLORS } from '../../constants/colors';

const InventarioScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { cotizacionId } = route.params;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [objetos, setObjetos] = useState([]);
  const [solicitaEmbalaje, setSolicitaEmbalaje] = useState(false);

  const [objetoActual, setObjetoActual] = useState({
    categoriaId: '',
    nombre: '',
    largo: '',
    ancho: '',
    alto: '',
    peso: '',
    fragilidad: 'baja',
    foto: null,
  });

  useEffect(() => {
    if (!cotizacionId) {
      setLoading(false);
      Alert.alert('Error', 'Falta el identificador de la cotización', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      return;
    }
    cargarDatos();
  }, [cotizacionId]);

  const cargarDatos = async () => {
    try {
      const [cats, objs, detalle] = await Promise.all([
        cotizacionService.getCategorias(),
        cotizacionService.listarObjetos(cotizacionId),
        cotizacionService.getDetalle(cotizacionId),
      ]);
      setCategorias(cats);
      setObjetos(objs);
      if (detalle && typeof detalle.solicita_embalaje === 'boolean') {
        setSolicitaEmbalaje(detalle.solicita_embalaje);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setObjetoActual({ ...objetoActual, [field]: value });
  };

  const tomarFoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setObjetoActual({
          ...objetoActual,
          foto: {
            uri: result.assets[0].uri,
            type: 'image/jpeg',
            fileName: `objeto_${Date.now()}.jpg`,
          },
        });
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const seleccionarFoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setObjetoActual({
          ...objetoActual,
          foto: {
            uri: result.assets[0].uri,
            type: 'image/jpeg',
            fileName: `objeto_${Date.now()}.jpg`,
          },
        });
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la foto');
    }
  };

  const agregarObjeto = async () => {
    if (!objetoActual.categoriaId || !objetoActual.nombre) {
      Alert.alert('Error', 'Completa al menos la categoría y el nombre');
      return;
    }

    try {
      setSubmitting(true);
      const nuevoObjeto = await cotizacionService.agregarObjeto(cotizacionId, objetoActual);

      setObjetos([...objetos, nuevoObjeto]);

      // Limpiar formulario
      setObjetoActual({
        categoriaId: '',
        nombre: '',
        largo: '',
        ancho: '',
        alto: '',
        peso: '',
        fragilidad: 'baja',
        foto: null,
      });

      Alert.alert('Éxito', 'Objeto agregado. La IA clasificó el nivel de riesgo.');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const calcularPrecio = async () => {
    if (objetos.length === 0) {
      Alert.alert('Error', 'Debes agregar al menos un objeto');
      return;
    }

    try {
      setSubmitting(true);
      const res = await cotizacionService.calcularPrecio(cotizacionId, {
        solicitaEmbalaje,
      });
      let mensaje = 'Precio calculado con IA.';
      if (res?.recargo_embalaje > 0) {
        mensaje += ` Incluye embalaje estimado: Bs ${Number(res.recargo_embalaje).toFixed(2)}.`;
      }
      Alert.alert('Éxito', mensaje, [
        {
          text: 'Ver Cotización',
          onPress: () => navigation.navigate('CotizacionDetalle', { id: cotizacionId }),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderObjeto = ({ item }) => {
    const riesgoColors = {
      bajo: COLORS.success,
      medio: COLORS.warning,
      alto: COLORS.danger,
    };

    return (
      <Card variant="outlined" padding="md" marginBottom={12}>
        <View style={styles.objetoItem}>
          {item.foto_url && (
            <Image source={{ uri: item.foto_url }} style={styles.objetoFoto} />
          )}
          <View style={styles.objetoInfo}>
            <Text style={styles.objetoNombre}>{item.nombre}</Text>
            <Text style={styles.objetoDetalles}>
              {item.largo ?? item.largo_cm} x {item.ancho ?? item.ancho_cm} x {item.alto ?? item.alto_cm} cm,{' '}
              {item.peso ?? item.peso_kg} kg
            </Text>
            <View style={[styles.riesgoBadge, { backgroundColor: riesgoColors[item.rf_nivel_riesgo] || COLORS.gray }]}>
              <Text style={styles.riesgoTexto}>
                Riesgo: {item.rf_nivel_riesgo || 'N/A'}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  if (loading) return <Loading fullScreen />;

  const minBottom =
    Platform.OS === 'android' ? Math.max(insets.bottom, 20) : Math.max(insets.bottom, 8);
  const footerBottomPad = minBottom + 10;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <Card variant="filled" padding="lg">
        <Text style={styles.title}>Registrar Objetos</Text>
        <Text style={styles.subtitle}>
          Fotografía cada objeto. La IA analizará el riesgo de daño.
        </Text>
      </Card>

      <Card variant="outlined" padding="lg">
        <Text style={styles.sectionTitle}>Nuevo Objeto</Text>

        <Text style={styles.label}>Categoría *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={objetoActual.categoriaId}
            onValueChange={(value) => handleChange('categoriaId', value)}
          >
            <Picker.Item label="Selecciona una categoría" value="" />
            {categorias.map((cat) => (
              <Picker.Item key={cat.id} label={cat.nombre} value={cat.id} />
            ))}
          </Picker>
        </View>

        <Input
          label="Nombre del Objeto *"
          value={objetoActual.nombre}
          onChangeText={(value) => handleChange('nombre', value)}
          placeholder="Ej: Sofá 3 cuerpos"
        />

        <View style={styles.dimensionesRow}>
          <View style={styles.dimensionInput}>
            <Input
              label="Largo (cm)"
              value={objetoActual.largo}
              onChangeText={(value) => handleChange('largo', value)}
              keyboardType="numeric"
              placeholder="200"
            />
          </View>
          <View style={styles.dimensionInput}>
            <Input
              label="Ancho (cm)"
              value={objetoActual.ancho}
              onChangeText={(value) => handleChange('ancho', value)}
              keyboardType="numeric"
              placeholder="90"
            />
          </View>
          <View style={styles.dimensionInput}>
            <Input
              label="Alto (cm)"
              value={objetoActual.alto}
              onChangeText={(value) => handleChange('alto', value)}
              keyboardType="numeric"
              placeholder="85"
            />
          </View>
        </View>

        <Input
          label="Peso (kg)"
          value={objetoActual.peso}
          onChangeText={(value) => handleChange('peso', value)}
          keyboardType="numeric"
          placeholder="45"
        />

        <Text style={styles.label}>Fragilidad</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={objetoActual.fragilidad}
            onValueChange={(value) => handleChange('fragilidad', value)}
          >
            <Picker.Item label="Baja" value="baja" />
            <Picker.Item label="Media" value="media" />
            <Picker.Item label="Alta" value="alta" />
          </Picker>
        </View>

        <View style={styles.fotoSection}>
          {objetoActual.foto && (
            <Image source={{ uri: objetoActual.foto.uri }} style={styles.fotoPreview} />
          )}
          <View style={styles.fotoButtons}>
            <Button
              title="📷 Tomar Foto"
              onPress={tomarFoto}
              variant="secondary"
              style={styles.fotoButton}
            />
            <Button
              title="🖼️ Galería"
              onPress={seleccionarFoto}
              variant="secondary"
              style={styles.fotoButton}
            />
          </View>
        </View>

        <Button
          title="Agregar Objeto"
          onPress={agregarObjeto}
          loading={submitting}
          fullWidth
        />
      </Card>

      {objetos.length > 0 && (
        <Card variant="outlined" padding="lg">
          <Text style={styles.sectionTitle}>Objetos Registrados ({objetos.length})</Text>
          <FlatList
            data={objetos}
            renderItem={renderObjeto}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        </Card>
      )}
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
        <View style={styles.embalajeRow}>
          <View style={styles.embalajeTextWrap}>
            <Text style={styles.embalajeLabel}>Solicito embalaje / refuerzo</Text>
            <Text style={styles.embalajeHint}>
              Se suma al presupuesto por objeto y la predicción de precio lo considera.
            </Text>
          </View>
          <Switch
            value={solicitaEmbalaje}
            onValueChange={setSolicitaEmbalaje}
            trackColor={{ false: COLORS.light, true: COLORS.primary }}
            thumbColor={Platform.OS === 'android' ? COLORS.white : undefined}
          />
        </View>
        <Button
          title={`Calcular Precio (${objetos.length} objetos)`}
          onPress={calcularPrecio}
          fullWidth
          disabled={objetos.length === 0}
          loading={submitting}
        />
      </View>
    </View>
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
    paddingBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.dark,
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
  dimensionesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dimensionInput: {
    flex: 1,
  },
  fotoSection: {
    marginBottom: 16,
  },
  fotoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: COLORS.light,
  },
  fotoButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  fotoButton: {
    flex: 1,
  },
  objetoItem: {
    flexDirection: 'row',
    gap: 12,
  },
  objetoFoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.light,
  },
  objetoInfo: {
    flex: 1,
  },
  objetoNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  objetoDetalles: {
    fontSize: 12,
    color: COLORS.dark,
    marginBottom: 6,
  },
  riesgoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  riesgoTexto: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    textTransform: 'uppercase',
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
  embalajeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingVertical: 4,
  },
  embalajeTextWrap: {
    flex: 1,
  },
  embalajeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  embalajeHint: {
    fontSize: 12,
    color: COLORS.dark,
    lineHeight: 16,
  },
});

export default InventarioScreen;
