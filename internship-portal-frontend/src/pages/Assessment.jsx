import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApplications } from '../api/applications';
import { getAssessments, startAssessment, submitAssessment } from '../api/assessments';
import { getErrorMessage } from '../api/client';

const pad = (n) => String(n).padStart(2, '0');
const ROUND_GUIDE = [
  'Aptitude Assessment',
  'Technical Assessment',
  'Coding Round',
  'Technical Interview',
  'HR Interview',
];
const norm = (value) => String(value || '').trim().toLowerCase();

export default function Assessment() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [current, setCurrent] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [localAttempt, setLocalAttempt] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const answersRef = useRef({});
  const submittedRef = useRef(false);
  answersRef.current = answers;

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [apps, assessmentList] = await Promise.all([
        getApplications(user?.username),
        getAssessments(),
      ]);
      setApplications(apps || []);
      setTests(assessmentList || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [user?.username]);

  useEffect(() => { reload(); }, [reload]);

  const finish = useCallback(async (test) => {
    if (submittedRef.current || !attemptId) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const res = await submitAssessment(test, attemptId, answersRef.current, localAttempt);
      setResult(res);
      setCurrent(null);
    } catch (err) {
      submittedRef.current = false;
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }, [attemptId, localAttempt]);

  useEffect(() => {
    if (!current) return undefined;
    const timer = window.setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [current]);

  useEffect(() => {
    if (current && timeLeft === 0) finish(current);
  }, [timeLeft, current, finish]);

  const begin = async (test) => {
    setStarting(true);
    setError('');
    try {
      const attempt = await startAssessment(test);
      const activeTest = { ...test, questions: attempt.questions || test.questions, title: attempt.title || test.title };
      submittedRef.current = false;
      setResult(null);
      setAnswers({});
      setIndex(0);
      setAttemptId(attempt.attempt_id);
      setLocalAttempt(Boolean(attempt.local));
      setTimeLeft((attempt.duration_minutes || test.duration_minutes) * 60);
      setCurrent(activeTest);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  const company = selectedApp?.internship?.company || selectedApp?.internship?.department || 'Company';
  const companyTests = selectedApp ? tests.filter((t) => norm(t.company) === norm(company) || !norm(t.company)) : [];
  const orderedTests = [...companyTests].sort((a, b) => (a.round_order || 1) - (b.round_order || 1));
  const question = current?.questions?.[index];
  const isLast = current && index === current.questions.length - 1;

  if (current && question) return (
    <div className="tw text-gray-900"><div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg mt-6">
      <div className="flex justify-between items-center mb-6"><div><p className="text-sm text-gray-500">{company}</p><h2 className="text-2xl font-semibold">{current.title}</h2></div>
        <span className="font-mono text-xl">{pad(Math.floor(timeLeft / 60))}:{pad(timeLeft % 60)}</span></div>
      <p className="text-sm text-gray-500 mb-3">Question {index + 1} of {current.questions.length}</p>
      <p className="font-semibold text-lg mb-4">{question.text}</p>
      <div className="space-y-3">{question.options.map((opt) => <button key={opt.id} type="button" className={`block w-full border rounded py-3 px-4 text-left ${answers[question.id] === opt.id ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`} onClick={() => setAnswers((a) => ({ ...a, [question.id]: opt.id }))}>{opt.id.toUpperCase()}. {opt.text}</button>)}</div>
      <div className="mt-7 flex justify-between"><button type="button" disabled={index === 0} className="px-4 py-2 rounded bg-gray-200 disabled:opacity-50" onClick={() => setIndex((i) => Math.max(0, i - 1))}>Previous</button>
        {isLast ? <button type="button" disabled={submitting} className="px-5 py-2 rounded bg-green-600 text-white disabled:opacity-50" onClick={() => finish(current)}>{submitting ? 'Submitting…' : 'Submit Assessment'}</button> : <button type="button" className="px-5 py-2 rounded bg-blue-600 text-white" onClick={() => setIndex((i) => i + 1)}>Next</button>}</div>
    </div></div>
  );

  return <div className="tw text-gray-900"><div className="max-w-5xl mx-auto">
    <h1 className="text-3xl font-bold mb-8 border-b-2 border-blue-600 pb-2">Company Assessments & Recruitment Rounds</h1>
    {error && <p className="text-red-600 mb-4">{error}</p>}
    {loading && <p>Loading your applications…</p>}
    {!loading && !selectedApp && applications.length === 0 && <div className="bg-white p-6 rounded-lg shadow"><h2 className="text-xl font-semibold">No company applications found</h2><p className="mt-2 text-gray-600">Apply for an internship first. Its company recruitment rounds will appear here.</p></div>}
    {!loading && !selectedApp && applications.length > 0 && <div className="grid md:grid-cols-2 gap-5">{applications.map((app) => <button key={app.id} type="button" onClick={() => { setSelectedApp(app); setResult(null); }} className="text-left bg-white p-6 rounded-lg shadow hover:shadow-md border border-gray-100"><h2 className="text-xl font-semibold">{app.internship?.company || app.internship?.department || 'Company not specified'}</h2><p className="mt-1">{app.internship?.title}</p><p className="mt-3 text-sm text-gray-600">Application status: {app.status}</p><span className="inline-block mt-4 text-blue-600 font-semibold">View recruitment rounds →</span></button>)}</div>}
    {selectedApp && !result && <div className="bg-white p-6 rounded-lg shadow"><button type="button" className="text-blue-600 mb-5" onClick={() => setSelectedApp(null)}>← Back to my applications</button><h2 className="text-2xl font-bold">{company}</h2><p className="text-gray-600">{selectedApp.internship?.title}</p><h3 className="font-semibold text-lg mt-6 mb-3">Recruitment process</h3>
      <ol className="space-y-4">{ROUND_GUIDE.map((round, i) => { const test = orderedTests.find((t) => norm(t.round_name) === norm(round)); return <li key={round} className="flex gap-4 border rounded-lg p-4"><span className="flex-none w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">{i + 1}</span><div className="flex-1"><h4 className="font-semibold">{round}</h4>{test ? <><p className="text-sm text-gray-600">{test.title} · {test.duration_minutes} minutes · {test.question_count || test.questions?.length || 0} questions</p>{!norm(test.company) && <p className="text-xs text-amber-700 mt-1">General practice assessment — not an official {company} test</p>}<button type="button" disabled={starting} onClick={() => begin(test)} className="mt-3 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">{starting ? 'Starting…' : 'Start round'}</button></> : <p className="text-sm text-gray-500 mt-1">Not configured yet. The recruiter or portal administrator must add this company's round and questions.</p>}</div></li>; })}</ol>
      {companyTests.length === 0 && <p className="mt-5 p-4 bg-amber-50 text-amber-800 rounded">No assessments have been assigned to {company} yet. You can see the recruitment stages, but tests will become available once they are configured.</p>}
    </div>}
    {result && <div className="bg-white p-8 rounded-lg shadow"><h2 className="text-2xl font-bold">Assessment result</h2><p className="mt-3 text-lg">Score: <strong>{result.score} / {result.total}</strong></p><p className="text-gray-600">Percentage: {result.percentage ?? (result.total ? Math.round(result.score / result.total * 100) : 0)}%</p><div className="mt-5 space-y-3">{(result.details || []).map((d, i) => <div key={d.question_id ?? i} className="p-4 rounded border"><p className="font-medium">{d.question || d.text}</p><p className="text-sm mt-1">Your answer: {d.user_answer_text || d.your_answer_text || 'Not answered'}</p><p className="text-sm">Correct answer: {d.correct_answer_text}</p><p className={d.is_correct ? 'text-green-700' : 'text-red-700'}>{d.is_correct ? 'Correct' : 'Incorrect'}</p></div>)}</div><button type="button" className="mt-6 bg-blue-600 text-white px-5 py-2 rounded" onClick={() => setResult(null)}>Back to recruitment rounds</button></div>}
  </div></div>;
}
