import httpClient from './httpClient';
import { API_ORIGIN, APP_API_PREFIX, APP_API_BASE_URL } from '../constants/api';

const unwrap = (response) => response?.data;

export const apiClient = {
  get: async (endpoint, config = {}) => unwrap(await httpClient.get(endpoint, config)),
  post: async (endpoint, data = {}, config = {}) => unwrap(await httpClient.post(endpoint, data, config)),
  put: async (endpoint, data = {}, config = {}) => unwrap(await httpClient.put(endpoint, data, config)),
  patch: async (endpoint, data = {}, config = {}) => unwrap(await httpClient.patch(endpoint, data, config)),
  delete: async (endpoint, config = {}) => unwrap(await httpClient.delete(endpoint, config)),
};

export const API_CONNECTION = {
  origin: API_ORIGIN,
  appPrefix: APP_API_PREFIX,
  appBaseUrl: APP_API_BASE_URL,
};

export default apiClient;
