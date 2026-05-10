import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input } from '../index';
import { COLORS } from '../../constants/colors';

const DEFAULT_LAT = -17.7834;
const DEFAULT_LNG = -63.1821;

function sanitizeCoord(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * HTML embebido: Leaflet + teselas OSM (sin API key de Google).
 * User-Agent identificable para política de uso de tiles OSM.
 */
function buildOsmMapHtml(lat, lng, zoom) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <style>
    html, body { height: 100%; margin: 0; padding: 0; }
    #map { height: 100%; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <script>
    (function () {
      var lat = ${lat};
      var lng = ${lng};
      var zoom = ${zoom};
      var map = L.map('map', { zoomControl: true }).setView([lat, lng], zoom);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
      setTimeout(function () { map.invalidateSize(); }, 300);
      var marker = null;
      function send(lat, lng) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'tap', lat: lat, lng: lng }));
        }
      }
      map.on('click', function (e) {
        if (marker) { map.removeLayer(marker); }
        marker = L.marker(e.latlng).addTo(map);
        send(e.latlng.lat, e.latlng.lng);
      });
    })();
  </script>
</body>
</html>`;
}

/**
 * Selector de ubicación con mapa OpenStreetMap (Leaflet en WebView).
 *
 * react-native-maps + PROVIDER_DEFAULT suele mostrar mapa vacío en Android/Expo
 * sin clave de Google Maps; esta solución muestra OSM sin configuración extra.
 */
const MapPicker = ({
  visible = false,
  onClose,
  onSelect,
  ubicacionInicial = { latitud: DEFAULT_LAT, longitud: DEFAULT_LNG },
  titulo = 'Selecciona la ubicación',
}) => {
  const insets = useSafeAreaInsets();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [direccion, setDireccion] = useState('');
  const [mapReady, setMapReady] = useState(false);

  const lat0 = sanitizeCoord(ubicacionInicial?.latitud, DEFAULT_LAT);
  const lng0 = sanitizeCoord(ubicacionInicial?.longitud, DEFAULT_LNG);

  const htmlSource = useMemo(() => buildOsmMapHtml(lat0, lng0, 13), [lat0, lng0]);

  useEffect(() => {
    if (visible) {
      setSelectedLocation(null);
      setDireccion('');
      setMapReady(false);
    }
  }, [visible, lat0, lng0]);

  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'tap' && Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
        setSelectedLocation({ latitude: data.lat, longitude: data.lng });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleConfirmar = () => {
    if (selectedLocation) {
      const lat = selectedLocation.latitude.toFixed(6);
      const lng = selectedLocation.longitude.toFixed(6);
      onSelect({
        latitud: selectedLocation.latitude,
        longitud: selectedLocation.longitude,
        direccion: direccion || `${lat}, ${lng}`,
      });
      onClose();
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {titulo}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={12}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mapWrap}>
          <WebView
            key={`osm-${lat0}-${lng0}-${visible}`}
            originWhitelist={['*']}
            source={{ html: htmlSource, baseUrl: 'https://localhost' }}
            style={styles.webview}
            onLoadEnd={() => setMapReady(true)}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            mixedContentMode="compatibility"
            setSupportMultipleWindows={false}
            applicationNameForUserAgent={`MudanzasCRMCliente/1.0 (${Platform.OS})`}
            renderLoading={() => (
              <View style={styles.loader}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loaderText}>Cargando mapa…</Text>
              </View>
            )}
          />
          {!mapReady && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          {selectedLocation ? (
            <>
              <Text style={styles.coordsText}>
                📍 {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
              </Text>
              <Input
                label="Dirección (opcional)"
                value={direccion}
                onChangeText={setDireccion}
                placeholder="Ej: Av. San Martín #456, Equipetrol"
                multiline
              />
            </>
          ) : (
            <Text style={styles.instructionText}>
              Toca el mapa para colocar el pin (OpenStreetMap)
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <Button title="Cancelar" onPress={onClose} variant="secondary" style={styles.button} />
          <Button
            title="Confirmar Ubicación"
            onPress={handleConfirmar}
            disabled={!selectedLocation}
            style={styles.button}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
    paddingRight: 8,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 24,
    color: COLORS.dark,
  },
  mapWrap: {
    flex: 1,
    minHeight: 280,
    backgroundColor: '#e8e8e8',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  loaderText: {
    marginTop: 8,
    color: COLORS.dark,
    fontSize: 14,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  infoContainer: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.light,
  },
  coordsText: {
    fontSize: 14,
    color: COLORS.dark,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.dark,
    textAlign: 'center',
    paddingVertical: 8,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.light,
  },
  button: {
    flex: 1,
  },
});

export default MapPicker;
