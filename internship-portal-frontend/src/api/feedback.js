import api, { withFallback } from './client';
import ENDPOINTS from './endpoints';
import storage from '../utils/storage';

/** POST {API}/feedback  { rating: 1-5, suggestion: string } */
export function submitFeedback({ rating, suggestion }) {
  return withFallback(
    async () => {
      const { data } = await api.post(ENDPOINTS.feedback, { rating, suggestion });
      return data;
    },
    async () => {
      // Fallback: keep it in the browser so nothing is lost while the endpoint is missing.
      const all = storage.get('ip_feedback', []);
      all.push({ rating, suggestion, created_at: new Date().toISOString() });
      storage.set('ip_feedback', all);
      return { status: 'success', stored: 'local' };
    }
  );
}
