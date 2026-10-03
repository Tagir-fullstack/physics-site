import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApiClient } from '../../lib/apiClient';
import '../../styles/test-platform.css';

type TeacherClass = { id: string; name: string; subject: string | null; inviteCode: string };
type TeacherTest = { id: string; title: string; description: string | null; status: string; durationMinutes: number; sourceFilename: string | null; createdAt: string };
type Dashboard = { classes: TeacherClass[]; tests: TeacherTest[]; studentCounts: Array<{ classId: string; value: number }>; error?: string };

export default function TeacherTests() {
  const { authFetch } = useApiClient();
  const navigate = useNavigate();
  const [data, setData] = useState<Dashboard>({ classes: [], tests: [], studentCounts: [] });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('Физика');
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    setBusy(true);
    try {
      const response = await authFetch('/api/teacher-platform');
      const payload = await response.json() as Dashboard;
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setData(payload); setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось загрузить кабинет.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createClass = async (event: FormEvent) => {
    event.preventDefault();
    const response = await authFetch('/api/teacher-platform', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create-class', name: className, subject }) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) return setError(payload.error || 'Не удалось создать класс.');
    setClassName(''); await load();
  };
  const downloadTemplate = async () => {
    const response = await authFetch('/api/test-template');
    if (!response.ok) return setError((await response.json() as { error?: string }).error || 'Не удалось скачать шаблон.');
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'physez-test-template.xlsx'; anchor.click(); URL.revokeObjectURL(url);
  };
  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return setError('Выберите заполненный файл .xlsx.');
    setBusy(true);
    const form = new FormData(); form.append('file', file);
    try {
      const response = await authFetch('/api/test-upload', { method: 'POST', body: form });
      const payload = await response.json() as { id?: string; error?: string };
      if (!response.ok || !payload.id) throw new Error(payload.error || 'Не удалось загрузить тест.');
      navigate(`/teacher/tests/${payload.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Ошибка загрузки.'); setBusy(false); }
  };

  return <main className="tp-page"><div className="tp-shell">
    <header className="tp-hero"><div><span>PHYSEZ · PRO</span><h1>Мои тесты и классы</h1><p>Создавайте контрольные по шаблону, назначайте группам и следите за результатами.</p></div><Link to="/teacher">В кабинет учителя</Link></header>
    {error && <div className="tp-alert">{error}</div>}
    <section className="tp-grid-two">
      <article className="tp-card"><span className="tp-number">01</span><h2>Создайте класс</h2><p>Ученики войдут по короткому коду без долгой регистрации.</p>
        <form className="tp-form" onSubmit={createClass}><input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Например, ФИЗ-064" required/><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Предмет"/><button>Создать класс</button></form>
      </article>
      <article className="tp-card"><span className="tp-number">02</span><h2>Загрузите тест</h2><p>Скачайте шаблон, заполните вопросы и загрузите файл обратно.</p>
        <div className="tp-actions"><button type="button" className="secondary" onClick={() => void downloadTemplate()}>Скачать шаблон XLSX</button></div>
        <form className="tp-form" onSubmit={upload}><input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} required/><button disabled={busy}>{busy ? 'Обрабатываем…' : 'Проверить и загрузить'}</button></form>
      </article>
    </section>
    <section className="tp-section"><div className="tp-section-title"><div><span>Классы</span><h2>Коды подключения</h2></div><small>{data.classes.length}</small></div>
      <div className="tp-class-grid">{data.classes.length ? data.classes.map((item) => <article className="tp-class" key={item.id}><div><strong>{item.name}</strong><span>{item.subject || 'Без предмета'} · {data.studentCounts.find((count) => count.classId === item.id)?.value || 0} учеников</span></div><button type="button" title="Скопировать ссылку для учеников" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/join/${item.inviteCode}`)}><small>Код · копировать ссылку</small>{item.inviteCode}</button></article>) : <div className="tp-empty">Создайте первый класс.</div>}</div>
    </section>
    <section className="tp-section"><div className="tp-section-title"><div><span>Библиотека</span><h2>Тесты</h2></div><small>{data.tests.length}</small></div>
      <div className="tp-test-list">{data.tests.length ? data.tests.map((test) => <Link to={`/teacher/tests/${test.id}`} key={test.id}><div><strong>{test.title}</strong><span>{test.sourceFilename || 'Создан на сайте'} · {test.durationMinutes} мин</span></div><em className={test.status}>{test.status === 'published' ? 'Опубликован' : 'Черновик'}</em></Link>) : <div className="tp-empty">Загрузите первый тест по шаблону.</div>}</div>
    </section>
  </div></main>;
}
