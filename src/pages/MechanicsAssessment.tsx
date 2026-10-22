import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuizMode } from '../context/QuizModeContext';
import { useApiClient } from '../lib/apiClient';
import '../styles/mechanics-assessment.css';
import AssessmentSessionGate, { type SessionRunnerProps } from '../components/AssessmentSessionGate';
import MoleculeDiagram from '../components/MoleculeDiagram';

type Field = { id: string; label: string; unit: string; step: string };
type Task = {
  id: string;
  order: number;
  title: string;
  text: string;
  fields: Field[];
  kind?: 'numeric' | 'multiple'; points?: number; diagram?: 'molecule';
  options?: Array<{ id: string; text: string }>;
};
type Answers = Record<string, Record<string, string>>;
type StudentIdentity = { lastName: string; firstName: string; group: string; variantNumber?: number };
type PenaltyInfo = { policyVersion?: number | null; penaltyPoints?: number; finalPercent?: number | null; waiverReason?: string | null };
type AssessmentLanguage = 'ru' | 'kk';
type ReadyResponse = { status: 'ready' };
type ActiveResponse = PenaltyInfo & {
  status: 'active';
  attemptId: string;
  variantCode: string;
  startedAt: string;
  expiresAt: string;
  serverNow: string;
  tasks: Task[];
  answers?: Answers;
  violationsCount: number;
  student?: StudentIdentity;
};
type SubmittedResponse = PenaltyInfo & {
  status: 'submitted';
  attemptId: string;
  variantCode: string;
  score: number;
  maxScore: number;
  correctness: boolean[];
  taskScores?: number[];
  taskMaxScores?: number[];
  taskLabels?: string[];
  review?: Array<{
    id: string; title: string; text: string;
    fields: Array<{ id: string; label: string; unit: string; submitted: string | number | null; expected: string | number; correct: boolean }>;
  }>;
  submittedAt: string;
  violationsCount: number;
  sources: string[];
  late?: boolean;
  canRestart: boolean;
  student?: StudentIdentity;
};
type SealedResponse = { status: 'sealed'; attemptId: string; student?: StudentIdentity; submittedAt: string; revealAt: string | null };
type AssessmentResponse = ReadyResponse | ActiveResponse | SubmittedResponse | SealedResponse | { status: 'locked' };

const STUDENT_STORAGE_KEY = 'mechanics-assessment-student';
const LANGUAGE_STORAGE_KEY = 'mechanics-assessment-language';
const emptyStudent: StudentIdentity = { lastName: '', firstName: '', group: '' };

