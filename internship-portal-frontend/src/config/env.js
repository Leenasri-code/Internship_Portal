// Central place for every environment-driven setting.
// Only VITE_* variables are exposed to the browser by Vite - never store secrets here.

const bool = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
};

const trimSlash = (value) => (value || '').replace(/\/+$/, '');

const rawPrefix = import.meta.env.VITE_API_PREFIX;
const prefix =
  rawPrefix === undefined ? '/api' : rawPrefix === '' ? '' : '/' + rawPrefix.replace(/^\/+|\/+$/g, '');

export const env = {
  apiBaseUrl: trimSlash(import.meta.env.VITE_API_BASE_URL) || 'http://localhost:5000',
  apiPrefix: prefix,
  withCredentials: bool(import.meta.env.VITE_API_WITH_CREDENTIALS, true),
  enableFallbackData: bool(import.meta.env.VITE_ENABLE_FALLBACK_DATA, true),
  demoMode: bool(import.meta.env.VITE_DEMO_MODE, false),
};

export default env;
