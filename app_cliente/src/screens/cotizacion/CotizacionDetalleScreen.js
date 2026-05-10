import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { Button, Card, Loading, Badge } from '../../components';
import { cotizacionService } from '../../services';
import { COLORS } from '../../constants/colors';
import { ESTADOS_COTIZACION } from '../../constants/api';
import {
  formatBs,
  formatFechaCotizacion,
  formatFechaHora,
  getEstadoCotizacionMeta,
  labelFranjaHoraria,
  textoRutaCotizacion,
} from '../../utils/cotizacionDisplay';

const Row = ({ label, value, last }) => (
  <View style={[styles.row, last && styles.rowLast]}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value ?? '—'}</Text>
  </View>
);

const CotizacionDetalleScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const [cotizacion, setCotizacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const cargarDetalle = async () => {
    try {
      setLoading(true);
      const data = await cotizacionService.getDetalle(id);
      setCotizacion(data);
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo cargar la cotización');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDetalle();
  }, [id]);

  const aceptarCotizacion = async () => {
    try {
      setProcesando(true);
      const payload = await cotizacionService.aceptar(id);
      const reservaId = payload?.reserva?.id;
      Alert.alert('Cotización aceptada', 'Tu reserva fue creada correctamente', [
        {
          text: 'Ver reserva',
          onPress: () => navigation.navigate('ReservaDetalle', { id: reservaId }),
        },
      ]);
      if (payload?.cotizacion) setCotizacion(payload.cotizacion);
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo aceptar la cotización');
    } finally {
      setProcesando(false);
    }
  };

  const calcularPrecio = async () => {
    try {
      setProcesando(true);
      await cotizacionService.calcularPrecio(id, {
        solicitaEmbalaje: Boolean(cotizacion?.solicita_embalaje),
      });
      await cargarDetalle();
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo calcular el precio');
    } finally {
      setProcesando(false);
    }
  };

  if (loading) return <Loading fullScreen message="Cargando cotización..." />;

  const estadoMeta = getEstadoCotizacionMeta(cotizacion?.estado);
  const fechaStr = formatFechaCotizacion(cotizacion?.fecha_deseada);
  const totalStr = formatBs(cotizacion?.precio_total_calculado ?? cotizacion?.precio_total);
  const baseStr = formatBs(cotizacion?.precio_base);
  const extraStr = formatBs(cotizacion?.precio_servicios_extra);
  const iaStr = formatBs(cotizacion?.rf_precio_predicho);
  const servicios = Array.isArray(cotizacion?.servicios_adicionales)
    ? cotizacion.servicios_adicionales
    : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card variant="elevated">
        <View style={styles.headerRow}>
          <Text style={styles.title}>COT-{id}</Text>
          <Badge label={estadoMeta.label} variant={estadoMeta.variant} />
        </View>
        <Text style={styles.subtitle}>{textoRutaCotizacion(cotizacion || {})}</Text>
        {cotizacion?.creado_en ? (
          <Text style={styles.muted}>Creada: {formatFechaHora(cotizacion.creado_en)}</Text>
        ) : null}
      </Card>

      <Card variant="outlined" style={styles.block}>
        <Text style={styles.sectionTitle}>Origen y destino</Text>
        <Row label="Origen" value={cotizacion?.direccion_origen} />
        <Row label="Zona origen" value={cotizacion?.zona_origen_nombre} />
        <Row label="Destino" value={cotizacion?.direccion_destino} />
        <Row label="Zona destino" value={cotizacion?.zona_destino_nombre} last />
      </Card>

      <Card variant="outlined" style={styles.block}>
        <Text style={styles.sectionTitle}>Servicio y fecha</Text>
        <Row label="Tipo de servicio" value={cotizacion?.tipo_servicio_nombre} />
        <Row
          label="Fecha deseada"
          value={fechaStr || 'Sin definir'}
        />
        <Row
          label="Franja horaria"
          value={labelFranjaHoraria(cotizacion?.franja_horaria) || '—'}
        />
        <Row
          label="Embalaje / refuerzo"
          value={cotizacion?.solicita_embalaje ? 'Sí' : 'No'}
          last
        />
      </Card>

      {(cotizacion?.cantidad_objetos > 0 ||
        (cotizacion?.peso_total_kg != null && Number(cotizacion.peso_total_kg) > 0)) && (
        <Card variant="outlined" style={styles.block}>
          <Text style={styles.sectionTitle}>Carga</Text>
          <Row
            label="Objetos"
            value={
              cotizacion.cantidad_objetos != null
                ? String(cotizacion.cantidad_objetos)
                : '—'
            }
          />
          <Row
            label="Peso total"
            value={
              cotizacion.peso_total_kg != null && Number(cotizacion.peso_total_kg) > 0
                ? `${Number(cotizacion.peso_total_kg).toLocaleString('es-BO')} kg`
                : '—'
            }
          />
          <Row
            label="Volumen"
            value={
              cotizacion.volumen_total_m3 != null && Number(cotizacion.volumen_total_m3) > 0
                ? `${Number(cotizacion.volumen_total_m3).toLocaleString('es-BO')} m³`
                : '—'
            }
            last
          />
        </Card>
      )}

      {cotizacion?.descripcion ? (
        <Card variant="outlined" style={styles.block}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.descripcion}>{cotizacion.descripcion}</Text>
        </Card>
      ) : null}

      <Card variant="outlined" style={styles.block}>
        <Text style={styles.sectionTitle}>Precios</Text>
        <Row label="Precio base" value={baseStr != null ? `Bs ${baseStr}` : '—'} />
        <Row
          label="Servicios extra"
          value={extraStr != null ? `Bs ${extraStr}` : 'Bs 0,00'}
        />
        <Row label="Total calculado" value={totalStr != null ? `Bs ${totalStr}` : '—'} />
        {iaStr != null ? (
          <Row label="Referencia IA" value={`Bs ${iaStr}`} last />
        ) : (
          <Row label="Referencia IA" value="—" last />
        )}
      </Card>

      {cotizacion?.valida_hasta ? (
        <Card variant="outlined" style={styles.block}>
          <Text style={styles.sectionTitle}>Validez</Text>
          <Text style={styles.info}>
            Válida hasta: {formatFechaHora(cotizacion.valida_hasta)}
          </Text>
        </Card>
      ) : null}

      {servicios.length > 0 ? (
        <Card variant="outlined" style={styles.block}>
          <Text style={styles.sectionTitle}>Servicios adicionales</Text>
          {servicios.map((s) => (
            <View key={s.id} style={styles.servicioItem}>
              <Text style={styles.servicioNombre}>
                {s.servicio_nombre || `Servicio #${s.servicio_adicional}`}
              </Text>
              <Text style={styles.servicioDetalle}>
                Cant. {s.cantidad ?? 1} · Bs {formatBs(s.precio_total) ?? '0,00'}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Button
        title="Recalcular precio"
        onPress={calcularPrecio}
        variant="outline"
        loading={procesando}
        fullWidth
      />

      {cotizacion?.estado === ESTADOS_COTIZACION.ENVIADA && (
        <Button
          title="Aceptar cotización"
          onPress={aceptarCotizacion}
          loading={procesando}
          fullWidth
          style={styles.space}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.black },
  subtitle: { fontSize: 15, color: COLORS.dark, marginBottom: 6 },
  muted: { fontSize: 12, color: COLORS.dark, opacity: 0.7 },
  block: { marginTop: 12 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 10,
  },
  row: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.light,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 12, color: COLORS.dark, opacity: 0.85, marginBottom: 4 },
  rowValue: { fontSize: 15, color: COLORS.black },
  descripcion: { fontSize: 14, color: COLORS.dark, lineHeight: 20 },
  info: { fontSize: 14, color: COLORS.dark },
  servicioItem: { marginBottom: 10 },
  servicioNombre: { fontSize: 14, fontWeight: '600', color: COLORS.black },
  servicioDetalle: { fontSize: 13, color: COLORS.dark, marginTop: 2 },
  space: { marginTop: 12 },
});

export default CotizacionDetalleScreen;
