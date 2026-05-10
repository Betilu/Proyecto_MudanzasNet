import httpClient from './httpClient';
import { COTIZACION_ENDPOINTS, INVENTARIO_ENDPOINTS, ZONAS_ENDPOINTS } from '../constants/api';

function toPk(value) {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

class CotizacionService {
  // Crear nueva cotización
  async crear(datos) {
    try {
      const payload = {
        zona_origen_id: toPk(datos.zonaOrigenId),
        direccion_origen: (datos.direccionOrigen || '').trim(),
        zona_destino_id: toPk(datos.zonaDestinoId),
        direccion_destino: (datos.direccionDestino || '').trim(),
        fecha_deseada: datos.fechaDeseada,
        franja_horaria: datos.franjaHoraria || 'manana',
        tipo_servicio_id: toPk(datos.tipoServicioId),
      };

      if (datos.descripcion != null && String(datos.descripcion).trim() !== '') {
        payload.descripcion = String(datos.descripcion).trim();
      }

      const latO = datos.latitudOrigen;
      const lngO = datos.longitudOrigen;
      const latD = datos.latitudDestino;
      const lngD = datos.longitudDestino;
      if (latO != null && lngO != null) {
        payload.latitud_origen = latO;
        payload.longitud_origen = lngO;
      }
      if (latD != null && lngD != null) {
        payload.latitud_destino = latD;
        payload.longitud_destino = lngD;
      }

      const response = await httpClient.post(COTIZACION_ENDPOINTS.BASE, payload);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Listar mis cotizaciones
  async listar(filtros = {}) {
    try {
      const response = await httpClient.get(COTIZACION_ENDPOINTS.BASE, {
        params: filtros,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Obtener detalle de cotización
  async getDetalle(id) {
    try {
      const response = await httpClient.get(COTIZACION_ENDPOINTS.DETALLE(id));
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Actualizar cotización
  async actualizar(id, datos) {
    try {
      const response = await httpClient.put(COTIZACION_ENDPOINTS.DETALLE(id), datos);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Eliminar cotización
  async eliminar(id) {
    try {
      await httpClient.delete(COTIZACION_ENDPOINTS.DETALLE(id));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Calcular precio con IA (cuerpo JSON obligatorio para evitar 400 con Content-Type application/json vacío)
  async calcularPrecio(id, opciones = {}) {
    try {
      const body = {
        solicita_embalaje: Boolean(opciones.solicitaEmbalaje),
      };
      const response = await httpClient.post(COTIZACION_ENDPOINTS.CALCULAR_PRECIO(id), body);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Aceptar cotización
  async aceptar(id) {
    try {
      const response = await httpClient.post(COTIZACION_ENDPOINTS.ACEPTAR(id), {});
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // --- OBJETOS DE INVENTARIO ---

  // Agregar objeto a cotización
  async agregarObjeto(cotizacionId, objeto) {
    try {
      const formData = new FormData();
      formData.append('categoria_id', objeto.categoriaId);
      formData.append('nombre', objeto.nombre);
      formData.append('largo', objeto.largo);
      formData.append('ancho', objeto.ancho);
      formData.append('alto', objeto.alto);
      formData.append('peso', objeto.peso);
      formData.append('fragilidad', objeto.fragilidad);

      if (objeto.foto) {
        formData.append('foto', {
          uri: objeto.foto.uri,
          type: objeto.foto.type || 'image/jpeg',
          name: objeto.foto.fileName || 'objeto.jpg',
        });
      }

      const response = await httpClient.post(
        COTIZACION_ENDPOINTS.OBJETOS(cotizacionId),
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

  // Listar objetos de cotización
  async listarObjetos(cotizacionId) {
    try {
      const response = await httpClient.get(COTIZACION_ENDPOINTS.OBJETOS(cotizacionId));
      return CotizacionService.normalizarListaObjetos(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Actualizar objeto
  async actualizarObjeto(objetoId, datos) {
    try {
      const response = await httpClient.put(INVENTARIO_ENDPOINTS.OBJETO_DETALLE(objetoId), datos);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Eliminar objeto
  async eliminarObjeto(objetoId) {
    try {
      await httpClient.delete(INVENTARIO_ENDPOINTS.OBJETO_DETALLE(objetoId));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // --- CATÁLOGOS ---

  // Obtener zonas
  async getZonas() {
    try {
      const response = await httpClient.get(ZONAS_ENDPOINTS.ZONAS);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Obtener tipos de servicio
  async getTiposServicio() {
    try {
      const response = await httpClient.get(ZONAS_ENDPOINTS.TIPOS_SERVICIO);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Obtener servicios adicionales
  async getServiciosAdicionales() {
    try {
      const response = await httpClient.get(ZONAS_ENDPOINTS.SERVICIOS_ADICIONALES);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Obtener categorías de objetos (catálogo; respuesta paginada o lista)
  async getCategorias() {
    try {
      const response = await httpClient.get(INVENTARIO_ENDPOINTS.CATEGORIAS);
      const data = response.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.results)) return data.results;
      return [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /** Lista de objetos de una cotización (siempre array). */
  static normalizarListaObjetos(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  }

  handleError(error) {
    if (error.response) {
      const { status, data, headers } = error.response;
      const ctype = (headers && (headers['content-type'] || headers['Content-Type'])) || '';
      if (typeof ctype === 'string' && ctype.includes('text/html')) {
        return new Error(CotizacionService.serverHtmlMessage(status));
      }
      const message = CotizacionService.formatValidationMessage(data, status);
      return new Error(message);
    }
    if (error.request) {
      return new Error('No se pudo conectar con el servidor');
    }
    return new Error('Error al procesar la solicitud');
  }

  static serverHtmlMessage(status) {
    const base =
      'El servidor respondió con una página de error (no JSON). Suele pasar con DEBUG=True o si la base de datos no tiene las migraciones aplicadas.';
    const migrate = ' En el backend ejecuta: python manage.py migrate';
    if (status === 404) {
      return 'Ruta de API no encontrada (404). Verifica EXPO_PUBLIC_API_URL y que el servidor use /api/app-cliente/.';
    }
    return `${base}${migrate} (HTTP ${status}).`;
  }

  static formatValidationMessage(data, status) {
    if (data == null) {
      return status ? `Error en la solicitud (HTTP ${status})` : 'Error en la solicitud';
    }
    if (typeof data === 'string') {
      const t = data.trim();
      if (
        t.startsWith('<!DOCTYPE') ||
        t.startsWith('<html') ||
        t.includes('<!DOCTYPE html') ||
        /Traceback|ProgrammingError|Exception Value:/i.test(t)
      ) {
        return CotizacionService.serverHtmlMessage(status || 500);
      }
      return t.length > 280 ? `${t.slice(0, 280)}…` : t;
    }
    if (data.message) return String(data.message);
    if (data.detail != null) {
      if (Array.isArray(data.detail)) {
        return data.detail.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ');
      }
      return String(data.detail);
    }
    const lines = [];
    for (const [key, val] of Object.entries(data)) {
      if (Array.isArray(val)) {
        lines.push(`${key}: ${val.join(', ')}`);
      } else if (val != null && typeof val === 'object') {
        lines.push(`${key}: ${JSON.stringify(val)}`);
      } else {
        lines.push(`${key}: ${val}`);
      }
    }
    return lines.length ? lines.join('\n') : 'Error en la solicitud';
  }
}

export default new CotizacionService();
