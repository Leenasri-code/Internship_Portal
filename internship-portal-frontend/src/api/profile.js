
import api from './client';
import ENDPOINTS from './endpoints';
import env from '../config/env';
import storage from '../utils/storage';

const demoKey = (username) => `ip_demo_profile:${username || 'anonymous'}`;

// GET saved profile
export async function getProfile(username) {
  if (env.demoMode) {
    return storage.get(demoKey(username), {});
  }

  const { data } = await api.get(ENDPOINTS.profile);

  // Backend response is { profile: {...}, exists: true }
  return data?.profile || {};
}

// SAVE profile
export async function saveProfile(username, profile) {
  if (env.demoMode) {
    storage.set(demoKey(username), profile);
    return { status: 'success', profile };
  }

  const { data } = await api.put(ENDPOINTS.profile, profile);

  return data?.profile || data;
}
