import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuizMode } from '../context/QuizModeContext';
import { isEmailAdmin, useApiClient } from '../lib/apiClient';
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
type StudentIdentity = { lastName: string; firstName: string; group: string };
type AssessmentLanguage = 'ru' | 'kk';
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
  student?: StudentIdentity;
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
  student?: StudentIdentity;
};
type AssessmentResponse = ReadyResponse | ActiveResponse | SubmittedResponse;

const STUDENT_STORAGE_KEY = 'mechanics-assessment-student';
const LANGUAGE_STORAGE_KEY = 'mechanics-assessment-language';
const emptyStudent: StudentIdentity = { lastName: '', firstName: '', group: '' };

const COPY = {
  ru: {
    loading: 'Подготавливаем контрольный срез…', completed: 'Работа завершена', scoreJoin: 'из',
    late: 'Время истекло до отправки: результат не засчитан.', saved: 'Ответы проверены и результат сохранён.',
    group: 'группа', task: 'Задача', correct: 'Верно', incorrect: 'Неверно', variant: 'Вариант',
    eventsRecorded: 'Зафиксировано событий', sources: 'Источники заданий после сдачи',
    kicker: 'Контрольный срез по механике', introTitle: 'Три задачи. Один индивидуальный вариант.',
    introLead: 'Регистрация не требуется. Укажите свои данные, получите индивидуальный вариант и решите три задачи за 30 минут.',
    lastName: 'Фамилия', firstName: 'Имя', groupLabel: 'Группа', lastNamePlaceholder: 'Иванов', firstNamePlaceholder: 'Иван', groupPlaceholder: 'ФИЗ-101',
    rules: ['Подготовьте бумагу, ручку и калькулятор.', 'Не покидайте вкладку и полноэкранный режим.', 'Копирование, вставка и печать блокируются и фиксируются.', 'Введите только числа, единицы уже указаны рядом.'],
    start: 'Начать срез', consent: 'Нажимая кнопку, вы подтверждаете самостоятельное выполнение.',
    remaining: 'Осталось', filled: 'Заполнено', events: 'События', fullscreen: 'На весь экран',
    heading: 'Решите задачи и запишите числовые ответы', headingLead: 'Промежуточные вычисления выполняйте на бумаге. Десятичную дробь можно вводить через точку или запятую.',
    check: 'Проверьте ответы', cannotChange: 'После отправки изменить их нельзя.', finish: 'Завершить работу',
    confirmation: 'Подтверждение', sendQuestion: 'Отправить ответы?', allFilled: 'Все поля заполнены.',
    filledFields: (count: number, total: number) => `Заполнено ${count} из ${total} полей.`,
    cannotReturn: 'После отправки вернуться к работе нельзя.', continue: 'Продолжить решение', sending: 'Отправляем…', send: 'Отправить',
    calculator: 'Калькулятор', close: 'Закрыть', trigNote: 'sin и cos — в градусах',
    retry: 'Пройти ещё раз', retrying: 'Создаём новый вариант…', retryError: 'Не удалось открыть новую попытку.',
    startError: 'Не удалось начать срез.', submitError: 'Не удалось отправить ответы.', fullscreenError: 'Полноэкранный режим не поддерживается этим браузером.',
    invalidResponse: (status: number) => `Сервер вернул некорректный ответ (HTTP ${status}). Обновите страницу.`,
    unavailable: (status: number) => `Сервис контрольного среза временно недоступен (HTTP ${status}).`,
    emptyResponse: (status: number) => `Сервер не вернул данные (HTTP ${status}). Обновите страницу.`,
  },
  kk: {
    loading: 'Бақылау жұмысы дайындалуда…', completed: 'Жұмыс аяқталды', scoreJoin: '/',
    late: 'Жіберу уақыты өтіп кетті: нәтиже есептелмеді.', saved: 'Жауаптар тексеріліп, нәтиже сақталды.',
    group: 'тобы', task: 'Есеп', correct: 'Дұрыс', incorrect: 'Қате', variant: 'Нұсқа',
    eventsRecorded: 'Тіркелген оқиғалар', sources: 'Тапсырғаннан кейінгі есептердің дереккөздері',
    kicker: 'Механика бойынша бақылау жұмысы', introTitle: 'Үш есеп. Бір жеке нұсқа.',
    introLead: 'Тіркелу қажет емес. Деректеріңізді енгізіп, жеке нұсқаңызды алыңыз және үш есепті 30 минут ішінде шығарыңыз.',
    lastName: 'Тегі', firstName: 'Аты', groupLabel: 'Тобы', lastNamePlaceholder: 'Иванов', firstNamePlaceholder: 'Иван', groupPlaceholder: 'ФИЗ-101',
    rules: ['Қағаз, қалам және калькулятор дайындаңыз.', 'Қойындыдан және толық экран режимінен шықпаңыз.', 'Көшіру, қою және басып шығару бұғатталып, тіркеледі.', 'Тек сандарды енгізіңіз, өлшем бірліктері жанында көрсетілген.'],
    start: 'Бақылауды бастау', consent: 'Түймені басу арқылы жұмысты өз бетіңізше орындайтыныңызды растайсыз.',
    remaining: 'Қалды', filled: 'Толтырылды', events: 'Оқиғалар', fullscreen: 'Толық экран',
    heading: 'Есептерді шығарып, сандық жауаптарды жазыңыз', headingLead: 'Аралық есептеулерді қағазда орындаңыз. Ондық бөлшекті нүкте немесе үтір арқылы енгізуге болады.',
    check: 'Жауаптарды тексеріңіз', cannotChange: 'Жібергеннен кейін оларды өзгертуге болмайды.', finish: 'Жұмысты аяқтау',
    confirmation: 'Растау', sendQuestion: 'Жауаптарды жіберу керек пе?', allFilled: 'Барлық өріс толтырылды.',
    filledFields: (count: number, total: number) => `${total} өрістің ${count} толтырылды.`,
    cannotReturn: 'Жібергеннен кейін жұмысқа қайта оралу мүмкін емес.', continue: 'Шешуді жалғастыру', sending: 'Жіберілуде…', send: 'Жіберу',
    calculator: 'Калькулятор', close: 'Жабу', trigNote: 'sin және cos — градуспен',
    retry: 'Қайта өту', retrying: 'Жаңа нұсқа жасалуда…', retryError: 'Жаңа әрекетті ашу мүмкін болмады.',
    startError: 'Бақылау жұмысын бастау мүмкін болмады.', submitError: 'Жауаптарды жіберу мүмкін болмады.', fullscreenError: 'Бұл браузер толық экран режимін қолдамайды.',
    invalidResponse: (status: number) => `Сервер қате жауап қайтарды (HTTP ${status}). Бетті жаңартыңыз.`,
    unavailable: (status: number) => `Бақылау жұмысының қызметі уақытша қолжетімсіз (HTTP ${status}).`,
    emptyResponse: (status: number) => `Сервер дерек қайтармады (HTTP ${status}). Бетті жаңартыңыз.`,
  },
} as const;

