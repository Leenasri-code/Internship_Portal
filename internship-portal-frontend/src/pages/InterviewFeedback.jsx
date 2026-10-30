
import { useEffect, useState } from 'react';
import {
  submitInterviewFeedback,
  getMyInterviewFeedback
} from '../api/interviewFeedback';
import { getErrorMessage } from '../api/client';

const initialForm = {
  company: '',
  round: 'Technical',
  questions: '',
  topics: '',
  difficulty: 'Medium',
  performance: 'Average',
  improvement_areas: '',
  additional_comments: ''
};

function splitItems(value) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function InterviewFeedback() {
  const [form, setForm] = useState(initialForm);
  const [history, setHistory] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

  const loadHistory = async () => {
    try {
      const data = await getMyInterviewFeedback();
      setHistory(data.items || []);
    } catch (error) {
      setStatus({
        type: 'error',
        text: getErrorMessage(error, 'Unable to load feedback history.')
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);

    if (!form.company.trim()) {
      setStatus({
        type: 'error',
        text: 'Please enter the company name.'
      });
      return;
    }

    setSubmitting(true);

    const payload = {
      company: form.company.trim(),
      round: form.round,
      questions: splitItems(form.questions),
      topics: splitItems(form.topics),
      difficulty: form.difficulty,
      performance: form.performance,
      improvement_areas: splitItems(form.improvement_areas),
      additional_comments: form.additional_comments.trim()
    };

    try {
      await submitInterviewFeedback(payload);

      setStatus({
        type: 'success',
        text: 'Your interview feedback was submitted successfully.'
      });

      setForm(initialForm);
      await loadHistory();
    } catch (error) {
      setStatus({
        type: 'error',
        text: getErrorMessage(error)
      });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-400';

  return (
    <div className="tw p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Interview Feedback
          </h1>
          <p className="text-gray-600 mt-2">
            Share your interview experience and identify areas where you can improve.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-lg rounded-xl p-6 md:p-8 space-y-6"
        >
          <h2 className="text-xl font-semibold text-gray-800">
            Submit Interview Experience
          </h2>

          <div>
            <label htmlFor="company" className="block font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <input
              id="company"
              name="company"
              value={form.company}
              onChange={handleChange}
              placeholder="Example: TCS, Infosys, Accenture"
              className={inputClass}
              maxLength={150}
              required
            />
          </div>

          <div>
            <label htmlFor="round" className="block font-medium text-gray-700 mb-2">
              Interview Round *
            </label>
            <select
              id="round"
              name="round"
              value={form.round}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="Aptitude">Aptitude</option>
              <option value="Technical">Technical</option>
              <option value="Coding">Coding</option>
              <option value="HR">HR</option>
              <option value="Group Discussion">Group Discussion</option>
              <option value="Managerial">Managerial</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="questions" className="block font-medium text-gray-700 mb-2">
              Interview Questions
            </label>
            <textarea
              id="questions"
              name="questions"
              value={form.questions}
              onChange={handleChange}
              rows={4}
              className={inputClass}
              placeholder={'Enter questions separated by commas or new lines.\nExample: Explain OOP concepts'}
            />
          </div>

          <div>
            <label htmlFor="topics" className="block font-medium text-gray-700 mb-2">
              Technical Topics
            </label>
            <textarea
              id="topics"
              name="topics"
              value={form.topics}
              onChange={handleChange}
              rows={3}
              className={inputClass}
              placeholder={'Example:\nPython\nSQL\nData Structures'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="difficulty" className="block font-medium text-gray-700 mb-2">
                Interview Difficulty *
              </label>
              <select
                id="difficulty"
                name="difficulty"
                value={form.difficulty}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label htmlFor="performance" className="block font-medium text-gray-700 mb-2">
                Your Performance *
              </label>
              <select
                id="performance"
                name="performance"
                value={form.performance}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Average">Average</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="improvement_areas" className="block font-medium text-gray-700 mb-2">
              Areas for Improvement
            </label>
            <textarea
              id="improvement_areas"
              name="improvement_areas"
              value={form.improvement_areas}
              onChange={handleChange}
              rows={3}
              className={inputClass}
              placeholder={'Example:\nProblem solving\nCommunication\nSQL queries'}
            />
          </div>

          <div>
            <label htmlFor="additional_comments" className="block font-medium text-gray-700 mb-2">
              Additional Comments
            </label>
            <textarea
              id="additional_comments"
              name="additional_comments"
              value={form.additional_comments}
              onChange={handleChange}
              rows={3}
              maxLength={2000}
              className={inputClass}
              placeholder="Share any other details about your interview experience..."
            />
          </div>

          {status && (
            <div
              role="status"
              className={`rounded-lg p-3 ${
                status.type === 'success'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {status.text}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {submitting ? 'Submitting...' : 'Submit Interview Feedback'}
          </button>
        </form>

        <section className="mt-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-5">
            My Interview Feedback History
          </h2>

          {loading ? (
            <p className="text-gray-600">Loading your feedback...</p>
          ) : history.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-6 text-gray-600">
              You haven't submitted any interview feedback yet.
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <article
                  key={item._id}
                  className="bg-white rounded-xl shadow p-5 border border-gray-100"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">
                        {item.company}
                      </h3>
                      <p className="text-gray-600">{item.round} Round</p>
                    </div>

                    <span className="text-sm text-gray-500">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString()
                        : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                    <p className="text-sm text-gray-700">
                      <strong>Difficulty:</strong> {item.difficulty}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Performance:</strong> {item.performance}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Topics:</strong> {(item.topics || []).join(', ') || 'Not specified'}
                    </p>
                  </div>

                  {item.improvement_areas?.length > 0 && (
                    <p className="mt-3 text-sm text-gray-700">
                      <strong>Improvement areas:</strong>{' '}
                      {item.improvement_areas.join(', ')}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
