import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/test-platform.css';

const storageKey = 'physez-student-token';
type Question = { id: string; orderNo: number; kind: string; prompt: string; points: number; config: { options?: string[]; unit?: string } };
type AttemptPayload = { attempt: { id: string; variantCode: string; expiresAt: string; submittedAt: string | null; answers: Record<string, string | string[] | number>; questions: Question[] }; test: { title: string; calculatorAllowed: boolean } };

export default function StudentTestRunner() {
  const { attemptId = '' } = useParams(); const navigate = useNavigate();
  const [payload] = useState<AttemptPayload | null>(() => { try { return JSON.parse(sessionStorage.getItem(`physez-attempt-${attemptId}`) || 'null') as AttemptPayload | null; } catch { return null; } });
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>(payload?.attempt.answers || {}); const [error, setError] = useState(''); const [result, setResult] = useState<{ score: number; maxScore: number } | null>(null); const [now, setNow] = useState(0);
  const token = localStorage.getItem(storageKey) || '';
  useEffect(() => { const update = () => setNow(Date.now()); const first = window.setTimeout(update, 0); const timer = window.setInterval(update, 1000); return () => { window.clearTimeout(first); window.clearInterval(timer); }; }, []);
  useEffect(() => { if (!payload) navigate('/'); }, [payload, navigate]);
  useEffect(() => {
    if (!payload) return; const timer = window.setTimeout(() => { void fetch('/api/student-platform', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Student-Token': token }, body: JSON.stringify({ action: 'progress', attemptId, answers }) }); }, 700);
    return () => window.clearTimeout(timer);
  }, [answers, attemptId, payload, token]);
  const remaining = useMemo(() => payload && now ? Math.max(0, Math.ceil((new Date(payload.attempt.expiresAt).getTime() - now) / 1000)) : null, [payload, now]);
  if (!payload) return null;
  const setAnswer = (id: string, value: string | string[]) => setAnswers((current) => ({ ...current, [id]: value }));
  const submit = async () => {
    const response = await fetch('/api/student-platform', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Student-Token': token }, body: JSON.stringify({ action: 'submit', attemptId, answers }) });
    const data = await response.json() as { score?: number; maxScore?: number; error?: string };
    if (!response.ok || data.score === undefined || data.maxScore === undefined) return setError(data.error || 'Не удалось сдать работу.');
    setResult({ score: data.score, maxScore: data.maxScore }); sessionStorage.removeItem(`physez-attempt-${attemptId}`);
  };
  if (result) return <main className="tp-page"><div className="tp-result"><span>Работа сохранена</span><h1>{result.score}/{result.maxScore}</h1><p>Ответы и точный вариант доступны преподавателю.</p><button onClick={() => navigate(-1)}>Вернуться к тестам</button></div></main>;
  return <main className="tp-page"><div className="tp-shell">
    <header className="tp-runner-header"><div><span>Вариант {payload.attempt.variantCode}</span><h1>{payload.test.title}</h1></div><strong>{remaining === null ? '--:--' : `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`}</strong></header>
    {error && <div className="tp-alert">{error}</div>}
    <div className="tp-question-list tp-runner">{payload.attempt.questions.map((question) => <article key={question.id}><span>Вопрос {question.orderNo} · {question.points} б.</span><h3>{question.prompt}</h3>
      {question.kind === 'single' && <div className="tp-choice">{question.config.options?.map((option) => <label key={option}><input type="radio" name={question.id} checked={answers[question.id] === option} onChange={() => setAnswer(question.id, option)}/><span>{option}</span></label>)}</div>}
      {question.kind === 'multiple' && <div className="tp-choice">{question.config.options?.map((option) => { const selected = Array.isArray(answers[question.id]) ? answers[question.id] as string[] : []; return <label key={option}><input type="checkbox" checked={selected.includes(option)} onChange={(e) => setAnswer(question.id, e.target.checked ? [...selected, option] : selected.filter((item) => item !== option))}/><span>{option}</span></label>; })}</div>}
      {(question.kind === 'number' || question.kind === 'text') && <label className="tp-open-answer"><input inputMode={question.kind === 'number' ? 'decimal' : 'text'} value={String(answers[question.id] ?? '')} onChange={(e) => setAnswer(question.id, e.target.value)} placeholder="Введите ответ"/><span>{question.config.unit || ''}</span></label>}
    </article>)}</div>
    <div className="tp-submit"><button onClick={() => void submit()}>Сдать работу</button></div>
  </div></main>;
}
