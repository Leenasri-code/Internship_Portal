import api, { withFallback } from './client';
import ENDPOINTS from './endpoints';
import { assessmentTests } from '../data/assessmentTests';

/** GET {API}/assessments -> [ { id, title, duration_minutes, questions:[{id,text,options:[{id,text}]}] } ] */
export function getAssessments() {
  return withFallback(
    async () => {
      const { data } = await api.get(ENDPOINTS.assessments);
      return Array.isArray(data) ? data : data?.items || [];
    },
    async () => assessmentTests
  );
}

// Local grading (fallback only - when the backend grades, correct answers never need to ship to the browser).
function gradeLocally(test, answers) {
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
  return {
    score: details.filter((d) => d.is_correct).length,
    total: details.length,
    details,
  };
}

/**
 * POST {API}/assessments/:id/submit  { answers: { [questionId]: optionId } }
 * -> { score, total, details:[{question, user_answer, user_answer_text, correct_answer, correct_answer_text, is_correct}] }
 */
export function submitAssessment(test, answers) {
  return withFallback(
    async () => {
      const { data } = await api.post(ENDPOINTS.assessmentSubmit(test.id), { answers });
      return data;
    },
    async () => gradeLocally(test, answers)
  );
}
