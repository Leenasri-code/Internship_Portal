
const TOKEN_KEY = 'ip_auth_token';

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
    throw new Error('Login response did not contain an authentication token.');
  }

  storage.set(TOKEN_KEY, data.token);

  return {
    username: data.user?.username || username,
  };
}

export async function logout() {
  if (env.demoMode) {
    storage.remove(DEMO_USER_KEY);
    return;
  }

  try {
    await api.post(ENDPOINTS.logout);
  } catch {
    // Clear local authentication even if logout request fails.
  } finally {
    storage.remove(TOKEN_KEY);
  }
}

export async function fetchCurrentUser() {
  if (env.demoMode) {
    return storage.get(DEMO_USER_KEY, null);
  }

  try {
    const { data } = await api.get(ENDPOINTS.me);

    return data?.user?.username
      ? { username: data.user.username }
      : null;
  } catch (error) {
    if (error?.response?.status === 401) return null;
    throw error;
  }
}
