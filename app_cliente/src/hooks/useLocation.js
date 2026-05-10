import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

/**
 * Hook para obtener la ubicación actual del dispositivo
 */
export const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);

  // Solicitar permisos de ubicación
  const requestPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      return status === 'granted';
    } catch (err) {
      setError('Error al solicitar permisos de ubicación');
      return false;
    }
  };

  // Obtener ubicación actual
  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verificar permisos
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        throw new Error('Permisos de ubicación denegados');
      }

      // Obtener ubicación
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation(currentLocation);
      return currentLocation;
    } catch (err) {
      setError(err.message || 'Error al obtener ubicación');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Observar ubicación en tiempo real
  const watchLocation = async (callback) => {
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        throw new Error('Permisos de ubicación denegados');
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Actualizar cada 10 metros
          timeInterval: 5000, // Actualizar cada 5 segundos
        },
        (newLocation) => {
          setLocation(newLocation);
          if (callback) callback(newLocation);
        }
      );

      return subscription;
    } catch (err) {
      setError(err.message || 'Error al observar ubicación');
      throw err;
    }
  };

  // Obtener dirección a partir de coordenadas (geocoding inverso)
  const getAddressFromCoords = async (latitude, longitude) => {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        return `${address.street || ''} ${address.streetNumber || ''}, ${address.city || ''}, ${address.region || ''}`.trim();
      }

      return null;
    } catch (err) {
      console.error('Error en geocoding inverso:', err);
      return null;
    }
  };

  // Obtener coordenadas a partir de dirección (geocoding)
  const getCoordsFromAddress = async (address) => {
    try {
      const locations = await Location.geocodeAsync(address);
      if (locations && locations.length > 0) {
        return locations[0];
      }
      return null;
    } catch (err) {
      console.error('Error en geocoding:', err);
      return null;
    }
  };

  useEffect(() => {
    // Verificar permisos al montar
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);
    })();
  }, []);

  return {
    location,
    loading,
    error,
    permissionStatus,
    requestPermission,
    getCurrentLocation,
    watchLocation,
    getAddressFromCoords,
    getCoordsFromAddress,
  };
};

export default useLocation;
