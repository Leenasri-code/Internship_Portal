import api from './client';
import ENDPOINTS from './endpoints';
import env from '../config/env';
import storage from '../utils/storage';

const DEMO_USER_KEY = 'ip_demo_user';

export async function login(username, password) {
  if (env.demoMode) {
    // Demo mode: no backend. Nothing sensitive is stored (no password).
    storage.set(DEMO_USER_KEY, { username });
    return { username };
  }
  const { data } = await api.post(ENDPOINTS.login, { username, password });
  return { username: data?.username || username };
}

export async function register(username, password, confirmPassword) {
  if (env.demoMode) {
    return { message: 'Registration successful! Please login.' };
  }
  const { data } = await api.post(ENDPOINTS.register, {
    username,
    password,
    confirm_password: confirmPassword,
  });
  return { message: data?.message || 'Registration successful! Please login.' };
}

export async function logout() {
  if (env.demoMode) {
    storage.remove(DEMO_USER_KEY);
    return;
  }
  try {
    await api.post(ENDPOINTS.logout);
  } catch {
    // Even if the server call fails we still clear the local state.
  }
}

/** Returns { username } when a session exists, otherwise null. */
export async function fetchCurrentUser() {
  if (env.demoMode) return storage.get(DEMO_USER_KEY, null);
  try {
    const { data } = await api.get(ENDPOINTS.me);
    return data?.username ? { username: data.username } : null;
  } catch (error) {
    if (error?.response?.status === 401) return null;
    throw error;
  }
}
