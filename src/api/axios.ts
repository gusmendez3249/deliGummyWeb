import axios, { type InternalAxiosRequestConfig } from 'axios';
import { loadingBus } from '../utils/loadingBus';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** true = no mostrar la barra de progreso superior para esta petición */
    silent?: boolean;
    /**
     * Texto de la tarjeta flotante de progreso. Por defecto se muestra en
     * POST/PUT/PATCH/DELETE ("Guardando cambios...", etc.); false = no mostrarla.
     */
    progressLabel?: string | false;
  }
  interface InternalAxiosRequestConfig {
    _progresoActivo?: boolean;
    _tareaId?: number;
  }
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Accept': 'application/json',
  },
});

const ETIQUETAS_POR_METODO: Record<string, string> = {
  post: 'Guardando cambios...',
  put: 'Actualizando información...',
  patch: 'Actualizando información...',
  delete: 'Eliminando...',
};

const etiquetaDeTarea = (config: InternalAxiosRequestConfig): string | null => {
  if (config.progressLabel === false) return null;
  if (typeof config.progressLabel === 'string') return config.progressLabel;
  return ETIQUETAS_POR_METODO[(config.method || 'get').toLowerCase()] ?? null;
};

const terminarProgreso = (config?: InternalAxiosRequestConfig) => {
  if (config?._progresoActivo) {
    config._progresoActivo = false;
    loadingBus.done();
  }
  if (config?._tareaId) {
    loadingBus.doneTask(config._tareaId);
    config._tareaId = undefined;
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
  const etiqueta = etiquetaDeTarea(config);
  if (etiqueta) {
    config._tareaId = loadingBus.startTask(etiqueta);
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
