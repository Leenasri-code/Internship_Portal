import { useCallback, useEffect, useRef, useState } from 'react';
import { getAssessments, submitAssessment } from '../api/assessments';
import { getErrorMessage } from '../api/client';

const pad = (n) => String(n).padStart(2, '0');

export default function Assessment() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [current, setCurrent] = useState(null); // active test
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // refs so the timer callback always sees the latest values and can only submit once
  const answersRef = useRef({});
  const submittedRef = useRef(false);
  answersRef.current = answers;

  useEffect(() => {
    let active = true;
    getAssessments()
      .then((list) => active && setTests(list))
      .catch((err) => active && setError(getErrorMessage(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const finish = useCallback(
    async (test) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      try {
        const res = await submitAssessment(test, answersRef.current);
        setResult(res);
        setCurrent(null);
      } catch (err) {
        submittedRef.current = false;
        setError(getErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  // countdown
  useEffect(() => {
    if (!current) return undefined;
    const id = setInterval(() => {
      setTimeLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [current]);

  useEffect(() => {
    if (current && timeLeft <= 0) finish(current);
  }, [timeLeft, current, finish]);

  const start = (test) => {
    submittedRef.current = false;
    setError('');
    setResult(null);
    setAnswers({});
    setIndex(0);
    setTimeLeft(test.duration_minutes * 60);
    setCurrent(test);
  };

  const backToTests = () => {
    setResult(null);
    setCurrent(null);
    setAnswers({});
    setIndex(0);
  };

  const question = current?.questions[index];
  const isLast = current && index === current.questions.length - 1;

  return (
    <div className="tw text-gray-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 border-b-2 border-blue-600 pb-2">Assessment Tests</h1>

        {error && <p className="text-red-600 mb-4">{error}</p>}
        {loading && <p>Loading tests…</p>}
        {!loading && !current && !result && tests.length === 0 && !error && <p>No tests available</p>}

        {/* Test list */}
        {!current && !result && (
          <div id="test-list" className="space-y-6">
            {tests.map((test) => (
              <div key={test.id} className="bg-white p-6 rounded-md shadow hover:shadow-lg cursor-pointer">
                <h3 className="text-xl font-semibold">{test.title}</h3>
                <p className="mt-1">
                  Duration: <strong>{test.duration_minutes} {test.duration_minutes > 1 ? 'minutes' : 'minute'}</strong>
                </p>
                <button type="button" className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onClick={() => start(test)}>
                  Start Test
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Taking a test */}
        {current && question && (
          <div id="test-section" className="bg-white p-8 rounded-lg shadow-lg mt-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">{current.title}</h2>
              <div className="text-right">
                <span className="font-mono text-lg" id="timer">
                  {pad(Math.max(0, Math.floor(timeLeft / 60)))}:{pad(Math.max(0, timeLeft % 60))}
                </span>
              </div>
            </div>

            <div id="question-container" className="space-y-6">
              <div>
                <p className="font-semibold text-lg mb-4">Q{index + 1}. {question.text}</p>
                <div className="space-y-3">
                  {question.options.map((opt) => {
                    const selected = answers[question.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`option-button block w-full border border-gray-300 rounded py-2 px-4 text-left${selected ? ' selected' : ''}`}
                        onClick={() => setAnswers((a) => ({ ...a, [question.id]: opt.id }))}
                      >
                        {opt.id.toUpperCase()}. {opt.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button type="button" className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
                Previous
              </button>
              {!isLast && (
                <button type="button" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onClick={() => setIndex((i) => i + 1)}>
                  Next
                </button>
              )}
            </div>

            {isLast && (
              <div className="mt-6 flex justify-end">
                <button type="button" className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700" disabled={submitting} onClick={() => finish(current)}>
                  {submitting ? 'Submitting…' : 'Submit Test'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div id="result-section" className="bg-white p-8 rounded-lg shadow-lg mt-8">
            <h2 className="text-2xl font-semibold mb-4">Test Results</h2>
            <p className="mb-2">
              Your score: <span id="score">{result.score}</span> / <span id="total-questions">{result.total}</span>
            </p>
            <div id="result-details" className="space-y-4">
              {(result.details || []).map((d, i) => (
                <div key={d.question_id ?? i} className={`p-4 rounded border ${d.is_correct ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                  <p><strong>Q:</strong> {d.question}</p>
                  <p>
                    <strong>Your answer:</strong>{' '}
                    {d.user_answer ? `${d.user_answer.toUpperCase()} - ${d.user_answer_text ?? ''}` : 'NO ANSWER'}
                  </p>
                  <p>
                    <strong>Correct answer:</strong> {String(d.correct_answer).toUpperCase()} - {d.correct_answer_text}
                  </p>
                </div>
              ))}
            </div>
            <button type="button" onClick={backToTests} className="mt-6 bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700">
              Back to Tests
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
