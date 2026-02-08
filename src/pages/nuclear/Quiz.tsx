import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { saveQuizResult } from '../../lib/supabase';
import SpeakButton from '../../components/SpeakButton';
import '../../styles/page-layout.css';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

const questions: Question[] = [
  {
    id: 1,
    question: "Кто провёл эксперимент по рассеянию альфа-частиц на алюминиевую фольгу, который привёл к открытию атомного ядра?",
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

export default function Quiz() {
  const [stage, setStage] = useState<'info' | 'quiz' | 'result'>('info');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [school, setSchool] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const shuffledQuestions = useMemo(() => shuffleQuestions(questions), []);

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
      await saveQuizResult({
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

  const percentage = Math.round((score / shuffledQuestions.length) * 100);
  const grade = calculateGrade(percentage);

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
        backgroundColor: '#0a0a0a'
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
          color: '#ffffff',
          marginBottom: '1.5rem',
          fontWeight: 900,
          textAlign: 'center',
          fontFamily: "'CCUltimatum', Arial, sans-serif"
        }}>
          Тест по ядерной <span style={{ color: '#FC6255' }}>физике</span>
        </h1>

        {/* Student Info Form */}
        {stage === 'info' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '16px',
              padding: '2rem',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <h2 style={{
              marginBottom: '1.5rem',
              color: '#ffffff',
              fontSize: '1.3rem',
              fontFamily: "'CCUltimatum', Arial, sans-serif"
            }}>
              Введите ваши данные
            </h2>
            <form onSubmit={handleStartQuiz}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cccccc', fontWeight: '500' }}>
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
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Пожалуйста, заполните это поле.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
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
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cccccc', fontWeight: '500' }}>
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
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    outline: 'none'
                  }}
                />
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
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '16px',
              padding: '2rem',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              minHeight: '580px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Progress */}
            <div style={{ marginBottom: '1.5rem', flex: '0 0 auto' }}>
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
                  backgroundColor: '#FC6255',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* Question */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <h3 style={{
                fontSize: '1.4rem',
                color: '#ffffff',
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
                      border: isSelected ? '2px solid #FC6255' : '1px solid rgba(255, 255, 255, 0.1)',
                      backgroundColor: isSelected ? 'rgba(252, 98, 85, 0.1)' : 'rgba(255, 255, 255, 0.03)',
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
                      backgroundColor: isSelected ? '#FC6255' : 'rgba(255, 255, 255, 0.1)',
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
                    backgroundColor: '#FC6255',
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
                    fontFamily: "'CCUltimatum', Arial, sans-serif",
                    boxShadow: Object.keys(answers).length >= shuffledQuestions.length ? '0 0 15px rgba(39, 174, 96, 0.3)' : 'none'
                  }}
                >
                  {isSubmitting ? 'Сохранение...' : 'Завершить тест'}
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
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '16px',
              padding: '2rem',
              border: '1px solid rgba(255, 255, 255, 0.06)',
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
              color: '#ffffff',
              marginBottom: '0.5rem',
              fontFamily: "'CCUltimatum', Arial, sans-serif"
            }}>
              Тест завершён!
            </h2>

            <p style={{ color: '#888', marginBottom: '1.5rem' }}>
              {studentName}
            </p>

            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ color: '#888' }}>Правильных ответов: </span>
                <span style={{ fontWeight: 'bold', color: '#ffffff' }}>{score} из {shuffledQuestions.length}</span>
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
            </div>
          </motion.div>
        )}

        {/* Back link */}
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
      </div>
    </motion.main>
  );
}
