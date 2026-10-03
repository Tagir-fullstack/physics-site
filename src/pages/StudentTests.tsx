import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/test-platform.css';

const storageKey = 'physez-student-token';
const classCodeKey = 'physez-student-class-code';
type Assignment = { id: string; title: string; description: string | null; durationMinutes: number; calculatorAllowed: boolean; attempt: null | { id: string; submittedAt: string | null; score: number | null; maxScore: number } };

export default function StudentTests() {
  const { code = '' } = useParams(); const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem(classCodeKey) === code.toUpperCase() ? localStorage.getItem(storageKey) || '' : '');
  const [identity, setIdentity] = useState({ lastName: '', firstName: '', group: '' });
  const [student, setStudent] = useState<{ lastName: string; firstName: string; group: string } | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const load = async (activeToken = token) => {
    if (!activeToken) return;
    const response = await fetch('/api/student-platform', { headers: { 'X-Student-Token': activeToken } });
    const payload = await response.json() as { student?: typeof student; assignments?: Assignment[]; error?: string };
    if (!response.ok) { localStorage.removeItem(storageKey); localStorage.removeItem(classCodeKey); setToken(''); return setError(payload.error || 'Войдите в класс заново.'); }
    setStudent(payload.student || null); setAssignments(payload.assignments || []); setError('');
  };
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const join = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    const response = await fetch('/api/student-platform', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join', inviteCode: code, ...identity }) });
    const payload = await response.json() as { token?: string; error?: string };
    setBusy(false); if (!response.ok || !payload.token) return setError(payload.error || 'Не удалось войти.');
    localStorage.setItem(storageKey, payload.token); localStorage.setItem(classCodeKey, code.toUpperCase()); setToken(payload.token); await load(payload.token);
  };
  const start = async (assignmentId: string) => {
    setBusy(true); const response = await fetch('/api/student-platform', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Student-Token': token }, body: JSON.stringify({ action: 'start', assignmentId }) });
    const payload = await response.json() as { attempt?: { id: string }; error?: string }; setBusy(false);
    if (!response.ok || !payload.attempt) return setError(payload.error || 'Не удалось открыть тест.');
    sessionStorage.setItem(`physez-attempt-${payload.attempt.id}`, JSON.stringify(payload)); navigate(`/student/test/${payload.attempt.id}`);
  };
  return <main className="tp-page"><div className="tp-shell tp-student-shell">
    <header className="tp-hero"><div><span>Класс преподавателя</span><h1>{student ? `${student.lastName} ${student.firstName}` : 'Войти в класс'}</h1><p>{student ? `${student.group} · здесь видны только тесты вашего преподавателя` : `Код подключения: ${code || 'не указан'}`}</p></div></header>
    {error && <div className="tp-alert">{error}</div>}
    {!token ? <section className="tp-card tp-join"><h2>Представьтесь</h2><p>Регистрация и электронная почта не нужны.</p><form className="tp-form" onSubmit={join}><input value={identity.lastName} onChange={(e) => setIdentity({ ...identity, lastName: e.target.value })} placeholder="Фамилия" required/><input value={identity.firstName} onChange={(e) => setIdentity({ ...identity, firstName: e.target.value })} placeholder="Имя" required/><input value={identity.group} onChange={(e) => setIdentity({ ...identity, group: e.target.value })} placeholder="Группа" required/><button disabled={busy || !code}>{busy ? 'Подключаем…' : 'Войти в класс'}</button></form></section> : <section className="tp-section"><div className="tp-section-title"><div><span>Доступно сейчас</span><h2>Тесты</h2></div></div><div className="tp-test-list">{assignments.length ? assignments.map((item) => <article className="tp-student-test" key={item.id}><div><strong>{item.title}</strong><span>{item.description || `${item.durationMinutes} минут`}</span></div>{item.attempt?.submittedAt ? <em className="published">Сдано: {item.attempt.score}/{item.attempt.maxScore}</em> : <button disabled={busy} onClick={() => void start(item.id)}>{item.attempt ? 'Продолжить' : 'Начать'}</button>}</article>) : <div className="tp-empty">Преподаватель пока не назначил тесты.</div>}</div></section>}
  </div></main>;
}
