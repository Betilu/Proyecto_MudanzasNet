import api from './api';
import { API_ENDPOINTS } from '../config/api';

export const servicioService = {
  async getMisServicios() {
    try {
      const response = await api.get(API_ENDPOINTS.servicios);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al obtener servicios',
      };
    }
  },

  async getServicioDetalle(id) {
    try {
      const response = await api.get(API_ENDPOINTS.servicioDetalle(id));
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al obtener servicio',
      };
    }
  },

  async reportarIncidencia(servicioId, data, foto) {
    try {
      const formData = new FormData();
      formData.append('tipo', data.tipo);
      formData.append('descripcion', data.descripcion);
      formData.append('gravedad', data.gravedad);
      if (data.objeto_id) {
        formData.append('objeto', data.objeto_id);
      }

      if (foto) {
        formData.append('foto', {
          uri: foto.uri,
          type: 'image/jpeg',
          name: 'incidencia.jpg',
        });
      }

      const response = await api.post(
        API_ENDPOINTS.reportarIncidencia(servicioId),
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al reportar incidencia',
      };
    }
  },

  async confirmarEntrega(servicioId, firmaBase64, conforme, observaciones) {
    try {
      const formData = new FormData();
      formData.append('tipo_firma', 'cliente');
      formData.append('cliente_conforme', conforme);
      if (observaciones) {
        formData.append('observaciones', observaciones);
      }

      const response_blob = await fetch(firmaBase64);
      const blob = await response_blob.blob();
      formData.append('firma', {
        uri: firmaBase64,
        type: 'image/png',
        name: 'firma_cliente.png',
      });

      const response = await api.post(
        API_ENDPOINTS.confirmarEntrega(servicioId),
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al confirmar entrega',
      };
    }
  },

  async calificarServicio(servicioId, calificaciones) {
    try {
      const response = await api.post(
        API_ENDPOINTS.calificar(servicioId),
        calificaciones
      );

      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Error al calificar',
      };
    }
  },
};
