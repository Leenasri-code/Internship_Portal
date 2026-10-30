
import api from './client';
import ENDPOINTS from './endpoints';

// Submit student interview feedback
export async function submitInterviewFeedback(feedback) {
  const { data } = await api.post(
    ENDPOINTS.interviewFeedback,
    feedback
  );

  return data;
}

// Get logged-in student's interview feedback
export async function getMyInterviewFeedback(page = 1, limit = 20) {
  const { data } = await api.get(
    ENDPOINTS.myInterviewFeedback,
    {
      params: { page, limit }
    }
  );

  return data;
}

// Get company and interview-round analytics (admin only)
export async function getInterviewFeedbackAnalytics() {
  const { data } = await api.get(
    ENDPOINTS.interviewFeedbackAnalytics
  );

  return data;
}
