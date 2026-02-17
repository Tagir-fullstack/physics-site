import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  generateUserCode,
  setUserCode,
  getUserCode,
  setPreQuizCompleted,
  savePreQuizResult,
  createUser
} from '../lib/supabase';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

// Те же 10 вопросов, что и в итоговом тесте
const questions: Question[] = [
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
  }
];

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

interface PreQuizProps {
  onComplete: (userCode: string) => void;
  showCodeField?: boolean; // Показывать поле кода (для повторного прохождения)
  onClose?: () => void; // Закрыть без прохождения
}

export default function PreQuiz({ onComplete, showCodeField = false, onClose }: PreQuizProps) {
  const [stage, setStage] = useState<'info' | 'quiz' | 'result'>('info');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [school, setSchool] = useState('');
  const [isTeacher, setIsTeacher] = useState(false);
  const [wantsToSkip, setWantsToSkip] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userCode, setUserCodeState] = useState('');
  const [enteredUserCode, setEnteredUserCode] = useState('');

  const shuffledQuestions = useMemo(() => shuffleQuestions(questions), []);

  // Автозаполнение кода из localStorage при showCodeField
  useEffect(() => {
    if (showCodeField) {
      const savedCode = getUserCode();
      if (savedCode) {
        setEnteredUserCode(savedCode);
      }
    }
  }, [showCodeField]);

  const handleStartQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studentName.trim() && studentClass.trim() && school.trim()) {
      // Используем введённый код или генерируем новый
      const code = enteredUserCode.trim() || generateUserCode();
      setUserCodeState(code);
      setUserCode(code);

      // Создаём пользователя в БД только если код новый
      if (!enteredUserCode.trim()) {
        try {
          await createUser({
            user_code: code,
            student_name: studentName,
            student_class: studentClass,
            school: school,
            is_teacher: isTeacher
          });
        } catch (err) {
          console.error('Error creating user:', err);
          // Продолжаем даже если не удалось сохранить в БД
        }
      }

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
    setScore(correctCount);

    setIsSubmitting(true);

    try {
      await savePreQuizResult({
        user_code: userCode,
        score: correctCount,
        total_questions: shuffledQuestions.length,
        percentage: percentage,
        answers: answers
      });
    } catch (err) {
      console.error('Error saving pre-quiz result:', err);
    } finally {
      setPreQuizCompleted();
      setIsSubmitting(false);
      setStage('result');
    }
  };

  const handleContinue = () => {
    window.scrollTo(0, 0);
    onComplete(userCode);
  };

  const percentage = Math.round((score / shuffledQuestions.length) * 100);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          overflowY: 'auto'
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflowY: 'auto',
            backgroundColor: '#0a0a0a',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div style={{ padding: '2rem', position: 'relative' }}>
            {/* Кнопка закрытия - только если есть onClose */}
            {onClose && stage === 'info' && (
              <button
                onClick={onClose}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#888',
                  fontSize: '1.5rem',
                  padding: '5px',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            )}

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
              Входное тестирование
            </div>

            <h1 style={{
              fontSize: 'clamp(1.3rem, 4vw, 1.8rem)',
              color: '#ffffff',
              marginBottom: '1.5rem',
              fontWeight: 900,
              textAlign: 'center',
              fontFamily: "'CCUltimatum', Arial, sans-serif"
            }}>
              Тест по ядерной <span style={{ color: '#FC6255' }}>физике</span>
            </h1>

            {/* Info Stage */}
            {stage === 'info' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div style={{
                  backgroundColor: 'rgba(74, 144, 226, 0.1)',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  border: '1px solid rgba(74, 144, 226, 0.3)'
                }}>
                  <p style={{ color: '#cccccc', margin: 0, fontSize: '0.95rem', lineHeight: 1.6 }}>
                    Перед просмотром анимаций пройдите короткий тест для оценки ваших текущих знаний.
                    После изучения всех материалов вы пройдёте итоговый тест, чтобы увидеть свой прогресс.
                  </p>
                </div>

                <form onSubmit={handleStartQuiz}>
                  {/* Поле кода - показывается при повторном прохождении */}
                  {showCodeField && (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cccccc', fontWeight: '500' }}>
                        Ваш код (если уже проходили тест)
                      </label>
                      <input
                        type="text"
                        value={enteredUserCode}
                        onChange={(e) => setEnteredUserCode(e.target.value.toUpperCase())}
                        placeholder="Например: PHY-A1B2C"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(74, 144, 226, 0.3)',
                          fontSize: '1rem',
                          boxSizing: 'border-box',
                          backgroundColor: 'rgba(74, 144, 226, 0.1)',
                          color: '#4a90e2',
                          outline: 'none',
                          fontWeight: 'bold',
                          letterSpacing: '1px'
                        }}
                      />
                      <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                        Если вы проходите тест впервые, оставьте поле пустым
                      </p>
                    </div>
                  )}

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cccccc', fontWeight: '500' }}>
                      Имя *
                    </label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      required
                      placeholder="Например: Тагир"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        fontSize: '1rem',
                        boxSizing: 'border-box',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cccccc', fontWeight: '500' }}>
                      Класс *
                    </label>
                    <input
                      type="text"
                      value={studentClass}
                      onChange={(e) => setStudentClass(e.target.value)}
                      required
                      placeholder="Например: 11б"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        fontSize: '1rem',
                        boxSizing: 'border-box',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cccccc', fontWeight: '500' }}>
                      Школа *
                    </label>
                    <input
                      type="text"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      required
                      placeholder="Например: ОСШИОД №4 Болашак"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        fontSize: '1rem',
                        boxSizing: 'border-box',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Чекбокс учителя - скрываем при повторном прохождении */}
                  {!showCodeField && (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#cccccc',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={isTeacher}
                          onChange={(e) => {
                            setIsTeacher(e.target.checked);
                            if (!e.target.checked) setWantsToSkip(false);
                          }}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        Я учитель
                      </label>
                    </div>
                  )}

                  {/* Опция пропуска для учителей */}
                  {isTeacher && !showCodeField && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ marginBottom: '1.5rem' }}
                    >
                      <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        color: '#cccccc',
                        cursor: 'pointer',
                        paddingLeft: '1.5rem'
                      }}>
                        <input
                          type="checkbox"
                          checked={wantsToSkip}
                          onChange={(e) => setWantsToSkip(e.target.checked)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px' }}
                        />
                        <span style={{ lineHeight: 1.4 }}>
                          Я хочу посмотреть на анимации
                          <span style={{ display: 'block', fontSize: '0.85rem', color: '#888', marginTop: '0.25rem' }}>
                            (пропустить входной тест)
                          </span>
                        </span>
                      </label>
                    </motion.div>
                  )}

                  {!isTeacher && <div style={{ marginBottom: '0.5rem' }} />}

                  {wantsToSkip && isTeacher ? (
                    <button
                      type="button"
                      onClick={() => {
                        // Просто пропускаем тест без сохранения данных
                        setPreQuizCompleted();
                        window.scrollTo(0, 0);
                        onComplete('TEACHER-SKIP');
                      }}
                      style={{
                        width: '100%',
                        backgroundColor: '#4a90e2',
                        color: 'white',
                        padding: '0.875rem',
                        borderRadius: '50px',
                        border: 'none',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        fontFamily: "'CCUltimatum', Arial, sans-serif",
                        boxShadow: '0 0 15px rgba(74, 144, 226, 0.3)'
                      }}
                    >
                      Перейти к анимациям
                    </button>
                  ) : (
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
                  )}
                </form>
              </motion.div>
            )}

            {/* Quiz Stage */}
            {stage === 'quiz' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ minHeight: '450px', display: 'flex', flexDirection: 'column' }}
              >
                {/* Progress */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#888', fontSize: '0.9rem' }}>
                      Вопрос {currentQuestion + 1} из {shuffledQuestions.length}
                    </span>
                    <span style={{ color: '#888', fontSize: '0.9rem' }}>
                      {Object.keys(answers).length} отвечено
                    </span>
                  </div>
                  <div style={{
                    height: '6px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${((currentQuestion + 1) / shuffledQuestions.length) * 100}%`,
                      backgroundColor: '#4a90e2',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {/* Question */}
                <h3 style={{
                  fontSize: '1.2rem',
                  color: '#ffffff',
                  lineHeight: '1.6',
                  marginBottom: '1.5rem'
                }}>
                  {shuffledQuestions[currentQuestion].question}
                </h3>

                {/* Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', flex: 1 }}>
                  {shuffledQuestions[currentQuestion].options.map((option, index) => {
                    const isSelected = answers[currentQuestion] === index;
                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswer(index)}
                        style={{
                          padding: '1rem',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #4a90e2' : '1px solid rgba(255, 255, 255, 0.1)',
                          backgroundColor: isSelected ? 'rgba(74, 144, 226, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                          textAlign: 'left',
                          fontSize: '1rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          color: '#ffffff'
                        }}
                      >
                        <span style={{
                          display: 'inline-block',
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: isSelected ? '#4a90e2' : 'rgba(255, 255, 255, 0.1)',
                          color: isSelected ? 'white' : '#888',
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
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <button
                    onClick={handlePrev}
                    disabled={currentQuestion === 0}
                    style={{
                      padding: '0.75rem 1.5rem',
                      borderRadius: '50px',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      backgroundColor: 'transparent',
                      color: currentQuestion === 0 ? '#555' : '#cccccc',
                      cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '1rem',
                      fontFamily: "'CCUltimatum', Arial, sans-serif"
                    }}
                  >
                    Назад
                  </button>

                  {currentQuestion < shuffledQuestions.length - 1 ? (
                    <button
                      onClick={handleNext}
                      style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '50px',
                        border: 'none',
                        backgroundColor: '#4a90e2',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600',
                        fontFamily: "'CCUltimatum', Arial, sans-serif"
                      }}
                    >
                      Далее
                    </button>
                  ) : (
                    <button
                      onClick={handleFinish}
                      disabled={Object.keys(answers).length < shuffledQuestions.length || isSubmitting}
                      style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '50px',
                        border: 'none',
                        backgroundColor: Object.keys(answers).length < shuffledQuestions.length ? '#333' : '#27ae60',
                        color: 'white',
                        cursor: Object.keys(answers).length < shuffledQuestions.length ? 'not-allowed' : 'pointer',
                        fontSize: '1rem',
                        fontWeight: '600',
                        fontFamily: "'CCUltimatum', Arial, sans-serif"
                      }}
                    >
                      {isSubmitting ? 'Сохранение...' : 'Завершить тест'}
                    </button>
                  )}
                </div>

                {Object.keys(answers).length < shuffledQuestions.length && currentQuestion === shuffledQuestions.length - 1 && (
                  <p style={{ color: '#FC6255', fontSize: '0.9rem', marginTop: '1rem', textAlign: 'center' }}>
                    Пожалуйста, ответьте на все вопросы
                  </p>
                )}
              </motion.div>
            )}

            {/* Result Stage */}
            {stage === 'result' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center' }}
              >
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(74, 144, 226, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  border: '3px solid #4a90e2'
                }}>
                  <span style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: '#4a90e2',
                    fontFamily: "'CCUltimatum', Arial, sans-serif"
                  }}>
                    {percentage}%
                  </span>
                </div>

                <h2 style={{
                  fontSize: '1.5rem',
                  color: '#ffffff',
                  marginBottom: '0.5rem',
                  fontFamily: "'CCUltimatum', Arial, sans-serif"
                }}>
                  Входной тест завершён!
                </h2>

                <p style={{ color: '#888', marginBottom: '1rem' }}>
                  {studentName}, ваш результат: {score} из {shuffledQuestions.length}
                </p>

                {/* User Code */}
                <div style={{
                  backgroundColor: 'rgba(74, 144, 226, 0.1)',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  border: '1px solid rgba(74, 144, 226, 0.3)'
                }}>
                  <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    Ваш уникальный код:
                  </p>
                  <p style={{
                    color: '#4a90e2',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    fontFamily: "'CCUltimatum', Arial, sans-serif",
                    margin: 0,
                    letterSpacing: '2px'
                  }}>
                    {userCode}
                  </p>
                  <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    Запомните этот код для итогового тестирования
                  </p>
                </div>

                <p style={{ color: '#cccccc', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  Теперь вы можете изучать анимации. После просмотра всех материалов
                  пройдите итоговый тест, чтобы увидеть свой прогресс!
                </p>

                <button
                  onClick={handleContinue}
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
                    fontFamily: "'CCUltimatum', Arial, sans-serif",
                    boxShadow: '0 0 15px rgba(252, 98, 85, 0.3)'
                  }}
                >
                  Перейти к анимациям
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
