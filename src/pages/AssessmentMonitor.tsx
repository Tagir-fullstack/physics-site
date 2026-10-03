import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApiClient } from '../lib/apiClient';
import '../styles/assessment-monitor.css';

type AttemptStatus = 'active' | 'submitted' | 'expired';
type Student = { lastName: string; firstName: string; group: string };
type Attempt = {
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
  submitted: string | number | null; expected: number; tolerance: string; correct: boolean;
};
type ReviewTask = { id: string; order: number; title: string; text: string };
type AttemptDetail = {
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
  const { isLoading: authLoading } = useAuth();
  const { authFetch } = useApiClient();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());
  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const response = await authFetch('/api/mechanics-assessment?view=monitor');
      const payload = await response.json() as MonitorResponse;
      if (!response.ok) throw new Error(payload.error || `Ошибка HTTP ${response.status}`);
      setAttempts(payload.attempts);
      setLastUpdated(new Date());
      setError('');
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить мониторинг.');
      return false;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (authLoading) return;
    let refreshTimer = 0;
    let disposed = false;
    void load().then((allowed) => {
      if (allowed && !disposed) refreshTimer = window.setInterval(() => void load(true), 3000);
    });
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      disposed = true;
      if (refreshTimer) window.clearInterval(refreshTimer);
      window.clearInterval(clockTimer);
    };
  }, [authLoading, load]);

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
      if (!normalized) return true;
      const student = attempt.student;
      return [student?.lastName, student?.firstName, student?.group, attempt.variantCode]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('ru-RU').includes(normalized));
    });
  }, [attempts, filter, query]);

  const exportCsv = () => {
    const rows = visibleAttempts.map((attempt) => [
      attempt.student?.lastName ?? '', attempt.student?.firstName ?? '', attempt.student?.group ?? '',
      attempt.variantCode, statusText[attempt.status], attempt.score ?? '', attempt.maxScore,
      attempt.answeredFields, attempt.totalFields, attempt.violationsCount,
      formatDate(attempt.startedAt), formatDate(attempt.submittedAt),
    ]);
    const header = ['Фамилия', 'Имя', 'Группа', 'Вариант', 'Статус', 'Балл', 'Максимум', 'Заполнено', 'Полей', 'События', 'Начало', 'Сдано'];
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';'))
      .join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `mechanics-results-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openDetail = async (attemptId: string) => {
    setDetailLoading(true);
    setDetailError('');
    try {
      const response = await authFetch(`/api/mechanics-assessment?view=attempt&attemptId=${encodeURIComponent(attemptId)}`);
      const payload = await response.json() as AttemptDetail & { error?: string };
      if (!response.ok) throw new Error(payload.error || `Ошибка HTTP ${response.status}`);
      setDetail(payload);
    } catch (reason) {
      setDetailError(reason instanceof Error ? reason.message : 'Не удалось открыть попытку.');
    } finally {
      setDetailLoading(false);
    }
  };

  if (authLoading || (loading && !attempts.length)) {
    return <main className="monitor-page"><div className="monitor-loading">Загружаем мониторинг…</div></main>;
  }

  return (
    <main className="monitor-page">
      <div className="monitor-container">
        <header className="monitor-header">
          <div>
            <span className="monitor-kicker">Панель администратора</span>
            <h1>Мониторинг контрольного среза</h1>
            <p>Статусы и заполненность обновляются автоматически каждые 3 секунды.</p>
          </div>
          <div className="monitor-header-actions">
            <div className="monitor-live"><i /> Онлайн {lastUpdated && `· ${lastUpdated.toLocaleTimeString('ru-RU')}`}</div>
            <button type="button" onClick={() => void load(true)} disabled={refreshing}>{refreshing ? 'Обновляем…' : 'Обновить'}</button>
            <Link to="/account">В кабинет</Link>
          </div>
        </header>

        {error && <div className="monitor-error">{error}</div>}

        <section className="monitor-stats" aria-label="Сводка">
          <article className="active"><span>Сейчас выполняют</span><strong>{stats.active}</strong><small>активных работ</small></article>
          <article><span>Завершили</span><strong>{stats.submitted}</strong><small>сохранённых результатов</small></article>
          <article><span>Средний результат</span><strong>{stats.average.toFixed(1)}<em>/3</em></strong><small>по завершённым работам</small></article>
          <article><span>Время истекло</span><strong>{stats.expired}</strong><small>без отправки</small></article>
        </section>

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
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Фамилия, группа или вариант" />
            </label>
            <button type="button" className="monitor-export" onClick={exportCsv} disabled={!visibleAttempts.length}>Экспорт CSV</button>
          </div>

          <div className="monitor-list">
            {visibleAttempts.length === 0 ? (
              <div className="monitor-empty">По выбранному фильтру попыток пока нет.</div>
            ) : visibleAttempts.map((attempt) => {
              const student = attempt.student;
              const progress = attempt.totalFields ? (attempt.answeredFields / attempt.totalFields) * 100 : 0;
              return (
                <article
                  className={`monitor-attempt ${attempt.status}`}
                  key={attempt.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => void openDetail(attempt.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') void openDetail(attempt.id);
                  }}
                  aria-label={`Открыть работу ${student ? `${student.lastName} ${student.firstName}` : attempt.variantCode}`}
                >
                  <div className="monitor-status-column">
                    <span className={`monitor-status ${attempt.status}`}>{statusText[attempt.status]}</span>
                    {attempt.archived && <small>архив</small>}
                  </div>
                  <div className="monitor-student">
                    <strong>{student ? `${student.lastName} ${student.firstName}` : 'Без данных студента'}</strong>
                    <span>{student?.group || 'Группа не указана'} · вариант {attempt.variantCode}</span>
                  </div>
                  <div className="monitor-progress">
                    <div><span>Заполнено</span><strong>{attempt.answeredFields}/{attempt.totalFields}</strong></div>
                    <div className="monitor-progress-track"><i style={{ width: `${progress}%` }} /></div>
                  </div>
                  <div className="monitor-time">
                    <span>{attempt.status === 'active' ? 'Осталось' : 'Сдано'}</span>
                    <strong>{attempt.status === 'active' ? formatRemaining(attempt.expiresAt, now) : formatDate(attempt.submittedAt)}</strong>
                  </div>
                  <div className="monitor-score">
                    <span>Результат</span>
                    <strong>{attempt.score === null ? '—' : `${attempt.score}/${attempt.maxScore}`}</strong>
                    {attempt.correctness && <small>{attempt.correctness.map((correct) => correct ? '●' : '○').join(' ')}</small>}
                  </div>
                  <div className="monitor-events">
                    <span>События</span>
                    <strong className={attempt.violationsCount ? 'warning' : ''}>{attempt.violationsCount}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {(detailLoading || detail || detailError) && (
        <div className="monitor-detail-backdrop" role="presentation" onMouseDown={() => !detailLoading && (setDetail(null), setDetailError(''))}>
          <section className="monitor-detail" role="dialog" aria-modal="true" aria-label="Подробности попытки" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>Разбор попытки</span>
                <h2>{detail?.student ? `${detail.student.lastName} ${detail.student.firstName}` : 'Загрузка…'}</h2>
                {detail && <p>{detail.student?.group || 'Группа не указана'} · вариант {detail.variantCode}</p>}
              </div>
              <button type="button" onClick={() => { setDetail(null); setDetailError(''); }} aria-label="Закрыть">×</button>
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
                <div className="monitor-review-tasks">
                  {detail.tasks.map((task) => (
                    <article key={task.id}>
                      <span>Задача {task.order}</span>
                      <h3>{task.title}</h3>
                      <p>{task.text}</p>
                      <div className="monitor-review-fields">
                        {detail.fields.filter((field) => field.taskId === task.id).map((field) => (
                          <div className={field.correct ? 'correct' : 'incorrect'} key={field.fieldId}>
                            <span>{field.label}</span>
                            <strong>Студент: {field.submitted === null || field.submitted === '' ? 'нет ответа' : `${field.submitted}${field.unit ? ` ${field.unit}` : ''}`}</strong>
                            <small>Правильный: {field.expected}{field.unit ? ` ${field.unit}` : ''} · допуск {field.tolerance}</small>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
                <section className="monitor-violations">
                  <h3>Журнал событий</h3>
                  {detail.violations.length ? detail.violations.map((violation, index) => (
                    <div key={`${violation.at}-${index}`}><strong>{violation.type}</strong><span>{formatDate(violation.at)}</span></div>
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
