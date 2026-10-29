import { env } from '../config/env';

// Every backend route used by the frontend lives here, so the contract with the
// Flask API is visible (and changeable) in a single file.
// See docs/BACKEND_API_CONTRACT.md for request / response shapes.
const p = env.apiPrefix;

export const ENDPOINTS = {
  // Authentication (original Flask routes: /login, /register, /logout)
  login: `${p}/auth/login`,
  register: `${p}/auth/register`,
  logout: `${p}/auth/logout`,
  me: `${p}/auth/me`,

  // Profile (original Flask route: /profile_data  GET + POST)
  profile: `${p}/profile`,

  // Internships (original pages: dashboard, /private_internships, /government_internships)
  internships: `${p}/internships`, // ?category=recommended|private|government
  internship: (id) => `${p}/internships/${encodeURIComponent(id)}`,

  // Applications (original page: /applications)
  applications: `${p}/applications`,

  // Assessments (original page: /assessment)
  assessments: `${p}/assessments`,
  assessment: (id) => `${p}/assessments/${encodeURIComponent(id)}`,
  assessmentSubmit: (id) => `${p}/assessments/${encodeURIComponent(id)}/submit`,

  // Feedback (original page: /feedback)
  feedback: `${p}/feedback`,
};

export default ENDPOINTS;
