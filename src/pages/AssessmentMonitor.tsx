import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ASSESSMENT_CATALOG } from '../lib/assessmentCatalog';
import type { MonitorCatalog } from './AssessmentMonitorIndex';
import { useAuth } from '../context/AuthContext';
import { useApiClient } from '../lib/apiClient';
import '../styles/assessment-monitor.css';
import type { PenaltySummary } from '../lib/assessmentPolicy';
import AssessmentSessionManager from '../components/AssessmentSessionManager';
import { DEFAULT_MONITOR_GROUPS, monitorGrade, normalizeMonitorGroup } from '../lib/monitorGrading';

type AttemptStatus = 'active' | 'submitted' | 'expired';
const EVENT_LABELS: Record<string, string> = {
  'tab-hidden': 'Страница скрыта (смена вкладки, сворачивание или блокировка экрана)',
  'fullscreen-exit': 'Выход из полноэкранного режима',
  copy: 'Попытка копирования',
  cut: 'Попытка вырезания текста',
  paste: 'Попытка вставки',
  'context-menu': 'Открытие контекстного меню',
  'print-shortcut': 'Попытка печати (Ctrl/Cmd + P)',
  'navigation-attempt': 'Попытка перехода на другую страницу',
};
type Student = { lastName: string; firstName: string; group: string; variantNumber?: number };
type Attempt = Partial<PenaltySummary> & {
  id: string;
  student: Student | null;
  variantCode: string;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  status: AttemptStatus;
  score: number | null;
  maxScore: number;
  correctness: boolean[] | null;
  answeredFields: number;
  totalFields: number;
  violationsCount: number;
  archived: boolean;
};
type MonitorResponse = { serverNow: string; attempts: Attempt[]; error?: string };
type Filter = 'all' | AttemptStatus;
type ReviewField = {
  taskId: string; taskTitle: string; fieldId: string; label: string; unit: string;
  submitted: string | number | null; expected: number | string; tolerance: string; correct: boolean; points?: number;
};
type ReviewTask = { id: string; order: number; title: string; text: string };
type AttemptDetail = Partial<PenaltySummary> & {
  id: string; student: Student | null; variantCode: string; startedAt: string; expiresAt: string;
  submittedAt: string | null; score: number | null; maxScore: number; archived: boolean;
  tasks: ReviewTask[]; fields: ReviewField[]; violations: Array<{ type: string; at: string }>;
};

const statusText: Record<AttemptStatus, string> = {
  active: 'Выполняет',
  submitted: 'Завершено',
  expired: 'Время истекло',
};

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date(value))
  : '—';

