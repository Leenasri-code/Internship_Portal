import api, { withFallback } from './client';
import ENDPOINTS from './endpoints';
import { assessmentTests } from '../data/assessmentTests';

export function getAssessments() {
  return withFallback(
    async () => {
      const { data } = await api.get(ENDPOINTS.assessments);
      return Array.isArray(data) ? data : data?.items || [];
    },
    async () => assessmentTests
  );
}

// Starts a server-tracked attempt. The backend returns a unique attempt_id and
// the questions without exposing correct answers.
export async function startAssessment(test) {
  if (typeof test.id === 'number') {
    // Local sample mode only: no server attempt exists for bundled sample data.
    return { attempt_id: `local-${test.id}-${Date.now()}`, questions: test.questions, duration_minutes: test.duration_minutes, title: test.title, local: true };
  }
  const { data } = await api.post(ENDPOINTS.assessmentStart(test.id));
  return data;
}

export async function submitAssessment(test, attemptId, answers, local = false) {
  if (local) {
    const details = test.questions.map((q) => {
      const userAnswer = answers[q.id] || null;
      const correct = q.correct;
      return {
        question_id: q.id,
        question: q.text,
        user_answer: userAnswer,
        user_answer_text: q.options.find((o) => o.id === userAnswer)?.text || null,
        correct_answer: correct,
        correct_answer_text: q.options.find((o) => o.id === correct)?.text || '',
        is_correct: userAnswer === correct,
      };
    });
    return { score: details.filter((d) => d.is_correct).length, total: details.length, details };
  }
  const { data } = await api.post(ENDPOINTS.assessmentSubmit(test.id), { attempt_id: attemptId, answers });
  return data;
}
