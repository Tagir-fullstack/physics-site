import { SignInButton } from '@clerk/clerk-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuizMode } from '../context/QuizModeContext';
import { useApiClient } from '../lib/apiClient';
import '../styles/mechanics-assessment.css';

type Field = { id: string; label: string; unit: string; step: string };
type Task = {
  id: string;
  order: number;
  title: string;
  text: string;
  fields: Field[];
};
type Answers = Record<string, Record<string, string>>;
type ReadyResponse = { status: 'ready' };
type ActiveResponse = {
  status: 'active';
  attemptId: string;
  variantCode: string;
  startedAt: string;
  expiresAt: string;
  serverNow: string;
  tasks: Task[];
  violationsCount: number;
};
type SubmittedResponse = {
  status: 'submitted';
  attemptId: string;
  variantCode: string;
  score: number;
  maxScore: number;
  correctness: boolean[];
  submittedAt: string;
  violationsCount: number;
  sources: string[];
  late?: boolean;
};
type AssessmentResponse = ReadyResponse | ActiveResponse | SubmittedResponse;

async function readAssessmentResponse(response: Response): Promise<AssessmentResponse> {
  const text = await response.text();
  let payload: (AssessmentResponse & { error?: string }) | null = null;
  if (text.trim()) {
    try {
      payload = JSON.parse(text) as AssessmentResponse & { error?: string };
    } catch {
      throw new Error(`Сервер вернул некорректный ответ (HTTP ${response.status}). Обновите страницу.`);
    }
  }
  if (!response.ok) {
    throw new Error(payload?.error || `Сервис контрольного среза временно недоступен (HTTP ${response.status}).`);
  }
  if (!payload) {
    throw new Error(`Сервер не вернул данные (HTTP ${response.status}). Обновите страницу.`);
  }
  return payload;
}

const formatTime = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
};

