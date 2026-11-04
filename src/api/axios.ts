import axios, { type InternalAxiosRequestConfig } from 'axios';
import { loadingBus } from '../utils/loadingBus';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** true = no mostrar la barra de progreso superior para esta petición */
    silent?: boolean;
  }
  interface InternalAxiosRequestConfig {
    _progresoActivo?: boolean;
  }
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Accept': 'application/json',
  },
});

const terminarProgreso = (config?: InternalAxiosRequestConfig) => {
  if (config?._progresoActivo) {
    config._progresoActivo = false;
    loadingBus.done();
  }
};

// Interceptor: agregar token de autenticación y arrancar la barra de progreso
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!config.silent) {
    config._progresoActivo = true;
    loadingBus.start();
  }
  return config;
});

// Interceptor: terminar la barra de progreso y manejar errores de autenticación
api.interceptors.response.use(
  (response) => {
    terminarProgreso(response.config);
    return response;
  },
  (error) => {
    terminarProgreso(error.config);
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
