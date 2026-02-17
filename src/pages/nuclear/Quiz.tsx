import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { savePostQuizResult, saveTeacherSurvey, getUserCode } from '../../lib/supabase';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useQuizMode } from '../../context/QuizModeContext';
import SpeakButton from '../../components/SpeakButton';
import '../../styles/page-layout.css';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

// Оригинальные 10 вопросов + 5 новых по анимациям
const questions: Question[] = [
  // Оригинальные вопросы
  {
    id: 1,
    question: "Кто провёл эксперимент по рассеянию альфа-частиц на золотую фольгу, который привёл к открытию атомного ядра?",
    options: ["Нильс Бор", "Эрнест Резерфорд", "Джеймс Чедвик", "Мария Кюри"],
    correctAnswer: 1
  },
  {
    id: 2,
    question: "Что показала капельная модель ядра?",
    options: [
      "Ядро состоит из электронов",
      "Ядро подобно капле несжимаемой жидкости",
      "Ядро имеет не сферическую форму из протонов и нейтронов",
      "Ядро состоит только из протонов"
    ],
    correctAnswer: 1
  },
  {
    id: 3,
    question: "Что представляет собой альфа-частица?",
    options: [
      "Ядро дейтерия",
      "Ядро изотопа гелия-3",
      "Ядро гелия-4",
      "Ядро лития-4"
    ],
    correctAnswer: 2
  },
  {
    id: 4,
    question: "Какая частица испускается при бета-минус распаде?",
    options: [
      "Позитрон и нейтрино",
      "Электрон и антинейтрино",
      "Альфа-частица и электрон",
      "Гамма-квант"
    ],
    correctAnswer: 1
  },
  {
    id: 5,
    question: "Чем является гамма-излучение?",
    options: [
      "Электромагнитным излучением самой низкой энергии",
      "Электрон с наивысшей скоростью",
      "Электромагнитным излучением высокой энергии",
      "Потоком нейтронов и протонов"
    ],
    correctAnswer: 2
  },
  {
    id: 6,
    question: "Что такое период полураспада?",
    options: [
      "Время, за которое распадается всё вещество",
      "Время, за которое распадается половина радиоактивных ядер",
      "Время, за которое масса вещества уменьшается вдвое",
      "Время, за которое половина радиоактивных ядер превращается в гелии-4"
    ],
    correctAnswer: 1
  },
  {
    id: 7,
    question: "Какое взаимодействие удерживает нуклоны в ядре?",
    options: [
      "Гравитационное",
      "Электромагнитное",
      "Сильное (ядерное)",
      "Слабое"
    ],
    correctAnswer: 2
  },
  {
    id: 8,
    question: "Что происходит при радиоактивном распаде?",
    options: [
      "Ядро поглощает энергию и испускает фотон",
      "Ядро превращается в другой элемент с испусканием частиц",
      "Ядро увеличивается в размере и испускает только нейтроны",
      "Ядро остаётся неизменным, но испускает гамма-излучение"
    ],
    correctAnswer: 1
  },
  {
    id: 9,
    question: "Что необходимо для поддержания цепной ядерной реакции?",
    options: [
      "Низкая температура и высокое давление",
      "Критическая масса делящегося вещества",
      "Наличие не радиоактивного материала",
      "Высокое давление и отсутствие нейтронов в реакции"
    ],
    correctAnswer: 1
  },
  {
    id: 10,
    question: "Какой заряд имеет нейтрон?",
    options: [
      "Положительный",
      "Отрицательный",
      "Нулевой",
      "Переменный"
    ],
    correctAnswer: 2
  },
  // 5 новых вопросов по анимациям
  {
    id: 11,
    question: "Какой результат эксперимента Резерфорда был неожиданным и привёл к открытию атомного ядра?",
    options: [
      "Все альфа-частицы проходили сквозь фольгу без отклонения",
      "Некоторые альфа-частицы отклонялись на углы более 90° и отскакивали назад",
      "Альфа-частицы полностью поглощались фольгой",
      "Альфа-частицы превращались в бета-частицы при прохождении через фольгу"
    ],
    correctAnswer: 1
  },
  {
    id: 12,
    question: "Почему альфа-частица обладает высокой ионизирующей способностью, но низкой проникающей способностью?",
    options: [
      "Из-за высокой скорости и малой массы",
      "Из-за большой массы и двойного положительного заряда, которые вызывают интенсивную ионизацию",
      "Из-за отрицательного заряда и малого размера",
      "Из-за нейтрального заряда и большой энергии"
    ],
    correctAnswer: 1
  },
  {
    id: 13,
    question: "Что происходит с позитроном при его остановке в веществе?",
    options: [
      "Он захватывается атомом и становится частью его электронной оболочки",
      "Он аннигилирует с электроном, образуя гамма-кванты",
      "Он превращается в нейтрон",
      "Он отражается обратно к источнику"
    ],
    correctAnswer: 1
  },
  {
    id: 14,
    question: "Какая сила вызывает отклонение заряженных частиц в магнитном поле?",
    options: [
      "Гравитационная сила",
      "Сила Лоренца",
      "Ядерная сила",
      "Сила трения"
    ],
    correctAnswer: 1
  },
  {
    id: 15,
    question: "Какое соотношение размеров атома и ядра следует из опыта Резерфорда?",
    options: [
      "Размеры атома и ядра примерно одинаковы",
      "Ядро в 10 раз меньше атома",
      "Ядро примерно в 10 000 раз меньше атома (если ядро = горошина, то атом = футбольное поле)",
      "Атом в 2 раза больше ядра"
    ],
    correctAnswer: 2
  }
];

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return '5 (Отлично)';
  if (percentage >= 75) return '4 (Хорошо)';
  if (percentage >= 50) return '3 (Удовлетворительно)';
  return '2 (Неудовлетворительно)';
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface ShuffledQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

