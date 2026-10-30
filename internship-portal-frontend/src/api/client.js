
import axios from 'axios';
import { env } from '../config/env';
import storage from '../utils/storage';

const TOKEN_KEY = 'ip_auth_token';

// One shared Axios instance for all backend requests.
// Authentication is handled using JWT Bearer tokens, not Flask cookies.
export const api = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: false,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export const UNAUTHORIZED_EVENT = 'internship-portal:unauthorized';

// Attach the saved JWT to every authenticated API request.
api.interceptors.request.use(
  (config) => {
    const token = storage.get(TOKEN_KEY);

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Notify the application when the backend rejects authentication.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }

    return Promise.reject(error);
  }
);

/** Convert API errors into readable messages. */
export function getErrorMessage(
  error,
  fallback = 'Something went wrong. Please try again.'
) {
  const data = error?.response?.data;

  if (data) {
    if (
      typeof data === 'string' &&
      data.length < 200 &&
      !data.trim().startsWith('<')
    ) {
      return data;
    }

    if (data.error) {
      return typeof data.error === 'string' ? data.error : fallback;
    }

    if (data.message) {
      return data.message;
    }
  }

  if (error?.code === 'ECONNABORTED') {
    return 'The server took too long to respond.';
  }

  if (error?.request && !error?.response) {
    return 'Cannot reach the server. Check your connection or the API URL configuration.';
  }

  return error?.message || fallback;
}

/** Check whether an endpoint is unavailable. */
export function isUnavailable(error) {
  if (!error) return false;

  if (!error.response) return true;

  return [404, 405, 501, 502, 503, 504].includes(
    error.response.status
  );
}

/** Use bundled sample data when configured and an endpoint is unavailable. */
export async function withFallback(apiCall, fallback) {
  if (env.demoMode) {
    return fallback();
  }

  try {
    return await apiCall();
  } catch (error) {
    if (env.enableFallbackData && isUnavailable(error)) {
      if (import.meta.env.DEV) {
        console.warn(
          '[api] endpoint unavailable, using bundled sample data:',
          error?.config?.url
        );
      }

      return fallback();
    }

    throw error;
  }
}

export default api;