function savedLanguage(): AssessmentLanguage {
  return localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'kk' ? 'kk' : 'ru';
}

function savedStudent(): StudentIdentity {
  try {
    const value = JSON.parse(localStorage.getItem(STUDENT_STORAGE_KEY) || 'null') as Partial<StudentIdentity> | null;
    return value && typeof value.lastName === 'string' && typeof value.firstName === 'string' && typeof value.group === 'string'
      ? { lastName: value.lastName, firstName: value.firstName, group: value.group }
      : emptyStudent;
  } catch {
    return emptyStudent;
  }
}

const completeStudent = (student: StudentIdentity) =>
  student.lastName.trim().length >= 2 && student.firstName.trim().length >= 2 && student.group.trim().length >= 1;

async function readAssessmentResponse(response: Response, language: AssessmentLanguage): Promise<AssessmentResponse> {
  const copy = COPY[language];
  const text = await response.text();
  let payload: (AssessmentResponse & { error?: string }) | null = null;
  if (text.trim()) {
    try {
      payload = JSON.parse(text) as AssessmentResponse & { error?: string };
    } catch {
      throw new Error(copy.invalidResponse(response.status));
    }
  }
  if (!response.ok) {
    throw new Error(payload?.error || copy.unavailable(response.status));
  }
  if (!payload) {
    throw new Error(copy.emptyResponse(response.status));
  }
  return payload;
}

const formatTime = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
};

type CalculatorOperation = '+' | '−' | '×' | '÷' | null;