export default function MechanicsAssessment() {
  const { user, isLoading: authLoading } = useAuth();
  const { authFetch } = useApiClient();
  const { setQuizActive } = useQuizMode();
  const [data, setData] = useState<AssessmentResponse | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const answersRef = useRef<Answers>({});
  const [remaining, setRemaining] = useState(30 * 60);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [violations, setViolations] = useState(0);
  const autoSubmitted = useRef(false);
  const fullscreenWasUsed = useRef(false);
  const lastEvent = useRef<Record<string, number>>({});

  const active = data?.status === 'active' ? data : null;
  const submitted = data?.status === 'submitted' ? data : null;

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    authFetch('/api/mechanics-assessment')
      .then(async (response) => {
        const json = await readAssessmentResponse(response);
        if (!cancelled) {
          setData(json);
          if (json.status === 'active') setViolations(json.violationsCount || 0);
        }
      })
      .catch((reason: Error) => !cancelled && setError(reason.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [authFetch, authLoading, user]);

  useEffect(() => {
    setQuizActive(Boolean(active));
    return () => setQuizActive(false);
  }, [active, setQuizActive]);

  const start = async () => {
    setError('');
    setLoading(true);
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        fullscreenWasUsed.current = true;
      }
    } catch {
      // Some mobile browsers do not expose fullscreen; the attempt can still start.
    }
    try {
      const response = await authFetch('/api/mechanics-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      const json = await readAssessmentResponse(response);
      setData(json);
      setViolations('violationsCount' in json ? json.violationsCount : 0);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось начать срез.');
      if (document.fullscreenElement) void document.exitFullscreen();
    } finally {
      setLoading(false);
    }
  };

  const sendEvent = useCallback(
    (eventType: string) => {
      if (!active) return;
      const now = Date.now();
      if (now - (lastEvent.current[eventType] || 0) < 1200) return;
      lastEvent.current[eventType] = now;
      setViolations((count) => count + 1);
      void authFetch('/api/mechanics-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'event', eventType }),
        keepalive: true,
      });
    },
    [active, authFetch]
  );

  const submit = useCallback(
    async (automatic = false) => {
      if (!active || submitting || autoSubmitted.current) return;
      if (automatic) autoSubmitted.current = true;
      setSubmitting(true);
      setError('');
      try {
        const response = await authFetch('/api/mechanics-assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'submit', answers: answersRef.current }),
        });
        const json = await readAssessmentResponse(response);
        setData(json);
        setConfirmSubmit(false);
        if (document.fullscreenElement) await document.exitFullscreen();
      } catch (reason) {
        autoSubmitted.current = false;
        setError(reason instanceof Error ? reason.message : 'Не удалось отправить ответы.');
      } finally {
        setSubmitting(false);
      }
    },
    [active, authFetch, submitting]
  );

  useEffect(() => {
    if (!active) return;
    const serverRemaining = new Date(active.expiresAt).getTime() - new Date(active.serverNow).getTime();
    const localStarted = Date.now();
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((serverRemaining - (Date.now() - localStarted)) / 1000));
      setRemaining(seconds);
      if (seconds === 0) void submit(true);
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [active, submit]);

  useEffect(() => {
    if (!active) return;
    const onVisibility = () => document.hidden && sendEvent('tab-hidden');
    const onBlur = () => sendEvent('window-blur');
    const onFullscreen = () => {
      const isFullscreen = Boolean(document.fullscreenElement);
      setFullscreen(isFullscreen);
      if (!isFullscreen && fullscreenWasUsed.current) sendEvent('fullscreen-exit');
      if (isFullscreen) fullscreenWasUsed.current = true;
    };
    const block = (event: Event, type: string) => {
      event.preventDefault();
      sendEvent(type);
    };
    const onCopy = (event: ClipboardEvent) => block(event, 'copy');
    const onCut = (event: ClipboardEvent) => block(event, 'cut');
    const onPaste = (event: ClipboardEvent) => block(event, 'paste');
    const onContext = (event: MouseEvent) => block(event, 'context-menu');
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') block(event, 'print-shortcut');
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const onPopState = () => {
      sendEvent('navigation-attempt');
      window.history.pushState({ mechanicsAssessmentActive: true }, '');
    };
    window.history.pushState({ mechanicsAssessmentActive: true }, '');
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onContext);
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onContext);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
    };
  }, [active, sendEvent]);

  const answeredFields = useMemo(() => {
    if (!active) return 0;
    return active.tasks.reduce(
      (sum, task) => sum + task.fields.filter((field) => answers[task.id]?.[field.id]?.trim()).length,
      0
    );
  }, [active, answers]);
  const totalFields = active?.tasks.reduce((sum, task) => sum + task.fields.length, 0) ?? 0;

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      fullscreenWasUsed.current = true;
    } catch {
      setError('Полноэкранный режим не поддерживается этим браузером.');
    }
  };

  if (loading || authLoading) {
    return <main className="assessment-shell"><div className="assessment-loading">Подготавливаем контрольный срез…</div></main>;
  }

  if (!user) {
    return (
      <main className="assessment-shell">
        <section className="assessment-intro assessment-intro--compact">
          <span className="assessment-kicker">Контрольный срез по механике</span>
          <h1>Сначала войдите в аккаунт</h1>
          <p>Вход нужен, чтобы закрепить за вами один индивидуальный вариант и сохранить результат.</p>
          <SignInButton mode="modal"><button className="assessment-primary">Войти и продолжить</button></SignInButton>
        </section>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="assessment-shell">
        <section className="assessment-result">
          <span className="assessment-kicker">Работа завершена</span>
          <h1>{submitted.score} из {submitted.maxScore}</h1>
          <p className="assessment-result-lead">
            {submitted.late ? 'Время истекло до отправки: результат не засчитан.' : 'Ответы проверены и результат сохранён.'}
          </p>
          <div className="assessment-result-grid">
            {submitted.correctness.map((correct, index) => (
              <div className={correct ? 'result-task correct' : 'result-task incorrect'} key={index}>
                <span>Задача {index + 1}</span><strong>{correct ? 'Верно' : 'Неверно'}</strong>
              </div>
            ))}
          </div>
          <div className="assessment-result-meta">
            <span>Вариант: <strong>{submitted.variantCode}</strong></span>
            <span>Зафиксировано событий: <strong>{submitted.violationsCount}</strong></span>
          </div>
          <p className="assessment-source">Источники заданий после сдачи: Чертов А. Г., Воробьёв А. А. — {submitted.sources.join(', ')}.</p>
        </section>
      </main>
    );
  }

  if (!active) {
    return (
      <main className="assessment-shell">
        <section className="assessment-intro">
          <span className="assessment-kicker">Контрольный срез по механике</span>
          <h1>Три задачи. Один индивидуальный вариант.</h1>
          <p className="assessment-intro-lead">Открытые числовые ответы, 30 минут, задачи расположены по возрастанию. Повторный вариант после запуска не выдаётся.</p>
          <div className="assessment-rules">
            <div><strong>01</strong><span>Подготовьте бумагу, ручку и калькулятор.</span></div>
            <div><strong>02</strong><span>Не покидайте вкладку и полноэкранный режим.</span></div>
            <div><strong>03</strong><span>Копирование, вставка и печать блокируются и фиксируются.</span></div>
            <div><strong>04</strong><span>Введите только числа, единицы уже указаны рядом.</span></div>
          </div>
          {error && <p className="assessment-error">{error}</p>}
          <button className="assessment-primary" onClick={start}>Начать срез</button>
          <small>Нажимая кнопку, вы подтверждаете самостоятельное выполнение.</small>
        </section>
      </main>
    );
  }

  return (
    <main className="assessment-shell assessment-shell--active">
      <div className="assessment-watermark" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => <span key={index}>{active.variantCode} · {user.email}</span>)}
      </div>
      <section className="assessment-topbar">
        <div><span>Вариант</span><strong>{active.variantCode}</strong></div>
        <div className={remaining < 300 ? 'assessment-timer urgent' : 'assessment-timer'}><span>Осталось</span><strong>{formatTime(remaining)}</strong></div>
        <div><span>Заполнено</span><strong>{answeredFields}/{totalFields}</strong></div>
        <div><span>События</span><strong>{violations}</strong></div>
        {!fullscreen && <button onClick={enterFullscreen}>На весь экран</button>}
      </section>

      <header className="assessment-heading">
        <span className="assessment-kicker">Контрольный срез по механике</span>
        <h1>Решите задачи и запишите числовые ответы</h1>
        <p>Промежуточные вычисления выполняйте на бумаге. Десятичную дробь можно вводить через точку или запятую.</p>
      </header>

      <section className="assessment-tasks">
        {active.tasks.map((task) => (
          <article className="assessment-task" key={task.id}>
            <div className="assessment-task-number">{String(task.order).padStart(2, '0')}</div>
            <div className="assessment-task-content">
              <span className="assessment-task-level">Задача {task.order}</span>
              <h2>{task.title}</h2>
              <p>{task.text}</p>
              <div className="assessment-fields">
                {task.fields.map((field) => (
                  <label key={field.id}>
                    <span>{field.label}</span>
                    <div className="assessment-input-wrap">
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        spellCheck={false}
                        value={answers[task.id]?.[field.id] ?? ''}
                        onChange={(event) => setAnswers((current) => ({
                          ...current,
                          [task.id]: { ...current[task.id], [field.id]: event.target.value.replace(/[^0-9.,+-]/g, '') },
                        }))}
                        aria-label={`${field.label}, ${field.unit}`}
                      />
                      {field.unit && <span>{field.unit}</span>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>

      {error && <p className="assessment-error">{error}</p>}
      <div className="assessment-submit-row">
        <div><span>Проверьте ответы</span><small>После отправки изменить их нельзя.</small></div>
        <button className="assessment-primary" onClick={() => setConfirmSubmit(true)} disabled={submitting}>Завершить работу</button>
      </div>

      {confirmSubmit && (
        <div className="assessment-modal" role="dialog" aria-modal="true" aria-labelledby="submit-title">
          <div>
            <span className="assessment-kicker">Подтверждение</span>
            <h2 id="submit-title">Отправить ответы?</h2>
            <p>{answeredFields < totalFields ? `Заполнено ${answeredFields} из ${totalFields} полей.` : 'Все поля заполнены.'} После отправки вернуться к работе нельзя.</p>
            <div className="assessment-modal-actions">
              <button onClick={() => setConfirmSubmit(false)} disabled={submitting}>Продолжить решение</button>
              <button className="assessment-primary" onClick={() => void submit(false)} disabled={submitting}>{submitting ? 'Отправляем…' : 'Отправить'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