function shuffleQuestions(qs: Question[]): ShuffledQuestion[] {
  return shuffle(qs).map(q => {
    const correctText = q.options[q.correctAnswer];
    const shuffledOptions = shuffle(q.options);
    return {
      id: q.id,
      question: q.question,
      options: shuffledOptions,
      correctAnswer: shuffledOptions.indexOf(correctText),
    };
  });
}

// Вопросы анкеты для учителей
interface SurveyQuestion {
  id: string;
  question: string;
  type: 'rating' | 'boolean' | 'text' | 'select';
  options?: string[];
  required?: boolean;
}

const surveyQuestions: SurveyQuestion[] = [
  { id: 'q1', question: 'Оцените общее впечатление от анимаций', type: 'rating', required: true },
  { id: 'q2', question: 'Оцените качество визуализации', type: 'rating', required: true },
  { id: 'q3', question: 'Оцените научную точность анимаций', type: 'rating', required: true },
  { id: 'q4', question: 'Насколько понятны анимации для учеников?', type: 'rating', required: true },
  { id: 'q5', question: 'Использовали бы вы эти анимации на уроках?', type: 'boolean', required: true },
  { id: 'q6', question: 'Помогают ли анимации в понимании материала?', type: 'rating', required: true },
  { id: 'q7', question: 'Оцените уровень вовлечённости учеников при просмотре', type: 'rating', required: true },
  { id: 'q8', question: 'Хотели бы вы анимации по другим разделам физики?', type: 'boolean', required: true },
  { id: 'q9', question: 'Какие разделы физики вы бы хотели видеть? (необязательно)', type: 'text', required: false },
  { id: 'q10', question: 'Как вы оцениваете длительность анимаций?', type: 'select', options: ['Слишком короткие', 'Оптимальная длительность', 'Слишком длинные'], required: true },
  { id: 'q11', question: 'Сравните с другими образовательными ресурсами', type: 'rating', required: true },
  { id: 'q12', question: 'Что бы вы улучшили в анимациях? (необязательно)', type: 'text', required: false },
  { id: 'q13', question: 'Рекомендовали бы вы эти анимации коллегам?', type: 'boolean', required: true },
  { id: 'q14', question: 'Оцените вероятность рекомендации (1-10)', type: 'rating', required: true },
  { id: 'q15', question: 'Дополнительные комментарии (необязательно)', type: 'text', required: false },
];

