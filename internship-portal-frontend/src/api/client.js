import axios from 'axios';
import { env } from '../config/env';

// One shared Axios instance. The base URL comes from VITE_API_BASE_URL.
export const api = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: env.withCredentials, // Flask session cookie
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export const UNAUTHORIZED_EVENT = 'internship-portal:unauthorized';

// Let the app know when the session is gone (backend answered 401).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  }
);

/** Turn any Axios / JS error into a human friendly message. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data;
  if (data) {
    if (typeof data === 'string' && data.length < 200 && !data.trim().startsWith('<')) return data;
    if (data.error) return typeof data.error === 'string' ? data.error : fallback;
    if (data.message) return data.message;
  }
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond.';
  if (error?.request && !error?.response) {
    return 'Cannot reach the server. Check your connection or the API URL configuration.';
  }
  return error?.message || fallback;
}

/**
 * True when the failure means "this endpoint isn't available" (network error,
 * 404 / 405 / 501) as opposed to a real answer such as 401 / 400 / 409.
 */
export function isUnavailable(error) {
  if (!error) return false;
  if (!error.response) return true; // network / CORS / timeout
  return [404, 405, 501, 502, 503, 504].includes(error.response.status);
}

/**
 * Call the backend; if the endpoint is unavailable and fallback data is enabled,
 * use the bundled sample data from the original project instead.
 */
export async function withFallback(apiCall, fallback) {
  if (env.demoMode) return fallback();
  try {
    return await apiCall();
  } catch (error) {
    if (env.enableFallbackData && isUnavailable(error)) {
      if (import.meta.env.DEV) {
        console.warn('[api] endpoint unavailable, using bundled sample data:', error?.config?.url);
      }
      return fallback();
    }
    throw error;
  }
}

export default api;
