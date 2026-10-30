
import api from './client';
import ENDPOINTS from './endpoints';
import env from '../config/env';
import storage from '../utils/storage';

const DEMO_USER_KEY = 'ip_demo_user';
const TOKEN_KEY = 'ip_auth_token';

/** Login using the backend and save the JWT token. */
export async function login(username, password) {
  if (env.demoMode) {
    storage.set(DEMO_USER_KEY, { username });
    return { username };
  }

  const { data } = await api.post(ENDPOINTS.login, {
    username,
    password,
  });

  if (!data?.token) {
    throw new Error(
      'Login failed: authentication token was not returned by the server.'
    );
  }

  // Save JWT for subsequent authenticated requests.
  storage.set(TOKEN_KEY, data.token);

  return {
    username: data.user?.username || username,
  };
}

/** Register a new user. */
export async function register(username, password, confirmPassword) {
  if (env.demoMode) {
    return {
      message: 'Registration successful! Please login.',
    };
  }

  const { data } = await api.post(ENDPOINTS.register, {
    username,
    password,
    confirm_password: confirmPassword,
  });

  return {
    message: data?.message || 'Registration successful! Please login.',
  };
}

/** Logout and remove the locally saved JWT. */
export async function logout() {
  if (env.demoMode) {
    storage.remove(DEMO_USER_KEY);
    return;
  }

  try {
    await api.post(ENDPOINTS.logout);
  } catch (error) {
    console.warn('Backend logout request failed:', error?.message);
  } finally {
    storage.remove(TOKEN_KEY);
  }
}

/** Restore the logged-in user using the saved JWT. */
export async function fetchCurrentUser() {
  if (env.demoMode) {
    return storage.get(DEMO_USER_KEY, null);
  }

  const token = storage.get(TOKEN_KEY);

  // No token means the user is not logged in.
  if (!token) {
    return null;
  }

  try {
    const { data } = await api.get(ENDPOINTS.me);

    if (!data?.user) {
      return null;
    }

    return {
      username: data.user.username,
    };
  } catch (error) {
    if (error?.response?.status === 401) {
      storage.remove(TOKEN_KEY);
      return null;
    }

    throw error;
  }
}