const formatRemaining = (expiresAt: string, now: number) => {
  const seconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

export default function AssessmentMonitor() {
  const { testId } = useParams();
  const test = ASSESSMENT_CATALOG.find(t => t.id === testId);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedKey = searchParams.get('period') ?? '';
  const endpoint = test?.endpoint ?? '';
  const { isLoading: authLoading } = useAuth();
  const { authFetch } = useApiClient();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(() => {
    try { return localStorage.getItem('assessment-monitor-auto-refresh') !== 'off'; }
    catch { return true; }
  });
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());
  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [waiverReason, setWaiverReason] = useState('');
  const [waiving, setWaiving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; period: string; student: Student } | null>(null);
  const [savingStudent, setSavingStudent] = useState(false);
  const [savingPoints, setSavingPoints] = useState(false);
  const [editError, setEditError] = useState('');
  const detailRequest = useRef(0);
  const listRequest = useRef(0);
  const [catalog, setCatalog] = useState<MonitorCatalog | null>(null);
  const [newPeriodOpen, setNewPeriodOpen] = useState(false);
  const [periodName, setPeriodName] = useState('');
  const [creatingPeriod, setCreatingPeriod] = useState(false);
  const period = selectedKey ? catalog?.periods.find(p => p.key === selectedKey && p.testId === testId) : catalog?.periods.find(p => p.testId === testId && p.active);
  const maxPoints = (period?.maxPointsTenths ?? (testId === 'midterm' ? 80 : 20)) / 10;
  const gradeFor = (attempt: Attempt) => monitorGrade(attempt.score, attempt.maxScore, maxPoints, attempt.finalPercent);
  const focusEditor = useCallback((node: HTMLFormElement | null) => {
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    node.querySelector('input')?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    try { localStorage.setItem('assessment-monitor-auto-refresh', autoRefresh ? 'on' : 'off'); }
    catch { /* Monitoring remains usable when browser storage is unavailable. */ }
  }, [autoRefresh]);

  const loadCatalog = useCallback(async () => {
    if (!endpoint) return;
    const response = await authFetch(`${endpoint}?view=catalog`);
    const payload = await response.json() as MonitorCatalog;
    if (!response.ok) throw new Error(payload.error || 'Не удалось загрузить периоды.');
    setCatalog(payload);
  }, [authFetch, endpoint]);

  useEffect(() => {
    if (authLoading || !endpoint) return;
    void loadCatalog().catch(e => setError(e instanceof Error ? e.message : 'Не удалось загрузить периоды.'));
  }, [authLoading, endpoint, loadCatalog]);

  const load = useCallback(async (silent = false) => {
    const request = ++listRequest.current;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      if (!endpoint) throw new Error('Контрольный срез не найден.');
      const response = await authFetch(`${endpoint}?view=monitor${selectedKey ? `&period=${encodeURIComponent(selectedKey)}` : ''}`);
      const payload = await response.json() as MonitorResponse;
      if (request !== listRequest.current) return false;
      if (!response.ok) throw new Error(payload.error || `Ошибка HTTP ${response.status}`);
      setAttempts(payload.attempts);
      setNow(Date.now());
      setLastUpdated(new Date());
      setError('');
      return true;
    } catch (reason) {
      if (request !== listRequest.current) return false;
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить мониторинг.');
      return false;
    } finally {
      if (request === listRequest.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [authFetch, endpoint, selectedKey]);

  useEffect(() => {
    if (authLoading) return;
    void load();
    return () => { listRequest.current += 1; };
  }, [authLoading, load]);

  const hasLoaded = lastUpdated !== null;
  useEffect(() => {
    if (authLoading || !autoRefresh || !hasLoaded || error) return;
    const refreshTimer = window.setInterval(() => void load(true), period?.active === false ? 30000 : 3000);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(refreshTimer);
      window.clearInterval(clockTimer);
    };
  }, [authLoading, autoRefresh, hasLoaded, error, load, period?.active]);

  const stats = useMemo(() => {
    const submitted = attempts.filter((attempt) => attempt.status === 'submitted');
    const scores = submitted.map((attempt) => attempt.score ?? 0);
    return {
      active: attempts.filter((attempt) => attempt.status === 'active').length,
      submitted: submitted.length,
      expired: attempts.filter((attempt) => attempt.status === 'expired').length,
      average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
    };
  }, [attempts]);

  const visibleAttempts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ru-RU');
    return attempts.filter((attempt) => {
      if (filter !== 'all' && attempt.status !== filter) return false;
      if (groupFilter && (normalizeMonitorGroup(attempt.student?.group ?? '') ?? attempt.student?.group) !== groupFilter) return false;
      if (!normalized) return true;
      const student = attempt.student;
      return [student?.lastName, student?.firstName, student?.group, student?.variantNumber, attempt.variantCode]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('ru-RU').includes(normalized));
    }).sort((a, b) => sort === 'name' ? `${a.student?.lastName ?? ''} ${a.student?.firstName ?? ''}`.localeCompare(`${b.student?.lastName ?? ''} ${b.student?.firstName ?? ''}`, 'ru') : sort === 'score' ? (b.finalPercent ?? (b.score ?? -1) / b.maxScore * 100) - (a.finalPercent ?? (a.score ?? -1) / a.maxScore * 100) : sort === 'events' ? b.violationsCount - a.violationsCount : Date.parse(b.startedAt) - Date.parse(a.startedAt));
  }, [attempts, filter, query, groupFilter, sort]);
  const groups = [...new Set(attempts.map(a => a.student?.group ? normalizeMonitorGroup(a.student.group) ?? a.student.group : null).filter((g): g is string => !!g))].sort((a, b) => a.localeCompare(b, 'ru'));
  const editableGroups = [...new Set([...DEFAULT_MONITOR_GROUPS, ...groups.map(normalizeMonitorGroup).filter((g): g is string => !!g)])].sort();

  const exportCsv = () => {
    const rows = visibleAttempts.map((attempt) => [
      attempt.student?.lastName ?? '', attempt.student?.firstName ?? '', attempt.student?.group ?? '',
      attempt.student?.variantNumber ?? attempt.variantCode, statusText[attempt.status], attempt.score ?? '', attempt.maxScore,
      attempt.answeredFields, attempt.totalFields, attempt.violationsCount,
      formatDate(attempt.startedAt), formatDate(attempt.submittedAt),
      attempt.finalPercent ?? (attempt.score === null ? '' : Math.round(attempt.score / attempt.maxScore * 10000) / 100), attempt.penaltyPoints ?? 0, attempt.waiverReason ?? '',
      gradeFor(attempt).points ?? '', maxPoints,
    ]);
    const header = ['Фамилия', 'Имя', 'Группа', 'Вариант', 'Статус', 'Верных задач', 'Всего задач', 'Заполнено', 'Полей', 'События', 'Начало', 'Сдано', 'Итог, %', 'Снижение, п. п.', 'Причина отмены штрафов', 'Оценка за работу', 'Максимальный балл'];
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => {
        const value = String(cell);
        const safe = typeof cell === 'string' && /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
        return `"${safe.replaceAll('"', '""')}"`;
      }).join(';'))
      .join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${testId}-${(period?.name ?? 'results').replace(/[^\p{L}\p{N}_-]/gu, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openDetail = async (attemptId: string) => {
    const requestId = ++detailRequest.current;
    setDetail(null);
    setWaiverReason('');
    setDetailLoading(true);
    setDetailError('');
    try {
      const response = await authFetch(`${endpoint}?view=attempt&attemptId=${encodeURIComponent(attemptId)}`);
      const payload = await response.json() as AttemptDetail & { error?: string };
      if (!response.ok) throw new Error(payload.error || `Ошибка HTTP ${response.status}`);
      if (requestId === detailRequest.current) setDetail(payload);
    } catch (reason) {
      if (requestId === detailRequest.current) setDetailError(reason instanceof Error ? reason.message : 'Не удалось открыть попытку.');
    } finally {
      if (requestId === detailRequest.current) setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    if (waiving) return;
    detailRequest.current++;
    setDetail(null);
    setDetailError('');
    setDetailLoading(false);
  };

  const deleteAttempt = async (attempt: Attempt) => {
    if (deletingId || !period) return;
    const name = attempt.student ? `${attempt.student.lastName} ${attempt.student.firstName}` : 'Без имени';
    if (!window.confirm(`Удалить работу?\n\n${name}\nГруппа: ${attempt.student?.group || 'не указана'}\nВариант: ${attempt.variantCode}\nПериод: ${period.name}\n\nОтветы, результат и журнал событий будут удалены безвозвратно. Профиль студента и другие работы сохранятся. После удаления студент сможет начать новую попытку в текущем периоде. При необходимости сначала сохраните результаты через «Экспорт CSV».`)) return;
    setDeletingId(attempt.id);
    try {
      const response = await authFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deleteAttempt', attemptId: attempt.id, period: period.key }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Не удалось удалить работу.');
      // Invalidate an in-flight poll so it cannot restore the deleted row.
      listRequest.current++;
      setAttempts(current => current.filter(item => item.id !== attempt.id));
      if (detail?.id === attempt.id) closeDetail();
      await Promise.all([load(true), loadCatalog()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось удалить работу.');
    } finally { setDeletingId(null); }
  };

  const waivePenalty = async () => {
    if (!detail || waiverReason.trim().length < 5) return;
    setWaiving(true);
    try {
      const response = await authFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'waivePenalty', attemptId: detail.id, reason: waiverReason }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Не удалось отменить штрафы.');
      await openDetail(detail.id);
      await load(true);
    } catch (reason) {
      setDetailError(reason instanceof Error ? reason.message : 'Не удалось отменить штрафы.');
    } finally { setWaiving(false); }
  };

  const createPeriod = async () => {
    if (!period || periodName.trim().length < 2) return;
    setCreatingPeriod(true);
    try {
      const response = await authFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'newPeriod', currentKey: period.key, name: periodName }) });
      const payload = await response.json() as { key: string; error?: string };
      if (!response.ok) throw new Error(payload.error || 'Не удалось создать период.');
      await loadCatalog();
      setAttempts([]);
      setSearchParams({ period: payload.key });
      setNewPeriodOpen(false);
      setPeriodName('');
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось создать период.'); }
    finally { setCreatingPeriod(false); }
  };

  const saveStudent = async () => {
    if (!editing || savingStudent) return;
    setSavingStudent(true);
    setEditError('');
    try {
      const response = await authFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'updateStudent', attemptId: editing.id, period: editing.period, student: editing.student }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Не удалось сохранить данные.');
      setEditing(null);
      await load(true);
      if (detail?.id === editing.id) await openDetail(editing.id);
    } catch (reason) { setEditError(reason instanceof Error ? reason.message : 'Не удалось сохранить данные.'); }
    finally { setSavingStudent(false); }
  };

  const saveMaxPoints = async (value: string) => {
    if (!period || savingPoints) return;
    setSavingPoints(true);
    try {
      const response = await authFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'setMaxPoints', period: period.key, maxPoints: Number(value.replace(',', '.')) }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Не удалось сохранить максимальный балл.');
      await loadCatalog();
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить максимальный балл.'); }
    finally { setSavingPoints(false); }
  };

  if (authLoading || (loading && !attempts.length)) {
    return <main className="monitor-page"><div className="monitor-loading">Загружаем мониторинг…</div></main>;
  }

  return (
    <main className="monitor-page monitor-page--compact">
      <div className="monitor-container">
        <header className="monitor-header">
          <div>
            <span className="monitor-kicker">Панель администратора</span>
            <h1>{test?.name ?? 'Мониторинг'} <span className="monitor-period-caption">{period?.name}</span></h1>
            <p>{!autoRefresh ? 'Автообновление выключено · обновляйте данные вручную' : period?.active === false ? 'Архивный период · обновление каждые 30 секунд' : 'Мониторинг · обновление каждые 3 секунды'}</p>
          </div>
          <div className="monitor-header-actions">
            <div className={`monitor-live${!autoRefresh || error ? ' paused' : ''}`}><i /> {error ? 'Нет связи' : autoRefresh ? 'Онлайн' : 'Пауза'} {lastUpdated && `· ${lastUpdated.toLocaleTimeString('ru-RU')}`}</div>
            <button type="button" className="monitor-auto-refresh" aria-pressed={autoRefresh} onClick={() => setAutoRefresh(value => !value)}>Автообновление: {autoRefresh ? 'вкл.' : 'выкл.'}</button>
            <button type="button" onClick={() => void load(true)} disabled={refreshing}>{refreshing ? 'Обновляем…' : 'Обновить'}</button>
            <Link to="/account">В кабинет</Link>
            <Link to="/admin/assessment-monitor">Выбрать срез</Link>
          </div>
        </header>

        {error && <div className="monitor-error">{error}</div>}

        <section className="monitor-stats" aria-label="Сводка">
          <article className="active"><span>Выполняют</span><strong>{stats.active}</strong></article>
          <article><span>Завершили</span><strong>{stats.submitted}</strong></article>
          <article><span>Средняя оценка</span><strong>{(() => { const grades = attempts.map(gradeFor).filter(g => g.points !== null); return grades.length ? (grades.reduce((sum, g) => sum + g.points!, 0) / grades.length).toFixed(1) : '—'; })()}<em>/{maxPoints}</em></strong></article>
          <article><span>Время истекло</span><strong>{stats.expired}</strong></article>
        </section>

        <div className="monitor-period-tools"><label>Период<select disabled={savingStudent || savingPoints} value={period?.key ?? ''} onChange={e => { setEditing(null); setAttempts([]); setSearchParams({ period: e.target.value }); }}>{catalog?.periods.filter(p => p.testId === testId).map(p => <option key={p.key} value={p.key}>{p.name}{p.active ? ' · текущий' : ' · архив'}</option>)}</select></label><button className="monitor-export" type="button" disabled={!catalog?.periodsAvailable || !period?.active || stats.active > 0} onClick={() => setNewPeriodOpen(true)}>Начать новый период</button><form className="monitor-grade-settings" onSubmit={e => { e.preventDefault(); void saveMaxPoints(String(new FormData(e.currentTarget).get('maxPoints'))); }}><label>Макс. балл<input key={`${period?.key}:${maxPoints}`} name="maxPoints" type="number" min="0.1" max="1000" step="0.1" required defaultValue={maxPoints} /></label><button type="submit" disabled={savingPoints || !period || !catalog?.periodsAvailable}>{savingPoints ? 'Сохраняем…' : 'Сохранить'}</button></form><span>{`${attempts.length} работ`}</span></div>
        {newPeriodOpen && <section className="monitor-new-period"><h2>Начать с чистого листа</h2><p>Период «{period?.name}» останется в архиве со всеми результатами, ответами и событиями. Новые участники будут проходить работу в новом периоде.</p><label>Название нового периода<input maxLength={120} value={periodName} onChange={e => setPeriodName(e.target.value)} placeholder="Например: 2027–2028"/></label><div><button className="monitor-export" disabled={creatingPeriod || periodName.trim().length < 2} onClick={() => void createPeriod()}>{creatingPeriod ? 'Создаём…' : 'Сохранить прежний период и открыть новый'}</button><button className="monitor-export" disabled={creatingPeriod} onClick={() => setNewPeriodOpen(false)}>Отмена</button></div></section>}

        {period && <AssessmentSessionManager key={period.key} endpoint={endpoint} period={period.key} testId={testId ?? 'mechanics'} active={period.active} />}

        <section className="monitor-panel">
          <div className="monitor-toolbar">
            <div className="monitor-filters">
              {(['all', 'active', 'submitted', 'expired'] as Filter[]).map((value) => (
                <button key={value} type="button" className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>
                  {value === 'all' ? 'Все' : statusText[value]}
                </button>
              ))}
            </div>
            <label className="monitor-search">
              <span>Поиск</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Фамилия, имя или вариант" />
            </label>
            <div className="monitor-table-tools"><label>Группа<select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}><option value="">Все группы</option>{groups.map(g => <option key={g}>{g}</option>)}</select></label><label>Порядок<select value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Новые сверху</option><option value="name">По фамилии</option><option value="score">По результату</option><option value="events">По событиям</option></select></label><span>Найдено: {visibleAttempts.length} из {attempts.length}</span></div>
            <button type="button" className="monitor-export" onClick={exportCsv} disabled={!visibleAttempts.length}>Экспорт CSV</button>
          </div>

          <div className="monitor-table-scroll"><table className="monitor-table"><thead><tr>{['Студент', 'Группа', 'Статус', testId === 'midterm' ? 'Задания' : 'Задачи', 'Оценка', 'Штраф', 'События', 'Сдано / осталось', 'Вариант', ''].map((label, i) => <th key={i}>{label}</th>)}</tr></thead><tbody>
            {visibleAttempts.map(attempt => <Fragment key={attempt.id}><tr>
              <td><button className="monitor-student-link" onClick={() => void openDetail(attempt.id)}>{attempt.student ? `${attempt.student.lastName} ${attempt.student.firstName}` : 'Без имени'}</button>{attempt.archived && <small className="monitor-retry-note">Архив</small>}</td>
              <td>{normalizeMonitorGroup(attempt.student?.group ?? '') ?? attempt.student?.group ?? '—'}</td>
              <td><span className={`monitor-status-dot ${attempt.status}`} role="img" aria-label={statusText[attempt.status]} title={statusText[attempt.status]} tabIndex={0}/></td>
              <td title={`Заполнено полей: ${attempt.answeredFields}/${attempt.totalFields}`}>{attempt.correctness ? `${attempt.correctness.filter(Boolean).length}/${attempt.correctness.length}` : '—'}</td>
              <td>{attempt.score === null ? '—' : <><strong>{gradeFor(attempt).points?.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<small className="monitor-grade-max"> / {maxPoints}</small></strong><small>{gradeFor(attempt).percent?.toLocaleString('ru-RU')}%</small></>}</td>
              <td>{attempt.penaltyPoints ? `−${attempt.penaltyPoints}` : '—'}</td>
              <td className={attempt.violationsCount ? 'monitor-event-warning' : ''}>{attempt.violationsCount}</td>
              <td>{attempt.status === 'active' ? formatRemaining(attempt.expiresAt, now) : formatDate(attempt.submittedAt)}</td>
              <td className="monitor-variant-cell" title={`Код работы: ${attempt.variantCode}`}>{attempt.student?.variantNumber ?? attempt.variantCode}</td>
              <td><div className="monitor-row-actions">
                <button type="button" className="monitor-row-open" title="Разбор работы" onClick={() => void openDetail(attempt.id)} aria-label={`Разобрать работу ${attempt.student?.lastName ?? attempt.variantCode}`}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9l4 4v3M13 3v5h5M7 8h3M7 12h3M7 16h2"/><circle cx="16" cy="16" r="4"/><path d="m19 19 3 3"/></svg>
                </button>
                <button type="button" className="monitor-row-edit" title="Изменить ФИО и группу" disabled={savingStudent || !period} onClick={() => { setEditError(''); setEditing({ id: attempt.id, period: period!.key, student: { lastName: attempt.student?.lastName ?? '', firstName: attempt.student?.firstName ?? '', group: normalizeMonitorGroup(attempt.student?.group ?? '') ?? '' } }); }} aria-label={`Изменить данные ${attempt.student?.lastName ?? attempt.variantCode}`}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 3 5 5L8 21H3v-5L16 3ZM13 6l5 5"/></svg>
                </button>
                <button type="button" className="monitor-row-delete" title="Удалить работу" disabled={deletingId !== null || !period} aria-busy={deletingId === attempt.id} onClick={() => void deleteAttempt(attempt)} aria-label={`Удалить работу ${attempt.student ? `${attempt.student.lastName} ${attempt.student.firstName}` : attempt.variantCode}`}>
                  {deletingId === attempt.id ? '…' : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>}
                </button>
              </div></td>
            </tr>
              {editing?.id === attempt.id && <tr className="monitor-student-editor-row"><td colSpan={10}>
                <form ref={focusEditor} className="monitor-student-editor" onSubmit={e => { e.preventDefault(); void saveStudent(); }} aria-label={`Редактирование данных ${attempt.student?.lastName ?? 'студента'}`}>
                  {(['lastName', 'firstName'] as const).map(key => <label key={key}>{key === 'lastName' ? 'Фамилия' : 'Имя'}<input disabled={savingStudent} required minLength={2} maxLength={60} value={editing.student[key]} onChange={e => setEditing({ ...editing, student: { ...editing.student, [key]: e.target.value } })}/></label>)}
                  <label className="monitor-editor-group">Группа<select disabled={savingStudent} required value={editing.student.group} onChange={e => setEditing({ ...editing, student: { ...editing.student, group: e.target.value } })}><option value="" disabled>Выберите группу</option>{editableGroups.map(group => <option key={group}>{group}</option>)}</select></label>
                  <button type="submit" disabled={savingStudent}>{savingStudent ? 'Сохраняем…' : 'Сохранить'}</button><button type="button" disabled={savingStudent} onClick={() => setEditing(null)}>Отмена</button>
                  {editError && <p role="alert">{editError}</p>}
                </form>
              </td></tr>}
            </Fragment>)}
            {!visibleAttempts.length && <tr><td colSpan={10} className="monitor-empty">По выбранному фильтру работ нет.</td></tr>}
          </tbody></table></div>
        </section>
      </div>

      {(detailLoading || detail || detailError) && (
        <div className="monitor-detail-backdrop" role="presentation" onMouseDown={closeDetail}>
          <section className="monitor-detail" role="dialog" aria-modal="true" aria-label="Подробности попытки" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>Разбор попытки</span>
                <h2>{detail?.student ? `${detail.student.lastName} ${detail.student.firstName}` : 'Загрузка…'}</h2>
                {detail && <p>{detail.student?.group || 'Группа не указана'} · вариант {detail.student?.variantNumber ?? detail.variantCode}</p>}
              </div>
              <button className="monitor-detail-close" type="button" disabled={waiving} onClick={closeDetail} aria-label="Закрыть"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 4L14 14M14 4L4 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
            </header>
            {detailLoading && <div className="monitor-detail-state">Загружаем точный вариант и ответы…</div>}
            {detailError && <div className="monitor-error">{detailError}</div>}
            {detail && !detailLoading && (
              <>
                <div className="monitor-detail-summary">
                  <div><span>Начало</span><strong>{formatDate(detail.startedAt)}</strong></div>
                  <div><span>Сдача</span><strong>{formatDate(detail.submittedAt)}</strong></div>
                  <div><span>Результат</span><strong>{detail.score === null ? 'Ещё выполняет' : `${detail.score}/${detail.maxScore}`}</strong></div>
                  <div><span>События</span><strong>{detail.violations.length}</strong></div>
                </div>
                <section className="monitor-policy-note">
                  {detail.policyVersion === 1 ? <>
                    <p>Итог: <b>{detail.finalPercent === null ? 'После сдачи' : `${detail.finalPercent}%`}</b>. Снижение: <b>{detail.penaltyPoints ?? 0} п. п.</b> из 10.</p>
                    <p>Первый эпизод каждой категории — предупреждение; повторно: скрытие страницы / выход из полного экрана −1 п. п., копирование / вырезание / вставка / печать −2 п. п. Связанные сигналы за 10 секунд объединяются. Выделение текста и скриншоты не штрафуются автоматически.</p>
                    {detail.waiverReason ? <p>Штрафы отменены: {detail.waiverReason}</p> : <><label>Причина отмены штрафов<input value={waiverReason} onChange={e => setWaiverReason(e.target.value)} maxLength={300} placeholder="Например: технический сбой устройства"/></label><button type="button" disabled={waiving || waiverReason.trim().length < 5} onClick={() => void waivePenalty()}>{waiving ? 'Сохраняем…' : 'Отменить штрафы за эту попытку'}</button></>}
                  </> : <p>Попытка начата до введения штрафов. Оценка не снижается.</p>}
                </section>
                <div className="monitor-review-tasks">
                  {detail.tasks.map((task) => (
                    <article key={task.id}>
                      <span>{task.order > 5 && testId === 'midterm' ? `Теория ${task.order - 5}` : `Задача ${task.order}`}</span>
                      <h3>{task.title}</h3>
                      <p>{task.text}</p>
                      <div className="monitor-review-fields">
                        {detail.fields.filter((field) => field.taskId === task.id).map((field) => (
                          <div className={field.correct ? 'correct' : 'incorrect'} key={field.fieldId}>
                            <span>{field.label}</span>
                            <strong>Студент: {field.submitted === null || field.submitted === '' ? 'нет ответа' : `${field.submitted}${field.unit ? ` ${field.unit}` : ''}`}</strong>
                            <small>Правильный: {field.expected}{field.unit ? ` ${field.unit}` : ''} · допуск {field.tolerance}</small>
                            {field.points !== undefined && <small>Баллы: {field.correct ? field.points : 0} / {field.points}</small>}
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
                <section className="monitor-violations">
                  <h3>Журнал событий</h3>
                  {detail.violations.length ? detail.violations.map((violation, index) => (
                    <div key={`${violation.at}-${index}`}><strong>{EVENT_LABELS[violation.type] ?? `Другое событие: ${violation.type}`}</strong><span>{formatDate(violation.at)}</span></div>
                  )) : <p>Нарушений не зафиксировано.</p>}
                </section>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
