import api, { withFallback } from './client';
import ENDPOINTS from './endpoints';
import { recommendedInternships } from '../data/recommendedInternships';
import { privateInternships } from '../data/privateInternships';
import { governmentInternships } from '../data/governmentInternships';

const FALLBACK = {
  recommended: recommendedInternships,
  private: privateInternships,
  government: governmentInternships,
};

/**
 * category: 'recommended' | 'private' | 'government'
 * Backend: GET {API}/internships?category=<category>  ->  [ {...}, ... ]  (or { items: [...] })
 */
export function getInternships(category) {
  return withFallback(
    async () => {
      const { data } = await api.get(ENDPOINTS.internships, { params: { category } });
      return Array.isArray(data) ? data : data?.items || [];
    },
    async () => FALLBACK[category] || []
  );
}
