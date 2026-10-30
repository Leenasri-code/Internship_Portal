
import { env } from '../config/env';

const p = env.apiPrefix;

const ENDPOINTS = {
  // Authentication
  login: `${p}/auth/login`,
  register: `${p}/auth/register`,
  logout: `${p}/auth/logout`,
  me: `${p}/auth/me`,

  // Profile
  profile: `${p}/profile`,

  // Internships
  internships: `${p}/internships`,
  internship: (id) => `${p}/internships/${encodeURIComponent(id)}`,

  // Applications
  applications: `${p}/applications`,

  // Assessments
  assessments: `${p}/assessments`,
  assessment: (id) => `${p}/assessments/${encodeURIComponent(id)}`,
  assessmentStart: (id) => `${p}/assessments/${encodeURIComponent(id)}/start`,
  assessmentSubmit: (id) => `${p}/assessments/${encodeURIComponent(id)}/submit`,

  // General feedback
  feedback: `${p}/feedback`,

  // PATH-AI: Interview feedback
  interviewFeedback: `${p}/interview-feedback`,
  myInterviewFeedback: `${p}/interview-feedback/mine`,
  interviewFeedbackAnalytics: `${p}/interview-feedback/analytics`,
};

export default ENDPOINTS;
