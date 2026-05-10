import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import httpClient from './httpClient';
import {
  API_ORIGIN,
  APP_API_PREFIX,
  RESERVA_ENDPOINTS,
  PAGO_ENDPOINTS,
  INCIDENCIA_ENDPOINTS,
} from '../constants/api';

class ReservaService {
  // Listar mis reservas
  async listar(filtros = {}) {
    try {
      const response = await httpClient.get(RESERVA_ENDPOINTS.BASE, {
        params: filtros,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Obtener detalle de reserva
  async getDetalle(id) {
    try {
      const response = await httpClient.get(RESERVA_ENDPOINTS.DETALLE(id));
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Obtener seguimiento en tiempo real
  async getSeguimiento(id) {
    try {
      const response = await httpClient.get(RESERVA_ENDPOINTS.SEGUIMIENTO(id));
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Cancelar reserva
  async cancelar(id, motivo) {
    try {
      const response = await httpClient.post(RESERVA_ENDPOINTS.CANCELAR(id), {
        motivo_cancelacion: motivo,
        motivo,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // --- PAGOS ---

  // Registrar pago (subir comprobante)
  async registrarPago(reservaId, pago) {
    try {
      const formData = new FormData();
      formData.append('tipo', pago.tipo);
      formData.append('monto', pago.monto);
      formData.append('metodo', pago.metodo);

      if (pago.comprobante) {
        formData.append('comprobante', {
          uri: pago.comprobante.uri,
          type: pago.comprobante.type || 'image/jpeg',
          name: pago.comprobante.fileName || 'comprobante.jpg',
        });
      }

      if (pago.referencia) {
        formData.append('referencia', pago.referencia);
      }

      const response = await httpClient.post(
        PAGO_ENDPOINTS.PAGOS_RESERVA(reservaId),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Listar pagos de reserva
  async listarPagos(reservaId) {
    try {
      const response = await httpClient.get(PAGO_ENDPOINTS.PAGOS_RESERVA(reservaId));
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Descarga la factura (PDF) con el token y la comparte / abre (Fase 4).
   */
  async abrirFacturaPdf(facturaId) {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      throw new Error('Sesión no válida');
    }
    const path = PAGO_ENDPOINTS.FACTURA_PDF(facturaId).replace(/\/?$/, '');
    const uri = `${API_ORIGIN}${APP_API_PREFIX}/${path}`;
    const fileUri = `${FileSystem.cacheDirectory}factura_${facturaId}.pdf`;
    const result = await FileSystem.downloadAsync(uri, fileUri, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (result.status !== 200) {
      throw new Error('No se pudo descargar la factura');
    }
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
      });
    }
    return result.uri;
  }

  // --- CONFIRMACIÓN Y CALIFICACIÓN ---

  // Confirmar entrega con firma
  async confirmarEntrega(reservaId, datos) {
    try {
      const formData = new FormData();
      formData.append('conformidad', datos.conformidad); // 'total' | 'parcial' | 'no_conforme'

      if (datos.firma) {
        formData.append('firma', {
          uri: datos.firma.uri,
          type: 'image/png',
          name: 'firma_cliente.png',
        });
      }

      if (datos.observaciones) {
        formData.append('observaciones', datos.observaciones);
      }

      const response = await httpClient.post(
        RESERVA_ENDPOINTS.CONFIRMAR_ENTREGA(reservaId),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Calificar servicio
  async calificar(reservaId, calificacion) {
    try {
      const response = await httpClient.post(
        RESERVA_ENDPOINTS.CALIFICAR(reservaId),
        {
          calificacion_general: calificacion.general,
          puntualidad: calificacion.puntualidad,
          cuidado_objetos: calificacion.cuidadoObjetos,
          atencion_equipo: calificacion.atencionEquipo,
          comentario: calificacion.comentario,
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // --- INCIDENCIAS ---

  // Reportar incidencia
  async reportarIncidencia(reservaId, incidencia) {
    try {
      const formData = new FormData();
      formData.append('tipo', incidencia.tipo); // 'dano' | 'falta' | 'retraso' | 'otro'
      formData.append('descripcion', incidencia.descripcion);
      formData.append('gravedad', incidencia.gravedad); // 'baja' | 'media' | 'alta'

      if (incidencia.objetoId) {
        formData.append('objeto_id', incidencia.objetoId);
      }

      if (incidencia.foto) {
        formData.append('foto', {
          uri: incidencia.foto.uri,
          type: incidencia.foto.type || 'image/jpeg',
          name: incidencia.foto.fileName || 'incidencia.jpg',
        });
      }

      const response = await httpClient.post(
        INCIDENCIA_ENDPOINTS.BASE(reservaId),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Listar incidencias de reserva
  async listarIncidencias(reservaId) {
    try {
      const response = await httpClient.get(INCIDENCIA_ENDPOINTS.BASE(reservaId));
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      const message = error.response.data?.message ||
                      error.response.data?.detail ||
                      'Error en la solicitud';
      return new Error(message);
    } else if (error.request) {
      return new Error('No se pudo conectar con el servidor');
    } else {
      return new Error('Error al procesar la solicitud');
    }
  }
}

export default new ReservaService();
