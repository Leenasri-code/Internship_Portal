import api, { withFallback } from './client';
import ENDPOINTS from './endpoints';
import storage from '../utils/storage';
import { sampleApplications } from '../data/sampleApplications';

const key = (username) => `ip_applications:${username || 'anonymous'}`;

const todayISO = () => new Date().toISOString().slice(0, 10);

// Local fallback store (only used when the backend has no /applications endpoint yet).
function readLocal(username) {
  const saved = storage.get(key(username), null);
  if (saved) return saved;
  storage.set(key(username), sampleApplications);
  return sampleApplications;
}

/** GET {API}/applications -> [ { id, status, applied_on, internship:{...}, notes } ] */
export function getApplications(username) {
  return withFallback(
    async () => {
      const { data } = await api.get(ENDPOINTS.applications);
      return Array.isArray(data) ? data : data?.items || [];
    },
    async () => readLocal(username)
  );
}

/**
 * POST {API}/applications  { internship_id, category, internship: {...} }
 * `internship` is a snapshot (title, company, location, duration, stipend) used by the
 * Application Management screen.
 */
export function applyToInternship(username, { internship, category }) {
  const snapshot = {
    title: internship.title,
    company: internship.company || internship.department || '',
    location: internship.location || '',
    duration: internship.duration || 'N/A',
    stipend: internship.stipend || '',
  };
  return withFallback(
    async () => {
      const { data } = await api.post(ENDPOINTS.applications, {
        internship_id: internship.id,
        category,
        internship: snapshot,
      });
      return data;
    },
    async () => {
      const list = readLocal(username);
      const already = list.find(
        (a) => a.internship?.title === snapshot.title && a.internship?.company === snapshot.company
      );
      if (already) return { duplicate: true, application: already };
      const application = {
        id: Date.now(),
        status: 'Applied',
        applied_on: todayISO(),
        internship: snapshot,
        notes: 'Application submitted. Waiting for recruiter response.',
      };
      storage.set(key(username), [application, ...list]);
      return { duplicate: false, application };
    }
  );
}