function AssessmentCalculator({ language }: { language: AssessmentLanguage }) {
  const copy = COPY[language];
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [stored, setStored] = useState<number | null>(null);
  const [operation, setOperation] = useState<CalculatorOperation>(null);
  const [replaceDisplay, setReplaceDisplay] = useState(false);

  const value = () => Number(display.replace(',', '.')) || 0;
  const show = (next: number) => {
    const safe = Number.isFinite(next) ? Number(next.toPrecision(12)) : 0;
    setDisplay(String(safe).replace('.', ','));
  };
  const apply = (left: number, right: number, op: CalculatorOperation) => {
    if (op === '+') return left + right;
    if (op === '−') return left - right;
    if (op === '×') return left * right;
    if (op === '÷') return right === 0 ? 0 : left / right;
    return right;
  };
  const digit = (symbol: string) => {
    if (replaceDisplay || display === '0') {
      setDisplay(symbol);
      setReplaceDisplay(false);
    } else if (display.length < 16) {
      setDisplay(display + symbol);
    }
  };
  const decimal = () => {
    if (replaceDisplay) {
      setDisplay('0,');
      setReplaceDisplay(false);
    } else if (!display.includes(',')) {
      setDisplay(`${display},`);
    }
  };
  const chooseOperation = (nextOperation: Exclude<CalculatorOperation, null>) => {
    const current = value();
    if (stored !== null && operation && !replaceDisplay) {
      const result = apply(stored, current, operation);
      show(result);
      setStored(result);
    } else {
      setStored(current);
    }
    setOperation(nextOperation);
    setReplaceDisplay(true);
  };
  const equals = () => {
    if (stored === null || !operation) return;
    show(apply(stored, value(), operation));
    setStored(null);
    setOperation(null);
    setReplaceDisplay(true);
  };
  const unary = (kind: 'sqrt' | 'square' | 'sin' | 'cos') => {
    const current = value();
    if (kind === 'sqrt') show(Math.sqrt(Math.max(0, current)));
    if (kind === 'square') show(current ** 2);
    if (kind === 'sin') show(Math.sin((current * Math.PI) / 180));
    if (kind === 'cos') show(Math.cos((current * Math.PI) / 180));
    setReplaceDisplay(true);
  };
  const clear = () => {
    setDisplay('0');
    setStored(null);
    setOperation(null);
    setReplaceDisplay(false);
  };

  return (
    <div className={`assessment-calculator${open ? ' open' : ''}`}>
      <button
        className="assessment-calculator-toggle"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        {open ? copy.close : copy.calculator}
      </button>
      {open && (
        <div className="assessment-calculator-panel">
          <div className="assessment-calculator-title">
            <span>{copy.calculator}</span><small>{copy.trigNote}</small>
          </div>
          <output>{display}</output>
          <div className="assessment-calculator-keys">
            <button type="button" onClick={clear}>C</button>
            <button type="button" onClick={() => setDisplay((current) => current.length > 1 ? current.slice(0, -1) : '0')}>⌫</button>
            <button type="button" onClick={() => unary('sqrt')}>√</button>
            <button type="button" className="operator" onClick={() => chooseOperation('÷')}>÷</button>
            <button type="button" onClick={() => unary('sin')}>sin</button>
            <button type="button" onClick={() => unary('cos')}>cos</button>
            <button type="button" onClick={() => unary('square')}>x²</button>
            <button type="button" className="operator" onClick={() => chooseOperation('×')}>×</button>
            {[7, 8, 9].map((number) => <button type="button" key={number} onClick={() => digit(String(number))}>{number}</button>)}
            <button type="button" className="operator" onClick={() => chooseOperation('−')}>−</button>
            {[4, 5, 6].map((number) => <button type="button" key={number} onClick={() => digit(String(number))}>{number}</button>)}
            <button type="button" className="operator" onClick={() => chooseOperation('+')}>+</button>
            {[1, 2, 3].map((number) => <button type="button" key={number} onClick={() => digit(String(number))}>{number}</button>)}
            <button type="button" className="equals" onClick={equals}>=</button>
            <button type="button" className="zero" onClick={() => digit('0')}>0</button>
            <button type="button" onClick={decimal}>,</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AssessmentLanguageSwitch({
  language,
  onChange,
}: {
  language: AssessmentLanguage;
  onChange: (language: AssessmentLanguage) => void;
}) {
  return (
    <div className="assessment-language" role="group" aria-label="Тіл / Язык">
      <button type="button" className={language === 'ru' ? 'active' : ''} onClick={() => onChange('ru')}>Русский</button>
      <button type="button" className={language === 'kk' ? 'active' : ''} onClick={() => onChange('kk')}>Қазақша</button>
    </div>
  );
}

export default function MechanicsAssessment() {
  const { user, isPremium, isLoading: authLoading } = useAuth();
  const { authFetch } = useApiClient();
  const { setQuizActive } = useQuizMode();
  const [language, setLanguage] = useState<AssessmentLanguage>(savedLanguage);
  const copy = COPY[language];
  const [data, setData] = useState<AssessmentResponse | null>(null);
  const [student, setStudent] = useState<StudentIdentity>(savedStudent);
  const studentRef = useRef<StudentIdentity>(student);
  const [answers, setAnswers] = useState<Answers>({});
  const answersRef = useRef<Answers>({});
  const [remaining, setRemaining] = useState(30 * 60);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState('');
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [violations, setViolations] = useState(0);
  const autoSubmitted = useRef(false);
  const fullscreenWasUsed = useRef(false);
  const lastEvent = useRef<Record<string, number>>({});

  const active = data?.status === 'active' ? data : null;
  const submitted = data?.status === 'submitted' ? data : null;
  const canRestart = isPremium || isEmailAdmin(user?.email);

  const changeLanguage = (nextLanguage: AssessmentLanguage) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    setLanguage(nextLanguage);
    setError('');
  };

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => {
      void authFetch('/api/mechanics-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'progress', answers, student: studentRef.current, language }),
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [active, answers, authFetch, language]);

  useEffect(() => {
    studentRef.current = student;
  }, [student]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setLoading(true);
    const stored = savedStudent();
    const request = completeStudent(stored)
      ? authFetch('/api/mechanics-assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'resume', student: stored, language }),
        })
      : authFetch(`/api/mechanics-assessment?lang=${language}`);
    request
      .then(async (response) => {
        const json = await readAssessmentResponse(response, language);
        if (!cancelled) {
          setData(json);
          if (json.status !== 'ready' && json.student) {
            setStudent(json.student);
            studentRef.current = json.student;
            localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(json.student));
          }
          if (json.status === 'active') setViolations(json.violationsCount || 0);
        }
      })
      .catch((reason: Error) => !cancelled && setError(reason.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [authFetch, authLoading, user, language]);

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
        body: JSON.stringify({ action: 'start', student, language }),
      });
      const json = await readAssessmentResponse(response, language);
      setData(json);
      localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(student));
      setViolations('violationsCount' in json ? json.violationsCount : 0);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.startError);
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
        body: JSON.stringify({ action: 'event', eventType, student: studentRef.current, language }),
        keepalive: true,
      });
    },
    [active, authFetch, language]
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
          body: JSON.stringify({ action: 'submit', answers: answersRef.current, student: studentRef.current, language }),
        });
        const json = await readAssessmentResponse(response, language);
        setData(json);
        setConfirmSubmit(false);
        if (document.fullscreenElement) await document.exitFullscreen();
      } catch (reason) {
        autoSubmitted.current = false;
        setError(reason instanceof Error ? reason.message : copy.submitError);
      } finally {
        setSubmitting(false);
      }
    },
    [active, authFetch, submitting, language, copy.submitError]
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
      setError(copy.fullscreenError);
    }
  };

  const restart = async () => {
    if (!submitted?.student || restarting) return;
    setRestarting(true);
    setError('');
    try {
      const response = await authFetch('/api/mechanics-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart', student: submitted.student, language }),
      });
      const json = await readAssessmentResponse(response, language);
      setAnswers({});
      answersRef.current = {};
      autoSubmitted.current = false;
      setViolations(0);
      setData(json);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.retryError);
    } finally {
      setRestarting(false);
    }
  };

  if (loading || authLoading) {
    return <main className="assessment-shell"><div className="assessment-loading">{copy.loading}</div></main>;
  }

  if (submitted) {
    return (
      <main className="assessment-shell">
        <section className="assessment-result">
          <AssessmentLanguageSwitch language={language} onChange={changeLanguage} />
          <span className="assessment-kicker">{copy.completed}</span>
          <h1>{submitted.score} {copy.scoreJoin} {submitted.maxScore}</h1>
          <p className="assessment-result-lead">
            {submitted.late ? copy.late : copy.saved}
          </p>
          {submitted.student && (
            <p className="assessment-student-summary">
              {submitted.student.lastName} {submitted.student.firstName} · {copy.group} {submitted.student.group}
            </p>
          )}
          <div className="assessment-result-grid">
            {submitted.correctness.map((correct, index) => (
              <div className={correct ? 'result-task correct' : 'result-task incorrect'} key={index}>
                <span>{copy.task} {index + 1}</span><strong>{correct ? copy.correct : copy.incorrect}</strong>
              </div>
            ))}
          </div>
          <div className="assessment-result-meta">
            <span>{copy.variant}: <strong>{submitted.variantCode}</strong></span>
            <span>{copy.eventsRecorded}: <strong>{submitted.violationsCount}</strong></span>
          </div>
          <p className="assessment-source">{copy.sources}: Чертов А. Г., Воробьёв А. А. — {submitted.sources.join(', ')}.</p>
          {error && <p className="assessment-error">{error}</p>}
          {canRestart && submitted.student && (
            <button className="assessment-primary assessment-restart" type="button" onClick={restart} disabled={restarting}>
              {restarting ? copy.retrying : copy.retry}
            </button>
          )}
        </section>
      </main>
    );
  }

  if (!active) {
    return (
      <main className="assessment-shell">
        <section className="assessment-intro">
          <AssessmentLanguageSwitch language={language} onChange={changeLanguage} />
          <span className="assessment-kicker">{copy.kicker}</span>
          <h1>{copy.introTitle}</h1>
          <p className="assessment-intro-lead">{copy.introLead}</p>
          <div className="assessment-student-form">
            <label>
              <span>{copy.lastName}</span>
              <input
                autoComplete="family-name"
                maxLength={60}
                value={student.lastName}
                onChange={(event) => setStudent((current) => ({ ...current, lastName: event.target.value }))}
                placeholder={copy.lastNamePlaceholder}
              />
            </label>
            <label>
              <span>{copy.firstName}</span>
              <input
                autoComplete="given-name"
                maxLength={60}
                value={student.firstName}
                onChange={(event) => setStudent((current) => ({ ...current, firstName: event.target.value }))}
                placeholder={copy.firstNamePlaceholder}
              />
            </label>
            <label>
              <span>{copy.groupLabel}</span>
              <input
                autoComplete="organization-title"
                maxLength={32}
                value={student.group}
                onChange={(event) => setStudent((current) => ({ ...current, group: event.target.value }))}
                placeholder={copy.groupPlaceholder}
              />
            </label>
          </div>
          <div className="assessment-rules">
            {copy.rules.map((rule, index) => <div key={rule}><strong>{String(index + 1).padStart(2, '0')}</strong><span>{rule}</span></div>)}
          </div>
          {error && <p className="assessment-error">{error}</p>}
          <button className="assessment-primary" onClick={start} disabled={!completeStudent(student)}>{copy.start}</button>
          <small>{copy.consent}</small>
        </section>
      </main>
    );
  }

  return (
    <main className="assessment-shell assessment-shell--active">
      <div className="assessment-watermark" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <span key={index}>
            {active.variantCode} · {active.student ? `${active.student.lastName} ${active.student.firstName} · ${active.student.group}` : user?.email}
          </span>
        ))}
      </div>
      <section className="assessment-topbar">
        <div><span>{copy.variant}</span><strong>{active.variantCode}</strong></div>
        <div className={remaining < 300 ? 'assessment-timer urgent' : 'assessment-timer'}><span>{copy.remaining}</span><strong>{formatTime(remaining)}</strong></div>
        <div><span>{copy.filled}</span><strong>{answeredFields}/{totalFields}</strong></div>
        <div><span>{copy.events}</span><strong>{violations}</strong></div>
        <AssessmentLanguageSwitch language={language} onChange={changeLanguage} />
        {!fullscreen && <button onClick={enterFullscreen}>{copy.fullscreen}</button>}
      </section>

      <header className="assessment-heading">
        <span className="assessment-kicker">{copy.kicker}</span>
        <h1>{copy.heading}</h1>
        <p>{copy.headingLead}</p>
      </header>

      <section className="assessment-tasks">
        {active.tasks.map((task) => (
          <article className="assessment-task" key={task.id}>
            <div className="assessment-task-number">{String(task.order).padStart(2, '0')}</div>
            <div className="assessment-task-content">
              <span className="assessment-task-level">{copy.task} {task.order}</span>
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
        <div><span>{copy.check}</span><small>{copy.cannotChange}</small></div>
        <button className="assessment-primary" onClick={() => setConfirmSubmit(true)} disabled={submitting}>{copy.finish}</button>
      </div>

      <AssessmentCalculator language={language} />

      {confirmSubmit && (
        <div className="assessment-modal" role="dialog" aria-modal="true" aria-labelledby="submit-title">
          <div>
            <span className="assessment-kicker">{copy.confirmation}</span>
            <h2 id="submit-title">{copy.sendQuestion}</h2>
            <p>{answeredFields < totalFields ? copy.filledFields(answeredFields, totalFields) : copy.allFilled} {copy.cannotReturn}</p>
            <div className="assessment-modal-actions">
              <button onClick={() => setConfirmSubmit(false)} disabled={submitting}>{copy.continue}</button>
              <button className="assessment-primary" onClick={() => void submit(false)} disabled={submitting}>{submitting ? copy.sending : copy.send}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