const COPY = {
  ru: {
    loading: 'Подготавливаем контрольный срез…', completed: 'Работа завершена', scoreJoin: 'из',
    late: 'Время истекло до отправки: результат не засчитан.', saved: 'Ответы проверены и результат сохранён.',
    group: 'группа', task: 'Задача', correct: 'Верно', incorrect: 'Неверно', variant: 'Вариант',
    eventsRecorded: 'Зафиксировано событий', sources: 'Источники заданий после сдачи',
    kicker: 'Контрольный срез', introTitle: 'Механика', introMeta: '3 задачи · 30 минут', formTitle: 'Данные участника',
    introLead: 'У каждого участника — свой вариант. Укажите имя, фамилию и группу, чтобы начать. Регистрация не требуется.',
    lastName: 'Фамилия', firstName: 'Имя', groupLabel: 'Группа', lastNamePlaceholder: 'Иванов', firstNamePlaceholder: 'Иван', groupPlaceholder: 'В062',
    rules: ['Подготовьте бумагу и ручку. Калькулятор встроен в работу.', 'Не покидайте вкладку и полноэкранный режим.', 'Копирование, вставка и печать блокируются и фиксируются.', 'Введите только числа, единицы уже указаны рядом.', 'Отключите автоблокировку и переход экрана в сон на время работы. Таймер продолжает идти, даже если экран заблокирован.'],
    start: 'Начать срез', consent: 'Нажимая кнопку, вы подтверждаете самостоятельное выполнение.',
    penaltyRules: 'Штрафы: первый эпизод в каждой категории — предупреждение. Повторное скрытие страницы или выход из полного экрана: −1 п. п.; копирование, вырезание, вставка или печать: −2 п. п.',
    legacyRules: 'Эта попытка начата до введения штрафов. События фиксируются, но оценка не снижается.',
    eventWarning: 'Событие зафиксировано. Соблюдайте правила работы; повторные эпизоды могут снизить оценку.',
    deduction: 'Снижение', finalGrade: 'Итоговая оценка', penaltyWaived: 'Штрафы отменены преподавателем',
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
    kicker: 'Бақылау жұмысы', introTitle: 'Механика', introMeta: '3 есеп · 30 минут', formTitle: 'Қатысушы деректері',
    introLead: 'Әр қатысушыға жеке нұсқа беріледі. Бастау үшін атыңызды, тегіңізді және тобыңызды енгізіңіз. Тіркелу қажет емес.',
    lastName: 'Тегі', firstName: 'Аты', groupLabel: 'Тобы', lastNamePlaceholder: 'Иванов', firstNamePlaceholder: 'Иван', groupPlaceholder: 'В062',
    rules: ['Қағаз бен қалам дайындаңыз. Калькулятор жұмысқа кіріктірілген.', 'Қойындыдан және толық экран режимінен шықпаңыз.', 'Көшіру, қою және басып шығару бұғатталып, тіркеледі.', 'Тек сандарды енгізіңіз, өлшем бірліктері жанында көрсетілген.', 'Жұмыс кезінде экранның автоматты құлыпталуын және ұйқы режимін өшіріңіз. Экран құлыпталса да, уақыт санағы жалғасады.'],
    start: 'Бақылауды бастау', consent: 'Түймені басу арқылы жұмысты өз бетіңізше орындайтыныңызды растайсыз.',
    penaltyRules: 'Айыптар: әр санаттағы бірінші эпизод — ескерту. Бетті қайта жасыру немесе толық экраннан шығу: −1 пайыздық тармақ; көшіру, қиып алу, қою немесе басып шығару: −2 пайыздық тармақ.',
    legacyRules: 'Бұл әрекет айыптар енгізілгенге дейін басталған. Оқиғалар тіркеледі, бірақ баға төмендемейді.',
    eventWarning: 'Оқиға тіркелді. Жұмыс ережелерін сақтаңыз; қайталанған эпизодтар бағаны төмендетуі мүмкін.',
    deduction: 'Төмендеу', finalGrade: 'Қорытынды баға', penaltyWaived: 'Айыптарды оқытушы алып тастады',
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

const canUseFullscreen = () => Boolean(document.fullscreenEnabled) &&
  !window.matchMedia('(max-width: 720px), (hover: none) and (pointer: coarse)').matches;

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

export default function MechanicsAssessment({ assessment = 'mechanics' }: { assessment?: 'mechanics' | 'midterm' }) {
  return <AssessmentSessionGate endpoint={assessment === 'midterm' ? '/api/midterm-assessment' : '/api/mechanics-assessment'}>{props => <AssessmentRunner key={assessment} assessment={assessment} {...props} />}</AssessmentSessionGate>;
}
function AssessmentRunner({ assessment = 'mechanics', practice = false, participantStudent, sessionDeadline }: { assessment?: 'mechanics' | 'midterm' } & SessionRunnerProps) {
  const midterm = assessment === 'midterm';
  const endpoint = midterm ? '/api/midterm-assessment' : '/api/mechanics-assessment';
  const { user, isLoading: authLoading } = useAuth();
  const { authFetch: baseFetch } = useApiClient();
  const authFetch = useCallback((input: string, init: RequestInit = {}) => {
    if (!practice) return baseFetch(input, init);
    if (typeof init.body === 'string') return baseFetch(input, { ...init, body: JSON.stringify({ ...JSON.parse(init.body), practice: true }) });
    return baseFetch(`${input}${input.includes('?') ? '&' : '?'}practice=1`, init);
  }, [baseFetch, practice]);
  const { setQuizActive } = useQuizMode();
  const [language, setLanguage] = useState<AssessmentLanguage>(savedLanguage);
  const copy = midterm ? { ...COPY[language],
    introTitle: language === 'kk' ? 'Аралық бақылау' : 'Рубежный срез',
    introMeta: language === 'kk' ? '4 есеп + 3 теория · 50 минут · 8 балл' : '4 задачи + 3 теории · 50 минут · 8 баллов',
    heading: language === 'kk' ? '4 есеп және 3 теориялық сұрақ' : '4 задачи и 3 вопроса теории',
    headingLead: language === 'kk' ? 'Есептерге сандық жауап жазыңыз. Теорияда барлық дұрыс жауаптарды белгілеңіз. Есептің әр дұрыс өрісіне ішінара балл беріледі; теорияда тек толық дұрыс жиын есептеледі. Барлығы — 8 балл. Сандарды жүздікке дейін дөңгелектеңіз.' : 'В задачах введите числа, в теории отметьте все верные ответы. За верные поля задач начисляются частичные баллы; в теории засчитывается только точный набор. Всего — 8 баллов. Числа округляйте до сотых.',
  } : COPY[language];
  const [data, setData] = useState<AssessmentResponse | null>(null);
  const [student, setStudent] = useState<StudentIdentity>(() => participantStudent ?? savedStudent());
  const studentRef = useRef<StudentIdentity>(student);
  const [answers, setAnswers] = useState<Answers>({});
  const answersRef = useRef<Answers>({});
  const [remaining, setRemaining] = useState((midterm ? 50 : 30) * 60);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState('');
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [violations, setViolations] = useState(0);
  const [penaltyPoints, setPenaltyPoints] = useState(0);
  const [eventWarning, setEventWarning] = useState(false);
  const autoSubmitted = useRef(false);
  const fullscreenWasUsed = useRef(false);
  const lastEvent = useRef<Record<string, number>>({});
  const deadline = useRef(0);

  const active = data?.status === 'active' ? data : null;
  const submitted = data?.status === 'submitted' ? data : null;
  const canRestart = Boolean(submitted?.canRestart);

  const changeLanguage = async (nextLanguage: AssessmentLanguage) => {
    if (nextLanguage === language) return;
    if (active) {
      try {
        const response = await authFetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'progress', answers, student: studentRef.current, language }),
        });
        if (!response.ok) throw new Error();
      } catch {
        setError(language === 'kk' ? 'Жауаптарды сақтау мүмкін болмады. Тілді ауыстырмас бұрын байланысты тексеріңіз.' : 'Не удалось сохранить ответы. Проверьте связь перед сменой языка.');
        return;
      }
    }
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    setLanguage(nextLanguage);
    setError('');
  };

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (sessionDeadline) deadline.current = Date.now() + Date.parse(sessionDeadline.expiresAt) - Date.parse(sessionDeadline.serverNow);
  }, [sessionDeadline]);

  useEffect(() => {
    if (!active || loading || submitting) return;
    const timer = window.setTimeout(() => {
      void authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'progress', answers, student: studentRef.current, language }),
      }).catch(() => setError(language === 'kk' ? 'Жауаптарды сақтау мүмкін болмады. Байланысты тексеріңіз.' : 'Не удалось сохранить ответы. Проверьте соединение.'));
    }, 800);
    return () => window.clearTimeout(timer);
  }, [active, answers, authFetch, endpoint, language, loading, submitting]);

  useEffect(() => {
    studentRef.current = student;
  }, [student]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setLoading(true);
    const stored = participantStudent ?? savedStudent();
    const request = completeStudent(stored)
      ? authFetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'resume', student: stored, language }),
        })
      : authFetch(`${endpoint}?lang=${language}`);
    request
      .then(async (response) => {
        const json = await readAssessmentResponse(response, language);
        if (!cancelled) {
          setData(json);
          if ('student' in json && json.student) {
            setStudent(json.student);
            studentRef.current = json.student;
            localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(json.student));
          }
          if (json.status === 'active') {
            setViolations(json.violationsCount || 0);
            setPenaltyPoints(json.penaltyPoints ?? 0);
            setAnswers(json.answers ?? {});
            answersRef.current = json.answers ?? {};
            deadline.current = Date.now() + new Date(json.expiresAt).getTime() - new Date(json.serverNow).getTime();
          }
        }
      })
      .catch((reason: Error) => !cancelled && setError(reason.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [authFetch, authLoading, endpoint, user, language, participantStudent]);

  useEffect(() => {
    setQuizActive(Boolean(active));
    return () => setQuizActive(false);
  }, [active, setQuizActive]);

  const start = async () => {
    setError('');
    setLoading(true);
    try {
      if (canUseFullscreen() && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        fullscreenWasUsed.current = true;
      }
    } catch {
      // Some mobile browsers do not expose fullscreen; the attempt can still start.
    }
    try {
      const response = await authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', student, language }),
      });
      const json = await readAssessmentResponse(response, language);
      setData(json);
      if (json.status === 'active') {
        setAnswers(json.answers ?? {});
        answersRef.current = json.answers ?? {};
        deadline.current = Date.now() + new Date(json.expiresAt).getTime() - new Date(json.serverNow).getTime();
      }
      localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(student));
      setViolations('violationsCount' in json ? json.violationsCount : 0);
      setPenaltyPoints('penaltyPoints' in json ? json.penaltyPoints ?? 0 : 0);
      setEventWarning(false);
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
      setEventWarning(true);
      void authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'event', eventType, student: studentRef.current, language }),
        keepalive: true,
      }).then(async response => {
        if (!response.ok) return;
        const payload = await response.json() as PenaltyInfo & { violationsCount?: number };
        if (typeof payload.penaltyPoints === 'number') setPenaltyPoints(payload.penaltyPoints);
      }).catch(() => { /* The assessment must remain usable during a connection interruption. */ });
    },
    [active, authFetch, endpoint, language]
  );

  const submit = useCallback(
    async (automatic = false) => {
      if (!active || submitting || autoSubmitted.current) return;
      if (automatic) autoSubmitted.current = true;
      setSubmitting(true);
      setError('');
      try {
        const response = await authFetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'submit', answers: answersRef.current, student: studentRef.current, language }),
        });
        const json = await readAssessmentResponse(response, language);
        setData(json);
        setConfirmSubmit(false);
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      } catch (reason) {
        autoSubmitted.current = false;
        setError(reason instanceof Error ? reason.message : copy.submitError);
      } finally {
        setSubmitting(false);
      }
    },
    [active, authFetch, endpoint, submitting, language, copy.submitError]
  );

  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
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
    if (!canUseFullscreen()) return;
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
      const response = await authFetch(endpoint, {
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

  if (data?.status === 'sealed' || data?.status === 'locked') {
    return <main className="exam-entry-page"><section className="exam-entry-card">
      <h1>{data.status === 'sealed' ? (language === 'kk' ? 'Жұмыс қабылданды' : 'Работа принята') : (language === 'kk' ? 'Кіру жабық' : 'Доступ закрыт')}</h1>
      <p>{language === 'kk' ? 'Тапсырмалар, бағалар және дұрыс жауаптар барлық ағындар үшін ортақ күнге дейін жабық.' : 'Задания, баллы и правильные ответы закрыты до общей даты для всех потоков.'}</p>
      {data.status === 'sealed' && data.student && <p>{data.student.lastName} {data.student.firstName} · {data.student.group}</p>}
      {data.status === 'sealed' && data.revealAt && <p>{language === 'kk' ? 'Ашылатын уақыт' : 'Откроются'}: {new Date(data.revealAt).toLocaleString(language === 'kk' ? 'kk-KZ' : 'ru-RU')}</p>}
      {data.status === 'sealed' && !data.revealAt && <p>{language === 'kk' ? 'Оқытушы ашылатын күнді кейінірек белгілейді.' : 'Преподаватель назначит дату открытия позже.'}</p>}
    </section></main>;
  }

  if (submitted) {
    return (
      <main className="assessment-shell">
        <section className="assessment-result">
          <AssessmentLanguageSwitch language={language} onChange={changeLanguage} />
          <span className="assessment-kicker">{copy.completed}</span>
          <h1>{submitted.policyVersion === 1 ? `${submitted.finalPercent ?? 0}%` : `${submitted.score} ${copy.scoreJoin} ${submitted.maxScore}`}</h1>
          {midterm && <p>{copy.finalGrade}: <strong>{Math.round((submitted.finalPercent ?? submitted.score / 8 * 100) * .8) / 10} / 8</strong></p>}
          {submitted.policyVersion === 1 && <p>{submitted.score} {copy.scoreJoin} {submitted.maxScore} · {midterm ? (language === 'kk' ? 'балл' : 'баллов') : copy.task.toLocaleLowerCase()}</p>}
          <p className="assessment-result-lead">
            {submitted.late ? copy.late : copy.saved}
          </p>
          <div className="assessment-policy-note">
            {submitted.policyVersion === 1 ? <><p>{copy.finalGrade}: <b>{submitted.finalPercent ?? 0}%</b> · {copy.deduction}: {submitted.penaltyPoints ?? 0} п. п.</p>{submitted.waiverReason && <p>{copy.penaltyWaived}: {submitted.waiverReason}</p>}<p>{copy.penaltyRules}</p></> : <p>{copy.legacyRules}</p>}
          </div>
          {submitted.student && (
            <p className="assessment-student-summary">
              {submitted.student.lastName} {submitted.student.firstName} · {copy.group} {submitted.student.group}
            </p>
          )}
          <div className="assessment-result-grid">
            {submitted.correctness.map((correct, index) => (
              <div className={correct ? 'result-task correct' : 'result-task incorrect'} key={index}>
                <span className="assessment-result-number" aria-hidden="true">{index + 1}</span><strong className="assessment-result-status">{submitted.taskLabels?.[index] ?? `${copy.task} ${index + 1}`}: {correct ? copy.correct : (submitted.taskScores?.[index] ?? 0) > 0 ? (language === 'kk' ? 'Ішінара' : 'Частично') : copy.incorrect}</strong>
                <span className="assessment-result-caption" aria-hidden="true">{correct ? copy.correct : (submitted.taskScores?.[index] ?? 0) > 0 ? (language === 'kk' ? 'Ішінара' : 'Частично') : copy.incorrect}</span>
                {submitted.taskScores && <small>{submitted.taskScores[index]} / {submitted.taskMaxScores?.[index]}</small>}
              </div>
            ))}
          </div>
          {submitted.review && <section className="assessment-answer-review" aria-labelledby="answer-review-title">
            <h2 id="answer-review-title">{language === 'kk' ? 'Дұрыс жауаптар' : 'Правильные ответы'}</h2>
            {submitted.review.map(task => <article key={task.id}>
              <h3>{task.title}</h3>
              <p>{task.text}</p>
              <dl>{task.fields.map(field => <div key={field.id} className={field.correct ? 'answer-correct' : 'answer-incorrect'}>
                <dt>{field.label}</dt>
                <dd><span>{language === 'kk' ? 'Сіздің жауабыңыз' : 'Ваш ответ'}: </span>{field.submitted === null || String(field.submitted).trim() === '' ? (language === 'kk' ? 'Жауап жоқ' : 'Нет ответа') : `${field.submitted}${field.unit ? ` ${field.unit}` : ''}`}</dd>
                <dd className="assessment-answer-expected">{field.id === 'selection' && field.correct
                  ? (language === 'kk' ? 'Сіздің жауабыңыз дұрыс' : 'Ваш ответ правильный')
                  : <><span>{language === 'kk' ? 'Дұрыс жауап' : 'Правильный ответ'}: </span>{typeof field.expected === 'number' ? field.expected.toLocaleString(language === 'kk' ? 'kk-KZ' : 'ru-RU', { maximumFractionDigits: 6 }) : field.expected}{field.unit && ` ${field.unit}`}</>}</dd>
              </div>)}</dl>
            </article>)}
          </section>}
          <div className="assessment-result-meta">
            <span>{copy.variant}: <strong>{submitted.student?.variantNumber ?? submitted.variantCode}</strong></span>
            <span>{copy.eventsRecorded}: <strong>{submitted.violationsCount}</strong></span>
          </div>
          <p className="assessment-source">{copy.sources}: Чертов А. Г., Воробьёв А. А. — {submitted.sources.join(', ')}.{midterm && (language === 'kk' ? ' Теориялық сұрақтар берілген RU/ҚАЗ дәрістері негізінде құрастырылған.' : ' Теоретические вопросы составлены по предоставленным лекциям RU/ҚАЗ.')}</p>
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
        <section className="assessment-intro assessment-entry">
          <AssessmentLanguageSwitch language={language} onChange={changeLanguage} />
          <div className="assessment-entry-grid">
          <div className="assessment-entry-description">
          <span className="assessment-kicker">{copy.kicker}</span>
          <h1>{copy.introTitle}</h1>
          <p className="assessment-entry-meta">{copy.introMeta}</p>
          <p className="assessment-intro-lead">{copy.introLead}</p>
          <div className="assessment-rules">
            {copy.rules.map((rule, index) => <div key={rule}><strong>{String(index + 1).padStart(2, '0')}</strong><span>{index === 2 ? <b>{rule}</b> : rule}</span></div>)}
          </div>
          <p className="assessment-policy-note">{copy.penaltyRules}</p>
          </div>
          <div className="assessment-entry-form">
          <h2>{copy.formTitle}</h2>
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
          {error && <p className="assessment-error">{error}</p>}
          <button className="assessment-primary" onClick={start} disabled={loading || !completeStudent(student)}>{copy.start}</button>
          <small>{copy.consent}</small>
          </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="assessment-shell assessment-shell--active">
      <div className="assessment-watermark" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <span key={index}>
            {active.student?.variantNumber ?? active.variantCode} · {active.student ? `${active.student.lastName} ${active.student.firstName} · ${active.student.group}` : user?.email}
          </span>
        ))}
      </div>
      <section className="assessment-topbar">
        <div><span>{copy.variant}</span><strong>{active.student?.variantNumber ?? active.variantCode}</strong></div>
        <div className={remaining < 300 ? 'assessment-timer urgent' : 'assessment-timer'}><span>{copy.remaining}</span><strong>{formatTime(remaining)}</strong></div>
        <div><span>{copy.filled}</span><strong>{answeredFields}/{totalFields}</strong></div>
        <div><span>{copy.events}</span><strong>{violations}</strong></div>
        <AssessmentLanguageSwitch language={language} onChange={changeLanguage} />
        {!fullscreen && document.fullscreenEnabled && <button className="assessment-fullscreen-button" onClick={enterFullscreen}>{copy.fullscreen}</button>}
      </section>

      <header className="assessment-heading">
        <span className="assessment-kicker">{copy.kicker}</span>
        <h1>{copy.heading}</h1>
        <p>{copy.headingLead}</p>
      </header>

      <section className="assessment-tasks">
        <div className="assessment-policy-note" role={eventWarning ? 'status' : undefined}>
          {eventWarning && <p><b>{active.policyVersion === 1 ? copy.eventWarning : copy.legacyRules}</b></p>}
          <p>{active.policyVersion === 1 ? copy.penaltyRules : copy.legacyRules}</p>
          {active.policyVersion === 1 && <p>{copy.deduction}: <b>{penaltyPoints} п. п.</b></p>}
        </div>
        {active.tasks.map((task) => (
          <article className="assessment-task" key={task.id}>
            <div className="assessment-task-number">{String(task.kind === 'multiple' ? task.order - 5 : task.order).padStart(2, '0')}</div>
            <div className="assessment-task-content">
              <span className="assessment-task-level">{task.kind === 'multiple' ? (language === 'kk' ? 'Теория' : 'Теория') : copy.task} {task.kind === 'multiple' ? task.order - 5 : task.order}{task.points !== undefined && ` · ${task.points} ${language === 'kk' || task.points === 1 ? 'балл' : 'балла'}`}</span>
              <h2>{task.title}</h2>
              <p>{task.text}</p>
              {task.diagram === 'molecule' && <MoleculeDiagram />}
              {task.kind === 'multiple' ? <fieldset className="assessment-options">
                <legend>{language === 'kk' ? 'Барлық дұрыс жауаптарды таңдаңыз' : 'Выберите все верные ответы'}</legend>
                {task.options?.map(option => <label key={option.id}>
                  <input type="checkbox" checked={(answers[task.id]?.selection ?? '').split(',').includes(option.id)}
                    onChange={e => setAnswers(current => {
                      const selected = new Set((current[task.id]?.selection ?? '').split(',').filter(Boolean));
                      if (e.target.checked) selected.add(option.id); else selected.delete(option.id);
                      return { ...current, [task.id]: { selection: [...selected].sort().join(',') } };
                    })} />
                  <span>{option.text}</span>
                </label>)}
              </fieldset> : <div className="assessment-fields">
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
              </div>}
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
            <p>{active.policyVersion === 1 ? `${copy.deduction}: ${penaltyPoints} п. п. (макс. 10).` : copy.legacyRules}</p>
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
