import { useState } from 'react';
import { submitFeedback } from '../api/feedback';
import { getErrorMessage } from '../api/client';

export default function Feedback() {
  const [rating, setRating] = useState(0);
  const [suggestion, setSuggestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // { type, text }

  const onSubmit = async () => {
    if (!rating) {
      setStatus({ type: 'error', text: 'Please select a star rating before submitting.' });
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      await submitFeedback({ rating, suggestion: suggestion.trim() });
      setStatus({ type: 'success', text: 'Thank you! Your feedback has been submitted.' });
      setRating(0);
      setSuggestion('');
    } catch (err) {
      setStatus({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tw feedback-wrap flex items-center justify-center">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-lg w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Feedback</h2>

        <p className="text-lg font-medium text-gray-700 mb-4">How was your experience with the portal?</p>

        <div className="flex justify-center mb-6 space-x-2" id="stars" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              tabIndex={0}
              className={`star ${n <= rating ? 'selected' : 'text-gray-400'}`}
              data-value={n}
              onClick={() => setRating(n)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setRating(n)}
            >
              &#9733;
            </span>
          ))}
        </div>

        <label htmlFor="suggestion" className="block text-gray-700 font-medium mb-2">
          Suggestions (optional)
        </label>
        <textarea
          id="suggestion"
          rows="4"
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400 outline-none"
          placeholder="Write your feedback here..."
        />

        {status && (
          <p className={`mt-4 ${status.type === 'success' ? 'text-green-600' : 'text-red-600'}`} role="status">
            {status.text}
          </p>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="mt-6 w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition"
        >
          {submitting ? 'Submitting…' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  );
}
