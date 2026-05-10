import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { Button, Input } from '../index';
import { COLORS } from '../../constants/colors';

/**
 * Componente para capturar ubicación con GPS y dirección manual
 *
 * Props:
 * - direccion: string - dirección actual
 * - latitud: number - latitud actual
 * - longitud: number - longitud actual
 * - onUbicacionChange: function - callback que recibe {direccion, latitud, longitud}
 * - label: string - etiqueta del campo
 * - placeholder: string - placeholder del input
 */
const UbicacionPicker = ({
  direccion = '',
  latitud = null,
  longitud = null,
  onUbicacionChange,
  label = 'Dirección',
  placeholder = 'Ingresa la dirección'
}) => {
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setLocationPermission(status === 'granted');
  };

  const requestPermissions = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status === 'granted');
    return status === 'granted';
  };

  const obtenerUbicacionActual = async () => {
    try {
      setLoading(true);

      // Verificar permisos
      if (!locationPermission) {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert(
            'Permisos requeridos',
            'Necesitamos acceso a tu ubicación para usar esta función.'
          );
          return;
        }
      }

      // Obtener ubicación
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      // Intentar obtener dirección mediante reverse geocoding
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        let direccionFormateada = '';
        if (address) {
          const partes = [
            address.street,
            address.streetNumber,
            address.district,
            address.city,
          ].filter(Boolean);
          direccionFormateada = partes.join(', ');
        }

        onUbicacionChange({
          direccion: direccionFormateada || direccion,
          latitud: latitude,
          longitud: longitude,
        });

        const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        Alert.alert('Ubicación capturada', 'GPS: ' + coords);
      } catch (geocodeError) {
        // Si falla el geocoding, solo usar las coordenadas
        const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        onUbicacionChange({
          direccion: direccion || coords,
          latitud: latitude,
          longitud: longitude,
        });
        Alert.alert('Ubicación capturada', 'Coordenadas guardadas. Completa la dirección manualmente.');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la ubicación: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDireccionChange = (text) => {
    onUbicacionChange({
      direccion: text,
      latitud,
      longitud,
    });
  };

  return (
    <View style={styles.container}>
      <Input
        label={label}
        value={direccion}
        onChangeText={handleDireccionChange}
        placeholder={placeholder}
        multiline
      />

      <TouchableOpacity
        style={[styles.gpsButton, loading && styles.gpsButtonDisabled]}
        onPress={obtenerUbicacionActual}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.gpsButtonText}>📍 Usar mi ubicación actual</Text>
        )}
      </TouchableOpacity>

      {latitud && longitud && (
        <View style={styles.coordsInfo}>
          <Text style={styles.coordsLabel}>Coordenadas GPS:</Text>
          <Text style={styles.coordsText}>
            Lat: {latitud.toFixed(6)}, Lng: {longitud.toFixed(6)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  gpsButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  gpsButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  gpsButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  coordsInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: COLORS.lightGreen,
    borderRadius: 6,
  },
  coordsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.dark,
    marginBottom: 2,
  },
  coordsText: {
    fontSize: 11,
    color: COLORS.dark,
    fontFamily: 'monospace',
  },
});

export default UbicacionPicker;