export default function Quiz() {
  const [stage, setStage] = useState<'info' | 'quiz' | 'result' | 'survey' | 'complete'>('info');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [school, setSchool] = useState('');
  const [enteredUserCode, setEnteredUserCode] = useState('');
  const [isTeacher, setIsTeacher] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string | number | boolean>>({});

  const shuffledQuestions = useMemo(() => shuffleQuestions(questions), []);

  const { lightTheme, enabled: a11yEnabled, fontSize } = useAccessibility();
  const { setQuizActive } = useQuizMode();
  const isLightTheme = a11yEnabled && lightTheme;
  const [isMobile, setIsMobile] = useState(false);

  // Определение мобильного устройства
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 600);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Блокируем навигацию во время прохождения теста
  useEffect(() => {
    setQuizActive(stage === 'quiz');
    return () => setQuizActive(false);
  }, [stage, setQuizActive]);

  // Автозаполнение кода пользователя из localStorage
  useEffect(() => {
    const savedCode = getUserCode();
    if (savedCode) {
      setEnteredUserCode(savedCode);
    }
  }, []);

  const handleStartQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentName.trim() && studentClass.trim() && school.trim()) {
      setStage('quiz');
    }
  };

  const handleAnswer = (answerIndex: number) => {
    setAnswers(prev => ({ ...prev, [currentQuestion]: answerIndex }));
  };

  const handleNext = () => {
    if (currentQuestion < shuffledQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleFinish = async () => {
    let correctCount = 0;
    shuffledQuestions.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) {
        correctCount++;
      }
    });

    const percentage = Math.round((correctCount / shuffledQuestions.length) * 100);
    const grade = calculateGrade(percentage);
    setScore(correctCount);

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await savePostQuizResult({
        user_code: enteredUserCode || 'GUEST',
        student_name: studentName,
        student_class: studentClass,
        school: school,
        score: correctCount,
        total_questions: shuffledQuestions.length,
        percentage: percentage,
        grade: grade,
        answers: answers
      });
    } catch {
      setSubmitError('Результат не сохранён в базу данных, но ваша оценка посчитана.');
    } finally {
      setIsSubmitting(false);
      setStage('result');
    }
  };

  const handleGoToSurvey = () => {
    setStage('survey');
  };

  const handleSurveyAnswer = (questionId: string, value: string | number | boolean) => {
    setSurveyAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmitSurvey = async () => {
    setIsSubmitting(true);
    try {
      await saveTeacherSurvey({
        user_code: enteredUserCode || 'GUEST',
        teacher_name: studentName,
        school: school,
        q1_overall_impression: surveyAnswers.q1 as number,
        q2_visual_quality: surveyAnswers.q2 as number,
        q3_scientific_accuracy: surveyAnswers.q3 as number,
        q4_ease_of_understanding: surveyAnswers.q4 as number,
        q5_would_use_in_class: surveyAnswers.q5 as boolean,
        q6_helps_learning: surveyAnswers.q6 as number,
        q7_student_engagement: surveyAnswers.q7 as number,
        q8_want_other_topics: surveyAnswers.q8 as boolean,
        q9_which_topics: surveyAnswers.q9 as string,
        q10_animation_length: surveyAnswers.q10 === 'Слишком короткие' ? 1 : surveyAnswers.q10 === 'Оптимальная длительность' ? 2 : 3,
        q11_comparison_to_others: surveyAnswers.q11 as number,
        q12_improvements: surveyAnswers.q12 as string,
        q13_would_recommend: surveyAnswers.q13 as boolean,
        q14_recommendation_score: surveyAnswers.q14 as number,
        q15_additional_comments: surveyAnswers.q15 as string,
      });
    } catch (err) {
      console.error('Error saving survey:', err);
    } finally {
      setIsSubmitting(false);
      setStage('complete');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSkipSurvey = () => {
    setStage('complete');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const percentage = Math.round((score / shuffledQuestions.length) * 100);
  const grade = calculateGrade(percentage);

  // Проверка заполненности обязательных вопросов анкеты
  const isSurveyValid = surveyQuestions
    .filter(q => q.required)
    .every(q => surveyAnswers[q.id] !== undefined && surveyAnswers[q.id] !== '');

  return (
    <motion.main
      className="page-content"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      style={{
        marginTop: '80px',
        minHeight: 'calc(100vh - 80px)',
        padding: '1.5rem 1rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: isLightTheme ? '#ffffff' : '#0a0a0a'
      }}
    >
      <div style={{ width: '100%', maxWidth: '700px' }}>
        <div style={{
          marginBottom: '0.5rem',
          color: '#4a90e2',
          fontSize: '0.85rem',
          textTransform: 'uppercase',
          letterSpacing: '3px',
          textAlign: 'center',
          fontFamily: "'CCUltimatum', Arial, sans-serif",
          fontWeight: 700
        }}>
          Физика Атомного ядра
        </div>

        <h1 style={{
          fontSize: 'clamp(1.5rem, 5vw, 2.2rem)',
          color: isLightTheme ? '#1a1a1a' : '#ffffff',
          marginBottom: '1.5rem',
          fontWeight: 900,
          textAlign: 'center',
          fontFamily: "'CCUltimatum', Arial, sans-serif"
        }}>
          {stage === 'survey' ? 'Анкета для ' : 'Итоговый тест по ядерной '}
          <span style={{ color: '#FC6255' }}>{stage === 'survey' ? 'учителей' : 'физике'}</span>
        </h1>

        {/* Student Info Form */}
        {stage === 'info' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              backgroundColor: isLightTheme ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)',
              borderRadius: '16px',
              padding: '2rem',
              border: isLightTheme ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <h2 style={{
              marginBottom: '1.5rem',
              color: isLightTheme ? '#1a1a1a' : '#ffffff',
              fontSize: '1.3rem',
              fontFamily: "'CCUltimatum', Arial, sans-serif"
            }}>
              Введите ваши данные
            </h2>
            <form onSubmit={handleStartQuiz}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: isLightTheme ? '#333' : '#cccccc', fontWeight: '500' }}>
                  Ваш код (из входного теста)
                </label>
                <input
                  type="text"
                  value={enteredUserCode}
                  onChange={(e) => setEnteredUserCode(e.target.value.toUpperCase())}
                  placeholder="Например: PHY-A1B2"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: isLightTheme ? '1px solid rgba(74, 144, 226, 0.5)' : '1px solid rgba(74, 144, 226, 0.3)',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    backgroundColor: isLightTheme ? 'rgba(74, 144, 226, 0.08)' : 'rgba(74, 144, 226, 0.1)',
                    color: '#4a90e2',
                    outline: 'none',
                    fontWeight: 'bold',
                    letterSpacing: '1px'
                  }}
                />
                <p style={{ color: isLightTheme ? '#888' : '#666', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                  Если вы не проходили входной тест, оставьте поле пустым
                </p>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: isLightTheme ? '#333' : '#cccccc', fontWeight: '500' }}>
                  Имя *
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  required
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Пожалуйста, заполните это поле.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  placeholder="Например: Тагир"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: isLightTheme ? '1px solid rgba(0, 0, 0, 0.15)' : '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    backgroundColor: isLightTheme ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                    color: isLightTheme ? '#1a1a1a' : '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: isLightTheme ? '#333' : '#cccccc', fontWeight: '500' }}>
                  Класс *
                </label>
                <input
                  type="text"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  required
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Пожалуйста, заполните это поле.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  placeholder="Например: 11б"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: isLightTheme ? '1px solid rgba(0, 0, 0, 0.15)' : '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    backgroundColor: isLightTheme ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                    color: isLightTheme ? '#1a1a1a' : '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: isLightTheme ? '#333' : '#cccccc', fontWeight: '500' }}>
                  Школа *
                </label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  required
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Пожалуйста, заполните это поле.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  placeholder="Например: ОСШИОД №4 Болашак"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: isLightTheme ? '1px solid rgba(0, 0, 0, 0.15)' : '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    backgroundColor: isLightTheme ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
                    color: isLightTheme ? '#1a1a1a' : '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: isLightTheme ? '#333' : '#cccccc',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={isTeacher}
                    onChange={(e) => setIsTeacher(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  Я учитель
                </label>
              </div>
              <button
                type="submit"
                style={{
                  width: '100%',
                  backgroundColor: '#FC6255',
                  color: 'white',
                  padding: '0.875rem',
                  borderRadius: '50px',
                  border: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontFamily: "'CCUltimatum', Arial, sans-serif",
                  boxShadow: '0 0 15px rgba(252, 98, 85, 0.3)'
                }}
              >
                Начать тест
              </button>
            </form>
          </motion.div>
        )}

        {/* Quiz Questions */}
        {stage === 'quiz' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              backgroundColor: isLightTheme ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)',
              borderRadius: '16px',
              padding: '2rem',
              border: isLightTheme ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.06)',
              minHeight: '580px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Progress */}
            <div style={{ marginBottom: '1.5rem', flex: '0 0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: isLightTheme ? '#666' : '#888', fontSize: '0.9rem' }}>
                  Вопрос {currentQuestion + 1} из {shuffledQuestions.length}
                </span>
                <span style={{ color: isLightTheme ? '#666' : '#888', fontSize: '0.9rem' }}>
                  {Object.keys(answers).length} отвечено
                </span>
              </div>
              <div style={{
                height: '6px',
                backgroundColor: isLightTheme ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${((currentQuestion + 1) / shuffledQuestions.length) * 100}%`,
                  backgroundColor: '#FC6255',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* Question */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{
                fontSize: '1.4rem',
                color: isLightTheme ? '#1a1a1a' : '#ffffff',
                lineHeight: '1.6',
                flex: 1
              }}>
                {shuffledQuestions[currentQuestion].question}
              </h3>
              <SpeakButton text={shuffledQuestions[currentQuestion].question} />
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', flex: '1 1 auto' }}>
              {shuffledQuestions[currentQuestion].options.map((option, index) => {
                const isSelected = answers[currentQuestion] === index;
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #FC6255' : isLightTheme ? '1px solid rgba(0, 0, 0, 0.15)' : '1px solid rgba(255, 255, 255, 0.1)',
                      backgroundColor: isSelected ? 'rgba(252, 98, 85, 0.1)' : isLightTheme ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                      textAlign: 'left',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      color: isLightTheme ? '#1a1a1a' : '#ffffff'
                    }}
                  >
                    <span style={{
                      display: 'inline-block',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: isSelected ? '#FC6255' : isLightTheme ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)',
                      color: isSelected ? 'white' : isLightTheme ? '#666' : '#888',
                      textAlign: 'center',
                      lineHeight: '26px',
                      marginRight: '0.75rem',
                      fontSize: '0.85rem',
                      fontWeight: '600'
                    }}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: isMobile ? '0.5rem' : '1rem', justifyContent: 'space-between', marginTop: 'auto', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
              <button
                onClick={handlePrev}
                disabled={currentQuestion === 0}
                style={{
                  padding: isMobile ? '0.6rem 1rem' : '0.75rem 1.5rem',
                  borderRadius: '50px',
                  border: isLightTheme ? '1px solid rgba(0, 0, 0, 0.2)' : '1px solid rgba(255, 255, 255, 0.15)',
                  backgroundColor: isLightTheme ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                  color: currentQuestion === 0 ? (isLightTheme ? '#aaa' : '#555') : (isLightTheme ? '#333' : '#cccccc'),
                  cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  fontFamily: "'CCUltimatum', Arial, sans-serif",
                  flex: isMobile ? '1 1 auto' : '0 0 auto'
                }}
              >
                Назад
              </button>

              {currentQuestion < shuffledQuestions.length - 1 ? (
                <button
                  onClick={handleNext}
                  style={{
                    padding: isMobile ? '0.6rem 1rem' : '0.75rem 1.5rem',
                    borderRadius: '50px',
                    border: 'none',
                    backgroundColor: '#FC6255',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: isMobile ? '0.9rem' : '1rem',
                    fontWeight: '600',
                    fontFamily: "'CCUltimatum', Arial, sans-serif",
                    flex: isMobile ? '1 1 auto' : '0 0 auto'
                  }}
                >
                  Далее
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={Object.keys(answers).length < shuffledQuestions.length || isSubmitting}
                  style={{
                    padding: isMobile ? '0.6rem 1rem' : '0.75rem 1.5rem',
                    borderRadius: '50px',
                    border: 'none',
                    backgroundColor: Object.keys(answers).length < shuffledQuestions.length ? '#333' : '#27ae60',
                    color: 'white',
                    cursor: Object.keys(answers).length < shuffledQuestions.length ? 'not-allowed' : 'pointer',
                    fontSize: isMobile ? '0.9rem' : '1rem',
                    fontWeight: '600',
                    fontFamily: "'CCUltimatum', Arial, sans-serif",
                    boxShadow: Object.keys(answers).length >= shuffledQuestions.length ? '0 0 15px rgba(39, 174, 96, 0.3)' : 'none',
                    flex: isMobile ? '1 1 auto' : '0 0 auto'
                  }}
                >
                  {isSubmitting ? 'Сохранение...' : (isMobile ? 'Завершить' : 'Завершить тест')}
                </button>
              )}
            </div>

            {Object.keys(answers).length < shuffledQuestions.length && currentQuestion === shuffledQuestions.length - 1 && (
              <p style={{ color: '#FC6255', fontSize: '0.9rem', marginTop: '1rem', textAlign: 'center' }}>
                Пожалуйста, ответьте на все вопросы перед завершением
              </p>
            )}
          </motion.div>
        )}

        {/* Results */}
        {stage === 'result' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              backgroundColor: isLightTheme ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)',
              borderRadius: '16px',
              padding: '2rem',
              border: isLightTheme ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.06)',
              textAlign: 'center'
            }}
          >
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              backgroundColor: percentage >= 50 ? 'rgba(39, 174, 96, 0.15)' : 'rgba(252, 98, 85, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              border: `3px solid ${percentage >= 50 ? '#27ae60' : '#FC6255'}`
            }}>
              <span style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: percentage >= 50 ? '#27ae60' : '#FC6255',
                fontFamily: "'CCUltimatum', Arial, sans-serif"
              }}>
                {percentage}%
              </span>
            </div>

            <h2 style={{
              fontSize: '1.5rem',
              color: isLightTheme ? '#1a1a1a' : '#ffffff',
              marginBottom: '0.5rem',
              fontFamily: "'CCUltimatum', Arial, sans-serif"
            }}>
              Итоговый тест завершён!
            </h2>

            <p style={{ color: isLightTheme ? '#666' : '#888', marginBottom: '1.5rem' }}>
              {studentName}
            </p>

            <div style={{
              backgroundColor: isLightTheme ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              border: isLightTheme ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ color: isLightTheme ? '#666' : '#888' }}>Правильных ответов: </span>
                <span style={{ fontWeight: 'bold', color: isLightTheme ? '#1a1a1a' : '#ffffff' }}>{score} из {shuffledQuestions.length}</span>
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                fontFamily: "'CCUltimatum', Arial, sans-serif",
                color: percentage >= 75 ? '#27ae60' : percentage >= 50 ? '#f39c12' : '#FC6255'
              }}>
                Оценка: {grade}
              </div>
            </div>

            {submitError && (
              <p style={{ color: '#FC6255', fontSize: '0.9rem', marginBottom: '1rem' }}>
                {submitError}
              </p>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {isTeacher ? (
                <button
                  onClick={handleGoToSurvey}
                  style={{
                    padding: '0.875rem 1.5rem',
                    borderRadius: '50px',
                    border: 'none',
                    backgroundColor: '#FC6255',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    fontFamily: "'CCUltimatum', Arial, sans-serif"
                  }}
                >
                  Пройти анкету для учителей
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setStage('info');
                      setCurrentQuestion(0);
                      setAnswers({});
                      setScore(0);
                      setStudentName('');
                      setStudentClass('');
                      setSchool('');
                    }}
                    style={{
                      padding: '0.875rem 1.5rem',
                      borderRadius: '50px',
                      border: '1px solid #FC6255',
                      backgroundColor: 'transparent',
                      color: '#FC6255',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      fontWeight: '600',
                      fontFamily: "'CCUltimatum', Arial, sans-serif"
                    }}
                  >
                    Пройти заново
                  </button>
                  <Link
                    to="/nuclear/rutherford"
                    style={{
                      padding: '0.875rem 1.5rem',
                      borderRadius: '50px',
                      border: 'none',
                      backgroundColor: '#FC6255',
                      color: 'white',
                      textDecoration: 'none',
                      fontSize: '1.2rem',
                      fontWeight: '600',
                      fontFamily: "'CCUltimatum', Arial, sans-serif"
                    }}
                  >
                    К материалам
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Teacher Survey */}
        {stage === 'survey' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              backgroundColor: isLightTheme ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)',
              borderRadius: '16px',
              padding: '2rem',
              border: isLightTheme ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <p style={{ color: isLightTheme ? '#666' : '#888', marginBottom: '1.5rem', textAlign: 'center' }}>
              Пожалуйста, ответьте на вопросы об анимациях. Ваше мнение очень важно для нас!
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {surveyQuestions.map((sq) => (
                <div key={sq.id} style={{
                  backgroundColor: isLightTheme ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '10px',
                  padding: '1rem',
                  border: isLightTheme ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <label style={{ display: 'block', marginBottom: '0.75rem', color: isLightTheme ? '#1a1a1a' : '#ffffff', fontWeight: '500' }}>
                    {sq.question} {sq.required && <span style={{ color: '#FC6255' }}>*</span>}
                  </label>

                  {sq.type === 'rating' && (
                    <div style={{ display: 'flex', gap: isMobile ? '0.4rem' : '0.5rem', flexWrap: 'wrap' }}>
                      {(sq.id === 'q14' ? [1,2,3,4,5,6,7,8,9,10] : [1,2,3,4,5]).map(num => (
                        <button
                          key={num}
                          onClick={() => handleSurveyAnswer(sq.id, num)}
                          style={{
                            width: isMobile ? '36px' : '40px',
                            height: isMobile ? '36px' : '40px',
                            borderRadius: '50%',
                            border: surveyAnswers[sq.id] === num ? '2px solid #4a90e2' : isLightTheme ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.2)',
                            backgroundColor: surveyAnswers[sq.id] === num ? 'rgba(74, 144, 226, 0.2)' : 'transparent',
                            color: surveyAnswers[sq.id] === num ? '#4a90e2' : isLightTheme ? '#555' : '#888',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: isMobile ? '0.85rem' : '0.95rem',
                            lineHeight: 1,
                            padding: 0,
                            flexShrink: 0
                          }}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  )}

                  {sq.type === 'boolean' && (
                    <div style={{ display: 'flex', gap: isMobile ? '0.75rem' : '1rem' }}>
                      {['Да', 'Нет'].map(opt => (
                        <button
                          key={opt}
                          onClick={() => handleSurveyAnswer(sq.id, opt === 'Да')}
                          style={{
                            padding: isMobile ? '0.4rem 1.2rem' : '0.5rem 1.5rem',
                            borderRadius: '20px',
                            border: surveyAnswers[sq.id] === (opt === 'Да') ? '2px solid #4a90e2' : isLightTheme ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.2)',
                            backgroundColor: surveyAnswers[sq.id] === (opt === 'Да') ? 'rgba(74, 144, 226, 0.2)' : 'transparent',
                            color: surveyAnswers[sq.id] === (opt === 'Да') ? '#4a90e2' : isLightTheme ? '#555' : '#888',
                            cursor: 'pointer',
                            fontSize: isMobile ? '0.85rem' : '1rem'
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {sq.type === 'select' && sq.options && (
                    <div style={{ display: 'flex', gap: isMobile ? '0.4rem' : '0.5rem', flexWrap: 'wrap' }}>
                      {sq.options.map(opt => (
                        <button
                          key={opt}
                          onClick={() => handleSurveyAnswer(sq.id, opt)}
                          style={{
                            padding: isMobile ? '0.4rem 0.8rem' : '0.5rem 1rem',
                            borderRadius: '20px',
                            border: surveyAnswers[sq.id] === opt ? '2px solid #4a90e2' : isLightTheme ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.2)',
                            backgroundColor: surveyAnswers[sq.id] === opt ? 'rgba(74, 144, 226, 0.2)' : 'transparent',
                            color: surveyAnswers[sq.id] === opt ? '#4a90e2' : isLightTheme ? '#555' : '#888',
                            cursor: 'pointer',
                            fontSize: isMobile ? '0.8rem' : '0.9rem'
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {sq.type === 'text' && (
                    <textarea
                      value={(surveyAnswers[sq.id] as string) || ''}
                      onChange={(e) => handleSurveyAnswer(sq.id, e.target.value)}
                      placeholder="Ваш ответ..."
                      style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: isLightTheme ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: isLightTheme ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
                        color: isLightTheme ? '#1a1a1a' : '#ffffff',
                        fontSize: '1rem',
                        resize: 'vertical',
                        boxSizing: 'border-box'
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: isMobile ? '0.75rem' : '1rem', justifyContent: 'center', marginTop: '2rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleSkipSurvey}
                style={{
                  padding: isMobile ? '0.6rem 1.2rem' : '0.75rem 1.5rem',
                  borderRadius: '50px',
                  border: isLightTheme ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.2)',
                  backgroundColor: isLightTheme ? 'rgba(0,0,0,0.05)' : 'transparent',
                  color: isLightTheme ? '#555' : '#888',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  fontFamily: "'CCUltimatum', Arial, sans-serif"
                }}
              >
                Пропустить
              </button>
              <button
                onClick={handleSubmitSurvey}
                disabled={!isSurveyValid || isSubmitting}
                style={{
                  padding: isMobile ? '0.6rem 1.2rem' : '0.75rem 1.5rem',
                  borderRadius: '50px',
                  border: 'none',
                  backgroundColor: isSurveyValid ? '#27ae60' : '#333',
                  color: 'white',
                  cursor: isSurveyValid ? 'pointer' : 'not-allowed',
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  fontWeight: '600',
                  fontFamily: "'CCUltimatum', Arial, sans-serif"
                }}
              >
                {isSubmitting ? 'Отправка...' : (isMobile ? 'Отправить' : 'Отправить анкету')}
              </button>
            </div>
          </motion.div>
        )}

        {/* Complete */}
        {stage === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              backgroundColor: isLightTheme ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)',
              borderRadius: '16px',
              padding: '2rem',
              border: isLightTheme ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.06)',
              textAlign: 'center'
            }}
          >
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'rgba(39, 174, 96, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              border: '3px solid #27ae60',
              fontSize: '2.5rem',
              color: '#27ae60'
            }}>
              ✓
            </div>

            <h2 style={{
              fontSize: '1.5rem',
              color: isLightTheme ? '#1a1a1a' : '#ffffff',
              marginBottom: '1rem',
              fontFamily: "'CCUltimatum', Arial, sans-serif"
            }}>
              Спасибо за участие!
            </h2>

            <p style={{ color: isLightTheme ? '#666' : '#888', marginBottom: '1.5rem' }}>
              Ваши ответы помогут нам улучшить качество образовательных материалов.
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                to="/nuclear/rutherford"
                style={{
                  padding: '0.875rem 1.5rem',
                  borderRadius: '50px',
                  border: 'none',
                  backgroundColor: '#FC6255',
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  fontFamily: "'CCUltimatum', Arial, sans-serif"
                }}
              >
                К материалам
              </Link>
            </div>
          </motion.div>
        )}

        {/* Back link */}
        {(stage === 'info' || stage === 'complete') && (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link
              to="/nuclear/chain"
              style={{
                color: '#4a90e2',
                textDecoration: 'none',
                fontSize: '0.95rem'
              }}
            >
              Вернуться к последнему видео
            </Link>
          </div>
        )}
      </div>
    </motion.main>
  );
}
