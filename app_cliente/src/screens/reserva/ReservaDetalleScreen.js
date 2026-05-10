import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { Button, Card, Loading, Badge } from '../../components';
import { reservaService } from '../../services';
import { COLORS } from '../../constants/colors';
import { ESTADOS_RESERVA } from '../../constants/api';

const labelEstadoReserva = (estado) => {
  const m = {
    [ESTADOS_RESERVA.PENDIENTE]: 'Pendiente (depósito)',
    [ESTADOS_RESERVA.CONFIRMADA]: 'Confirmada',
    [ESTADOS_RESERVA.CANCELADA]: 'Cancelada',
    [ESTADOS_RESERVA.COMPLETADA]: 'Completada',
  };
  return m[estado] || estado || '—';
};

const labelEstadoPago = (estado) => {
  const m = { pendiente: 'Pendiente verificación', completado: 'Verificado', fallido: 'Rechazado' };
  return m[estado] || estado || '—';
};

const ReservaDetalleScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const [reserva, setReserva] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelando, setCancelando] = useState(false);
  const [facturaBusyId, setFacturaBusyId] = useState(null);

  const cargarDetalle = useCallback(async () => {
    try {
      setLoading(true);
      const data = await reservaService.getDetalle(id);
      setReserva(data);
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo cargar la reserva');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const cargarPagos = useCallback(async () => {
    try {
      const list = await reservaService.listarPagos(id);
      setPagos(Array.isArray(list) ? list : []);
    } catch {
      setPagos([]);
    }
  }, [id]);

  useEffect(() => {
    cargarDetalle();
    cargarPagos();
  }, [cargarDetalle, cargarPagos]);

  const cancelarReserva = () => {
    Alert.alert('Cancelar reserva', 'Se cancelará esta reserva.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Si, cancelar',
        style: 'destructive',
        onPress: async () => {
          try {
            setCancelando(true);
            await reservaService.cancelar(id, 'Cancelación solicitada desde app');
            await cargarDetalle();
          } catch (error) {
            Alert.alert('Error', error.message || 'No se pudo cancelar');
          } finally {
            setCancelando(false);
          }
        },
      },
    ]);
  };

  const abrirFactura = async (facturaId) => {
    try {
      setFacturaBusyId(facturaId);
      await reservaService.abrirFacturaPdf(facturaId);
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo obtener la factura');
    } finally {
      setFacturaBusyId(null);
    }
  };

  if (loading) return <Loading fullScreen message="Cargando detalle..." />;

  const estadoSeg = reserva?.estado_seguimiento || reserva?.estado;
  const depositoVerificado = pagos.some((p) => p.tipo_pago === 'deposito' && p.estado === 'completado');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card variant="elevated">
        <View style={styles.rowBetween}>
          <Text style={styles.title}>{reserva?.codigo_confirmacion || `RES-${id}`}</Text>
          <Badge label={labelEstadoReserva(reserva?.estado)} />
        </View>
        {reserva?.estado_seguimiento ? (
          <Text style={styles.subBadge}>Seguimiento servicio: {estadoSeg}</Text>
        ) : null}
        <Text style={styles.info}>
          {reserva?.zona_origen} → {reserva?.zona_destino}
        </Text>
        <Text style={styles.info}>
          Fecha:{' '}
          {reserva?.fecha_servicio
            ? new Date(reserva.fecha_servicio).toLocaleDateString()
            : 'Pendiente'}
        </Text>
        <Text style={styles.monto}>Bs {reserva?.precio_final || reserva?.precio_total || 0}</Text>
        {reserva?.monto_deposito_sugerido != null ? (
          <Text style={styles.deposito}>
            Depósito sugerido: Bs {reserva.monto_deposito_sugerido}
          </Text>
        ) : null}
      </Card>

      {pagos.length > 0 ? (
        <Card variant="outlined" style={styles.block}>
          <Text style={styles.blockTitle}>Pagos</Text>
          {pagos.map((p) => (
            <View key={p.id} style={styles.pagoRow}>
              <Text style={styles.pagoLine}>
                {p.tipo_pago} · Bs {p.monto} · {labelEstadoPago(p.estado)}
              </Text>
              {p.estado === 'completado' && p.factura_id ? (
                <Button
                  title="Factura PDF"
                  variant="outline"
                  onPress={() => abrirFactura(p.factura_id)}
                  loading={facturaBusyId === p.factura_id}
                  style={styles.facturaBtn}
                />
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}

      <Button title="Ver seguimiento en tiempo real" onPress={() => navigation.navigate('Seguimiento', { id })} fullWidth />
      {reserva?.estado === ESTADOS_RESERVA.PENDIENTE && (
        <Button
          title="Subir comprobante de pago"
          onPress={() => navigation.navigate('Pago', { reservaId: id })}
          variant="outline"
          fullWidth
          style={styles.btnSpace}
        />
      )}
      {reserva?.estado === ESTADOS_RESERVA.CONFIRMADA && depositoVerificado && (
        <Text style={styles.okText}>
          Reserva confirmada. Puedes descargar la factura del depósito arriba cuando el pago figure como verificado.
        </Text>
      )}
      <Button
        title="Confirmar entrega"
        onPress={() => navigation.navigate('ConfirmacionEntrega', { reservaId: id })}
        variant="outline"
        fullWidth
        style={styles.btnSpace}
      />
      {reserva?.estado !== ESTADOS_RESERVA.CANCELADA && reserva?.estado !== ESTADOS_RESERVA.COMPLETADA && (
        <Button
          title="Cancelar reserva"
          onPress={cancelarReserva}
          variant="danger"
          loading={cancelando}
          fullWidth
          style={styles.btnSpace}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  content: { padding: 16, paddingBottom: 32 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: COLORS.black },
  subBadge: { fontSize: 12, color: COLORS.dark, marginBottom: 6, opacity: 0.85 },
  info: { fontSize: 14, marginBottom: 6, color: COLORS.dark },
  monto: { fontSize: 20, fontWeight: '700', color: COLORS.primary, marginTop: 8 },
  deposito: { fontSize: 14, color: COLORS.primary, marginTop: 6, fontWeight: '600' },
  block: { marginTop: 12 },
  blockTitle: { fontSize: 15, fontWeight: '700', color: COLORS.black, marginBottom: 10 },
  pagoRow: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.light },
  pagoLine: { fontSize: 14, color: COLORS.dark, marginBottom: 8 },
  facturaBtn: { alignSelf: 'flex-start' },
  btnSpace: { marginTop: 12 },
  okText: { fontSize: 13, color: COLORS.dark, marginTop: 8, lineHeight: 19, fontStyle: 'italic' },
});

export default ReservaDetalleScreen;
