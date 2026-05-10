import httpClient from './httpClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_ENDPOINTS, API_ORIGIN } from '../constants/api';

class AuthService {
  async registro(datos) {
    try {
      await httpClient.post(AUTH_ENDPOINTS.REGISTRO, {
        email: datos.email,
        password: datos.password,
        nombre: datos.nombre,
        apellido: datos.apellido,
        telefono: datos.telefono,
      });
      return await this.login(datos.email, datos.password);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async login(email, password) {
    try {
      let response;
      try {
        response = await httpClient.post(AUTH_ENDPOINTS.TOKEN, {
          email,
          password,
        });
      } catch (firstError) {
        response = await httpClient.post(AUTH_ENDPOINTS.TOKEN, {
          username: email,
          password,
        });
      }

      await this.guardarTokens(response.data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async logout() {
    try {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    } catch (error) {
      console.error('Error en logout:', error);
    }
  }

  async getPerfil() {
    try {
      const response = await httpClient.get(AUTH_ENDPOINTS.PERFIL);
      await AsyncStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async actualizarPerfil(datos) {
    try {
      const response = await httpClient.patch(AUTH_ENDPOINTS.PERFIL, datos);
      await AsyncStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getUsuarioAlmacenado() {
    try {
      const userData = await AsyncStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  }

  async isAuthenticated() {
    const token = await AsyncStorage.getItem('accessToken');
    return !!token;
  }

  async guardarTokens(data) {
    if (data?.access) {
      await AsyncStorage.setItem('accessToken', data.access);
    }
    if (data?.refresh) {
      await AsyncStorage.setItem('refreshToken', data.refresh);
    }
    if (data?.user) {
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
    }
  }

  handleError(error) {
    if (error.response) {
      const message = error.response.data?.message ||
                      error.response.data?.detail ||
                      (typeof error.response.data === 'string' ? error.response.data : null) ||
                      'Error en la solicitud';
      return new Error(message);
    } else if (error.request) {
      return new Error(
        `No se pudo conectar con el servidor (${API_ORIGIN}). Verifica que el backend esté activo y accesible desde el dispositivo.`
      );
    } else {
      return new Error('Error al procesar la solicitud');
    }
  }
}

export default new AuthService();
