import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApiClient } from '../../lib/apiClient';
import '../../styles/test-platform.css';

type Test = { id: string; title: string; description: string | null; status: string; durationMinutes: number; calculatorAllowed: boolean; shuffleQuestions: boolean };
type Question = { id: string; orderNo: number; section: string | null; difficulty: string | null; kind: string; prompt: string; points: number; config: { options?: string[]; answer: string | string[] | number; unit?: string; tolerance?: number; explanation?: string } };
type TeacherClass = { id: string; name: string; inviteCode: string };
type Attempt = { id: string; lastName: string; firstName: string; groupName: string; variantCode: string; startedAt: string; submittedAt: string | null; score: number | null; maxScore: number; violations: unknown[] | null };
type AttemptDetail = { attempt: { id: string; variantCode: string; answers: Record<string, unknown>; variantData: Question[]; score: number | null; maxScore: number; submittedAt: string | null; violations: unknown[] | null }; student: { lastName: string; firstName: string; groupName: string }; testTitle: string };

export default function TeacherTestView() {
  const { id } = useParams(); const { authFetch } = useApiClient();
  const [test, setTest] = useState<Test | null>(null); const [questions, setQuestions] = useState<Question[]>([]); const [classes, setClasses] = useState<TeacherClass[]>([]); const [assigned, setAssigned] = useState<string[]>([]); const [error, setError] = useState('');
  const [attempts, setAttempts] = useState<Attempt[]>([]); const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const load = async () => {
    const [detailResponse, dashboardResponse] = await Promise.all([authFetch(`/api/teacher-platform?testId=${id}`), authFetch('/api/teacher-platform')]);
    const detail = await detailResponse.json() as { test?: Test; questions?: Question[]; assignments?: Array<{ classId: string }>; attempts?: Attempt[]; error?: string };
    const dashboard = await dashboardResponse.json() as { classes?: TeacherClass[] };
    if (!detailResponse.ok || !detail.test) return setError(detail.error || 'Тест не найден.');
    setTest(detail.test); setQuestions(detail.questions || []); setAssigned((detail.assignments || []).map((item) => item.classId)); setAttempts(detail.attempts || []); setClasses(dashboard.classes || []);
  };
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const action = async (name: 'publish' | 'assign', classId?: string) => {
    const response = await authFetch('/api/teacher-platform', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: name, testId: id, classId }) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) return setError(payload.error || 'Операция не выполнена.');
    await load();
  };
  const openAttempt = async (attemptId: string) => {
    const response = await authFetch(`/api/teacher-platform?attemptId=${attemptId}`);
    const payload = await response.json() as AttemptDetail & { error?: string };
    if (!response.ok) return setError(payload.error || 'Не удалось открыть результат.');
    setDetail(payload);
  };
  if (!test) return <main className="tp-page"><div className="tp-shell">{error || 'Загружаем тест…'}</div></main>;
  return <main className="tp-page"><div className="tp-shell">
    <header className="tp-hero"><div><span>{test.status === 'published' ? 'Опубликованный тест' : 'Предварительный просмотр'}</span><h1>{test.title}</h1><p>{test.description || `${questions.length} вопросов · ${test.durationMinutes} минут`}</p></div><Link to="/teacher/tests">Все тесты</Link></header>
    {error && <div className="tp-alert">{error}</div>}
    <section className="tp-publish-bar"><div><strong>{questions.length} вопросов</strong><span>{test.calculatorAllowed ? 'Калькулятор разрешён' : 'Без калькулятора'} · {test.shuffleQuestions ? 'порядок перемешивается' : 'фиксированный порядок'}</span></div>{test.status === 'draft' ? <button onClick={() => void action('publish')}>Опубликовать версию</button> : <strong className="tp-ready">Готов к назначению</strong>}</section>
    {test.status === 'published' && <section className="tp-section"><div className="tp-section-title"><div><span>Назначение</span><h2>Выберите классы</h2></div></div><div className="tp-class-grid">{classes.map((item) => <article className="tp-class" key={item.id}><div><strong>{item.name}</strong><span>Код {item.inviteCode}</span></div><button disabled={assigned.includes(item.id)} onClick={() => void action('assign', item.id)}>{assigned.includes(item.id) ? 'Назначен' : 'Назначить'}</button></article>)}</div></section>}
    {attempts.length > 0 && <section className="tp-section"><div className="tp-section-title"><div><span>Мониторинг</span><h2>Работы учеников</h2></div><small>{attempts.length}</small></div><div className="tp-attempts">{attempts.map((attempt) => <button type="button" key={attempt.id} onClick={() => void openAttempt(attempt.id)}><div><strong>{attempt.lastName} {attempt.firstName}</strong><span>{attempt.groupName} · вариант {attempt.variantCode}</span></div><div><small>{attempt.submittedAt ? 'Сдано' : 'Выполняет'}</small><strong>{attempt.score === null ? '—' : `${attempt.score}/${attempt.maxScore}`}</strong></div></button>)}</div></section>}
    <section className="tp-section"><div className="tp-section-title"><div><span>Содержимое</span><h2>Вопросы и ключи</h2></div></div><div className="tp-question-list">{questions.map((question) => <article key={question.id}><span>Вопрос {question.orderNo} · {question.kind} · {question.points} б.</span><h3>{question.prompt}</h3>{question.config.options && <div className="tp-options">{question.config.options.map((option) => <i key={option}>{option}</i>)}</div>}<div className="tp-answer"><small>Правильный ответ</small><strong>{Array.isArray(question.config.answer) ? question.config.answer.join(', ') : String(question.config.answer)} {question.config.unit || ''}</strong>{question.config.tolerance && <span>погрешность ±{question.config.tolerance}</span>}</div></article>)}</div></section>
    {detail && <div className="tp-detail-backdrop" onMouseDown={() => setDetail(null)}><section className="tp-detail" onMouseDown={(event) => event.stopPropagation()}><header><div><span>Подробный результат</span><h2>{detail.student.lastName} {detail.student.firstName}</h2><p>{detail.student.groupName} · вариант {detail.attempt.variantCode}</p></div><button onClick={() => setDetail(null)}>×</button></header><div className="tp-review">{detail.attempt.variantData.map((question) => { const answer = detail.attempt.answers[question.id]; const expected = question.config.answer; const normalizedAnswer = Array.isArray(answer) ? answer.join(', ') : String(answer ?? 'нет ответа'); return <article key={question.id}><span>Вопрос {question.orderNo}</span><h3>{question.prompt}</h3><div><small>Ответ ученика</small><strong>{normalizedAnswer}</strong></div><div className="correct"><small>Правильный ответ</small><strong>{Array.isArray(expected) ? expected.join(', ') : String(expected)} {question.config.unit || ''}</strong>{question.config.tolerance && <em>допуск ±{question.config.tolerance}</em>}</div>{question.config.explanation && <p>{question.config.explanation}</p>}</article>; })}</div></section></div>}
  </div></main>;
}
