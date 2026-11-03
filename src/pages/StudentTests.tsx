import { ASSESSMENT_GROUPS } from '../lib/monitorGrading'
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApiClient } from '../lib/apiClient';
import '../styles/test-platform.css';

const storageKey = 'physez-student-token';
const classCodeKey = 'physez-student-class-code';
type Assignment = { id: string; title: string; description: string | null; durationMinutes: number; calculatorAllowed: boolean; attempt: null | { id: string; submittedAt: string | null; score: number | null; maxScore: number } };

export default function StudentTests() {
  const { code = '' } = useParams(); const navigate = useNavigate();
  const { user, isLoading } = useAuth(); const { authFetch } = useApiClient();
  const accountMode = !code;
  const [token, setToken] = useState(() => localStorage.getItem(classCodeKey) === code.toUpperCase() ? localStorage.getItem(storageKey) || '' : '');
  const [identity, setIdentity] = useState({ lastName: '', firstName: '', group: '' });
  const [student, setStudent] = useState<{ lastName: string; firstName: string; group: string } | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const transport = accountMode ? authFetch : fetch;
  const load = async (activeToken = token) => {
    if (accountMode ? !user : !activeToken) return;
    try {
      const response = await transport('/api/student-platform', { headers: accountMode ? {} : { 'X-Student-Token': activeToken } });
      const payload = await response.json() as { student?: typeof student; assignments?: Assignment[]; error?: string };
      if (!response.ok) {
        if (!accountMode) { localStorage.removeItem(storageKey); localStorage.removeItem(classCodeKey); setToken(''); }
        return setError(payload.error || 'Не удалось загрузить задания.');
      }
      setStudent(payload.student || null); setAssignments(payload.assignments || []); setError('');
    } catch { setError('Не удалось загрузить задания. Проверьте соединение.'); }
  };
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [accountMode, user?.id, authFetch]); // eslint-disable-line react-hooks/exhaustive-deps
  const join = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/student-platform', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'join', inviteCode: code, ...identity }) });
      const payload = await response.json() as { token?: string; error?: string };
      if (!response.ok || !payload.token) throw Error(payload.error || 'Не удалось войти.');
      localStorage.setItem(storageKey, payload.token); localStorage.setItem(classCodeKey, code.toUpperCase()); setToken(payload.token); await load(payload.token);
    } catch(e) { setError(e instanceof Error ? e.message : 'Не удалось войти.'); } finally { setBusy(false); }
  };
  const start = async (assignmentId: string) => {
    setBusy(true); setError('');
    try {
      const response = await transport('/api/student-platform', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(accountMode ? {} : { 'X-Student-Token': token }) }, body: JSON.stringify({ action: 'start', assignmentId }) });
      const payload = await response.json() as { attempt?: { id: string }; error?: string };
      if (!response.ok || !payload.attempt) throw Error(payload.error || 'Не удалось открыть тест.');
      sessionStorage.setItem(`physez-attempt-${payload.attempt.id}`, JSON.stringify(payload));
      sessionStorage.setItem(`physez-attempt-auth-${payload.attempt.id}`, accountMode ? 'account' : 'guest');
      navigate(`/student/test/${payload.attempt.id}`);
    } catch(e) { setError(e instanceof Error ? e.message : 'Не удалось открыть тест.'); } finally { setBusy(false); }
  };
  if ((accountMode || !token) && isLoading) return <main className="tp-page"><p role="status">Загружаем задания…</p></main>;
  return <main className="tp-page"><div className="tp-shell tp-student-shell">
    <header className="tp-hero"><div><span>{accountMode ? 'Мои задания' : 'Класс преподавателя'}</span><h1>{student ? `${student.lastName} ${student.firstName}` : accountMode ? 'Работы преподавателя' : 'Войти в класс'}</h1><p>{student ? `${student.group} · здесь видны только назначенные вам тесты` : accountMode ? 'Задания появятся после назначения преподавателем.' : `Код подключения: ${code || 'не указан'}`}</p></div></header>
    {error && <div className="tp-alert" role="alert">{error} {accountMode && <Link to="/education">Учебный профиль</Link>}</div>}
    {!user && (accountMode || !token) ? <section className="tp-card"><Link to={"/sign-in?redirect=" + encodeURIComponent(code ? `/join/${code}` : "/student/tests")}>Войти или зарегистрироваться</Link></section> : !accountMode && !token ? <section className="tp-card tp-join"><h2>Представьтесь</h2><p>Вы вошли в аккаунт. Укажите ФИО и ОП для подключения к классу преподавателя.</p><form className="tp-form" onSubmit={join}><input value={identity.lastName} onChange={(e) => setIdentity({ ...identity, lastName: e.target.value })} placeholder="Фамилия" required/><input value={identity.firstName} onChange={(e) => setIdentity({ ...identity, firstName: e.target.value })} placeholder="Имя" required/><select value={identity.group} onChange={(e) => setIdentity({ ...identity, group: e.target.value })} required><option value="">Выберите ОП</option>{ASSESSMENT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}</select><button disabled={busy || !code}>{busy ? 'Подключаем…' : 'Войти в класс'}</button></form></section> : <section className="tp-section"><div className="tp-section-title"><div><span>Доступно сейчас</span><h2>Тесты</h2></div></div><div className="tp-test-list">{assignments.length ? assignments.map((item) => <article className="tp-student-test" key={item.id}><div><strong>{item.title}</strong><span>{item.description || `${item.durationMinutes} минут`}</span></div>{item.attempt?.submittedAt ? <em className="published">Сдано: {item.attempt.score}/{item.attempt.maxScore}</em> : <button disabled={busy} onClick={() => void start(item.id)}>{item.attempt ? 'Продолжить' : 'Начать'}</button>}</article>) : <div className="tp-empty">Преподаватель пока не назначил тесты.</div>}</div></section>}
  </div></main>;
}
