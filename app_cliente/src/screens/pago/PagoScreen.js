import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, Input, Loading } from '../../components';
import { reservaService } from '../../services';
import { COLORS } from '../../constants/colors';
import {
  ESTADOS_RESERVA,
  METODOS_PAGO,
  TIPOS_PAGO,
} from '../../constants/api';

const METODOS_TRANSFERENCIA = [
  { value: METODOS_PAGO.TRANSFERENCIA_BCP, label: 'Transferencia BCP' },
  { value: METODOS_PAGO.TRANSFERENCIA_BNB, label: 'Transferencia BNB' },
  { value: METODOS_PAGO.TRANSFERENCIA_MERCANTIL, label: 'Transferencia Mercantil' },
  { value: METODOS_PAGO.QR, label: 'Código QR' },
  { value: METODOS_PAGO.EFECTIVO, label: 'Efectivo (oficina)' },
];

const requiereComprobante = (metodo) =>
  metodo &&
  metodo !== METODOS_PAGO.EFECTIVO;

const labelEstadoPago = (estado) => {
  const m = {
    pendiente: 'Pendiente de verificación',
    completado: 'Completado',
    fallido: 'Rechazado',
  };
  return m[estado] || estado || '—';
};

const PagoScreen = ({ route, navigation }) => {
  const reservaId = route.params?.reservaId;

  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [reserva, setReserva] = useState(null);
  const [pagosPrevios, setPagosPrevios] = useState([]);

  const [metodo, setMetodo] = useState(METODOS_PAGO.TRANSFERENCIA_BCP);
  const [monto, setMonto] = useState('');
  const [referencia, setReferencia] = useState('');
  const [comprobante, setComprobante] = useState(null);

  const cargar = useCallback(async () => {
    if (!reservaId) return;
    try {
      setLoading(true);
      const [detalle, pagos] = await Promise.all([
        reservaService.getDetalle(reservaId),
        reservaService.listarPagos(reservaId),
      ]);
      setReserva(detalle);
      setPagosPrevios(Array.isArray(pagos) ? pagos : []);
      const sugerido = detalle?.monto_deposito_sugerido;
      if (sugerido != null && String(sugerido).trim() !== '') {
        setMonto(String(sugerido));
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo cargar la reserva');
    } finally {
      setLoading(false);
    }
  }, [reservaId]);

  useEffect(() => {
    if (!reservaId) {
      Alert.alert('Error', 'Falta el identificador de la reserva', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      return;
    }
    cargar();
  }, [reservaId, cargar, navigation]);

  const asignarImagen = (asset) => {
    if (!asset?.uri) return;
    setComprobante({
      uri: asset.uri,
      type: asset.mimeType || 'image/jpeg',
      fileName:
        asset.fileName ||
        `comprobante_${Date.now()}.${(asset.mimeType || '').includes('png') ? 'png' : 'jpg'}`,
    });
  };

  const tomarFoto = async () => {
    try {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para el comprobante.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.75,
      });
      if (!result.canceled && result.assets?.[0]) {
        asignarImagen(result.assets[0]);
      }
    } catch {
      Alert.alert('Error', 'No se pudo abrir la cámara');
    }
  };

  const elegirGaleria = async () => {
    try {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.75,
      });
      if (!result.canceled && result.assets?.[0]) {
        asignarImagen(result.assets[0]);
      }
    } catch {
      Alert.alert('Error', 'No se pudo abrir la galería');
    }
  };

  const enviarComprobante = async () => {
    const montoNum = String(monto || '').replace(',', '.').trim();
    if (!montoNum || Number.isNaN(Number(montoNum)) || Number(montoNum) <= 0) {
      Alert.alert('Monto inválido', 'Indica el monto pagado (ej. el depósito acordado).');
      return;
    }
    if (requiereComprobante(metodo) && !comprobante) {
      Alert.alert(
        'Comprobante requerido',
        'Para transferencias y QR debes adjuntar una foto del comprobante (como en el flujo operativo).'
      );
      return;
    }

    try {
      setEnviando(true);
      await reservaService.registrarPago(reservaId, {
        tipo: TIPOS_PAGO.DEPOSITO,
        monto: montoNum,
        metodo,
        comprobante: requiereComprobante(metodo) ? comprobante : null,
        referencia: referencia.trim() || undefined,
      });
      Alert.alert(
        'Comprobante enviado',
        'Tu pago quedó registrado como pendiente de verificación. Te avisaremos cuando el operador lo confirme.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo registrar el pago');
    } finally {
      setEnviando(false);
    }
  };

  if (!reservaId) {
    return null;
  }

  if (loading) {
    return <Loading fullScreen message="Cargando datos de pago..." />;
  }

  const pendienteDeposito = reserva?.estado === ESTADOS_RESERVA.PENDIENTE;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card variant="elevated">
        <Text style={styles.title}>Depósito para confirmar reserva</Text>
        <Text style={styles.body}>
          Realiza la transferencia desde tu banca móvil y luego sube una foto del comprobante. El
          operador verificará el monto y la referencia antes de confirmar tu reserva.
        </Text>
        {reserva?.codigo_confirmacion ? (
          <Text style={styles.codigo}>Código: {reserva.codigo_confirmacion}</Text>
        ) : null}
        <Text style={styles.bodyMuted}>
          Precio del servicio (referencia): Bs {reserva?.precio_final || reserva?.precio_total || '—'}
        </Text>
        {reserva?.monto_deposito_sugerido != null ? (
          <Text style={styles.destacado}>
            Depósito sugerido: Bs {reserva.monto_deposito_sugerido}
          </Text>
        ) : null}
      </Card>

      <Card variant="outlined" style={styles.block}>
        <Text style={styles.section}>Datos para transferencia</Text>
        <Text style={styles.bankLine}>Banco BCP — Cuenta N° 1234567890</Text>
        <Text style={styles.bankLine}>A nombre de: Mudanzas CRM S.R.L.</Text>
        <Text style={styles.nota}>
          (Ajusta estos datos en producción según tus cuentas reales; el flujo operativo usa este
          ejemplo.)
        </Text>
      </Card>

      {!pendienteDeposito ? (
        <Card variant="outlined" style={styles.block}>
          <Text style={styles.aviso}>
            Esta reserva ya no está en estado &quot;pendiente&quot;. Si necesitas registrar otro
            pago (saldo), consulta con soporte o usa el portal.
          </Text>
        </Card>
      ) : null}

      {pagosPrevios.length > 0 ? (
        <Card variant="outlined" style={styles.block}>
          <Text style={styles.section}>Pagos registrados</Text>
          {pagosPrevios.map((p) => (
            <View key={p.id} style={styles.pagoRow}>
              <Text style={styles.pagoLine}>
                Bs {p.monto} · {p.metodo_nombre || p.metodo_pago || '—'}
              </Text>
              <Text style={styles.pagoEstado}>{labelEstadoPago(p.estado)}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Card variant="outlined" style={styles.block}>
        <Text style={styles.section}>Registrar comprobante</Text>

        <Text style={styles.label}>Método</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={metodo}
            onValueChange={setMetodo}
            style={Platform.OS === 'ios' ? styles.pickerIos : styles.picker}
          >
            {METODOS_TRANSFERENCIA.map((m) => (
              <Picker.Item key={m.value} label={m.label} value={m.value} />
            ))}
          </Picker>
        </View>

        <Input
          label="Monto pagado (Bs)"
          value={monto}
          onChangeText={setMonto}
          keyboardType="decimal-pad"
          placeholder="Ej. 145.00"
        />

        <Input
          label="N° referencia (opcional)"
          value={referencia}
          onChangeText={setReferencia}
          placeholder="Referencia del banco"
        />

        <Text style={styles.label}>Comprobante</Text>
        {comprobante?.uri ? (
          <Image source={{ uri: comprobante.uri }} style={styles.preview} resizeMode="contain" />
        ) : (
          <Text style={styles.bodyMuted}>
            {requiereComprobante(metodo)
              ? 'Toma una foto o elige una imagen de la galería.'
              : 'Para efectivo en oficina el comprobante es opcional.'}
          </Text>
        )}

        <View style={styles.rowBtns}>
          <Button title="Cámara" onPress={tomarFoto} variant="outline" style={styles.btnHalf} />
          <Button
            title="Galería"
            onPress={elegirGaleria}
            variant="outline"
            style={styles.btnHalf}
          />
        </View>
        {comprobante ? (
          <Button
            title="Quitar imagen"
            onPress={() => setComprobante(null)}
            variant="outline"
            fullWidth
            style={styles.quitar}
          />
        ) : null}
      </Card>

      <Button
        title="Subir comprobante de pago"
        onPress={enviarComprobante}
        loading={enviando}
        fullWidth
        disabled={!pendienteDeposito}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.black, marginBottom: 8 },
  section: { fontSize: 15, fontWeight: '700', color: COLORS.black, marginBottom: 10 },
  body: { fontSize: 14, color: COLORS.dark, lineHeight: 21, marginBottom: 8 },
  bodyMuted: { fontSize: 13, color: COLORS.dark, opacity: 0.85, lineHeight: 19 },
  codigo: { fontSize: 15, fontWeight: '600', color: COLORS.primary, marginBottom: 6 },
  destacado: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
  block: { marginTop: 12 },
  bankLine: { fontSize: 14, color: COLORS.black, marginBottom: 4 },
  nota: { fontSize: 12, color: COLORS.dark, opacity: 0.75, marginTop: 8, fontStyle: 'italic' },
  aviso: { fontSize: 14, color: COLORS.dark, lineHeight: 20 },
  pagoRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.light,
  },
  pagoLine: { fontSize: 14, color: COLORS.black },
  pagoEstado: { fontSize: 12, color: COLORS.dark, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 6, marginTop: 8 },
  pickerWrap: {
    borderWidth: 1,
    borderColor: COLORS.light,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  picker: { height: 48 },
  pickerIos: { height: 180 },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    backgroundColor: COLORS.light,
    marginBottom: 12,
  },
  rowBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnHalf: { flex: 1 },
  quitar: { marginTop: 8 },
});

export default PagoScreen;
