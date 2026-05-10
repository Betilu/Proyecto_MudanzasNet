import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_API_BASE_URL, AUTH_ENDPOINTS } from '../constants/api';

/**
 * Cliente HTTP único: baseURL = origen + /api/app-cliente
 * Las rutas en constants/api.js son relativas (ej. reservas/, auth/token/).
 */
const httpClient = axios.create({
  baseURL: APP_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshClient = axios.create({
  baseURL: APP_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');

        if (refreshToken) {
          const { data } = await refreshClient.post(AUTH_ENDPOINTS.REFRESH, {
            refresh: refreshToken,
          });
          const { access } = data;
          await AsyncStorage.setItem('accessToken', access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return httpClient(originalRequest);
        }
      } catch (refreshError) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default httpClient;
