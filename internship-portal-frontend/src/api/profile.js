import api from './client';
import ENDPOINTS from './endpoints';
import env from '../config/env';
import storage from '../utils/storage';

const demoKey = (username) => `ip_demo_profile:${username || 'anonymous'}`;

/** GET profile (original route: GET /profile_data). Returns {} when nothing saved. */
export async function getProfile(username) {
  if (env.demoMode) return storage.get(demoKey(username), {});
  const { data } = await api.get(ENDPOINTS.profile);
  return data || {};
}

/** POST profile (original route: POST /profile_data). */
export async function saveProfile(username, profile) {
  if (env.demoMode) {
    storage.set(demoKey(username), profile);
    return { status: 'success' };
  }
  const { data } = await api.post(ENDPOINTS.profile, profile);
  return data;
}
