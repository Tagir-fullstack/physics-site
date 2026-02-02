import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { saveQuizResult } from '../../lib/supabase';
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
    question: "Кто провёл эксперимент по рассеянию альфа-частиц, который привёл к открытию атомного ядра?",
    options: ["Нильс Бор", "Эрнест Резерфорд", "Джеймс Чедвик", "Мария Кюри"],
    correctAnswer: 1
  },
  {
    id: 2,
    question: "Что показала капельная модель ядра?",
    options: [
      "Ядро состоит из электронов",
      "Ядро подобно капле несжимаемой жидкости",
      "Ядро имеет кубическую форму",
      "Ядро состоит только из протонов"
    ],
    correctAnswer: 1
  },
  {
    id: 3,
    question: "Что представляет собой альфа-частица?",
    options: [
      "Электрон",
      "Протон",
      "Ядро гелия-4",
      "Нейтрон"
    ],
    correctAnswer: 2
  },
  {
    id: 4,
    question: "Какая частица испускается при бета-минус распаде?",
    options: [
      "Позитрон",
      "Электрон и антинейтрино",
      "Альфа-частица",
      "Гамма-квант"
    ],
    correctAnswer: 1
  },
  {
    id: 5,
    question: "Чем является гамма-излучение?",
    options: [
      "Потоком электронов",
      "Потоком протонов",
      "Электромагнитным излучением высокой энергии",
      "Потоком нейтронов"
    ],
    correctAnswer: 2
  },
  {
    id: 6,
    question: "Что такое период полураспада?",
    options: [
      "Время, за которое распадается всё вещество",
      "Время, за которое распадается половина радиоактивных ядер",
      "Время одного распада",
      "Время между двумя распадами"
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
      "Ядро поглощает энергию",
      "Ядро превращается в другой элемент с испусканием частиц",
      "Ядро увеличивается в размере",
      "Ядро остаётся неизменным"
    ],
    correctAnswer: 1
  },
  {
    id: 9,
    question: "Что необходимо для поддержания цепной ядерной реакции?",
    options: [
      "Низкая температура",
      "Критическая масса делящегося вещества",
      "Наличие электронов",
      "Высокое давление"
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
    if (currentQuestion < questions.length - 1) {
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
    questions.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) {
        correctCount++;
      }
    });

    const percentage = Math.round((correctCount / questions.length) * 100);
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
        total_questions: questions.length,
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

  const percentage = Math.round((score / questions.length) * 100);
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
        alignItems: 'center'
      }}
    >
      <div style={{ width: '100%', maxWidth: '700px' }}>
        <div style={{
          marginBottom: '0.5rem',
          color: '#666',
          fontSize: '0.85rem',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          textAlign: 'center'
        }}>
          Физика Атомного ядра
        </div>

        <h1 style={{
          fontSize: 'clamp(1.5rem, 5vw, 2.2rem)',
          color: '#000',
          marginBottom: '1.5rem',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          Тест по ядерной физике
        </h1>

        {/* Student Info Form */}
        {stage === 'info' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              backgroundColor: '#f8f9fa',
              borderRadius: '12px',
              padding: '2rem',
              border: '1px solid #e0e0e0'
            }}
          >
            <h2 style={{ marginBottom: '1.5rem', color: '#333', fontSize: '1.3rem' }}>
              Введите ваши данные
            </h2>
            <form onSubmit={handleStartQuiz}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555', fontWeight: '500' }}>
                  ФИО ученика *
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  required
                  placeholder="Например: Иванов Иван Иванович"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555', fontWeight: '500' }}>
                  Класс *
                </label>
                <input
                  type="text"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  required
                  placeholder="Например: 11А"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555', fontWeight: '500' }}>
                  Школа *
                </label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  required
                  placeholder="Например: СШ №1 г. Алматы"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  width: '100%',
                  backgroundColor: '#667eea',
                  color: 'white',
                  padding: '0.875rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a6fd6'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#667eea'}
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
              backgroundColor: '#f8f9fa',
              borderRadius: '12px',
              padding: '2rem',
              border: '1px solid #e0e0e0'
            }}
          >
            {/* Progress */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#666', fontSize: '0.9rem' }}>
                  Вопрос {currentQuestion + 1} из {questions.length}
                </span>
                <span style={{ color: '#666', fontSize: '0.9rem' }}>
                  {Object.keys(answers).length} отвечено
                </span>
              </div>
              <div style={{
                height: '6px',
                backgroundColor: '#e0e0e0',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${((currentQuestion + 1) / questions.length) * 100}%`,
                  backgroundColor: '#667eea',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* Question */}
            <h3 style={{
              fontSize: '1.2rem',
              color: '#333',
              marginBottom: '1.5rem',
              lineHeight: '1.6'
            }}>
              {questions[currentQuestion].question}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {questions[currentQuestion].options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    border: answers[currentQuestion] === index ? '2px solid #667eea' : '1px solid #ddd',
                    backgroundColor: answers[currentQuestion] === index ? '#f0f3ff' : 'white',
                    textAlign: 'left',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: '#333'
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: answers[currentQuestion] === index ? '#667eea' : '#e0e0e0',
                    color: answers[currentQuestion] === index ? 'white' : '#666',
                    textAlign: 'center',
                    lineHeight: '24px',
                    marginRight: '0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: '500'
                  }}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  {option}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
              <button
                onClick={handlePrev}
                disabled={currentQuestion === 0}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  backgroundColor: currentQuestion === 0 ? '#f5f5f5' : 'white',
                  color: currentQuestion === 0 ? '#aaa' : '#333',
                  cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '1rem'
                }}
              >
                Назад
              </button>

              {currentQuestion < questions.length - 1 ? (
                <button
                  onClick={handleNext}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#667eea',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}
                >
                  Далее
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={Object.keys(answers).length < questions.length || isSubmitting}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: Object.keys(answers).length < questions.length ? '#ccc' : '#28a745',
                    color: 'white',
                    cursor: Object.keys(answers).length < questions.length ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}
                >
                  {isSubmitting ? 'Сохранение...' : 'Завершить тест'}
                </button>
              )}
            </div>

            {Object.keys(answers).length < questions.length && currentQuestion === questions.length - 1 && (
              <p style={{ color: '#dc3545', fontSize: '0.9rem', marginTop: '1rem', textAlign: 'center' }}>
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
              backgroundColor: '#f8f9fa',
              borderRadius: '12px',
              padding: '2rem',
              border: '1px solid #e0e0e0',
              textAlign: 'center'
            }}
          >
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              backgroundColor: percentage >= 50 ? '#d4edda' : '#f8d7da',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              border: `3px solid ${percentage >= 50 ? '#28a745' : '#dc3545'}`
            }}>
              <span style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: percentage >= 50 ? '#28a745' : '#dc3545'
              }}>
                {percentage}%
              </span>
            </div>

            <h2 style={{ fontSize: '1.5rem', color: '#333', marginBottom: '0.5rem' }}>
              Тест завершён!
            </h2>

            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              {studentName}
            </p>

            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ color: '#666' }}>Правильных ответов: </span>
                <span style={{ fontWeight: 'bold', color: '#333' }}>{score} из {questions.length}</span>
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: percentage >= 75 ? '#28a745' : percentage >= 50 ? '#ffc107' : '#dc3545'
              }}>
                Оценка: {grade}
              </div>
            </div>

            {submitError && (
              <p style={{ color: '#dc3545', fontSize: '0.9rem', marginBottom: '1rem' }}>
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
                  borderRadius: '8px',
                  border: '1px solid #667eea',
                  backgroundColor: 'white',
                  color: '#667eea',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                Пройти заново
              </button>
              <Link
                to="/nuclear/rutherford"
                style={{
                  padding: '0.875rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#667eea',
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '1rem',
                  fontWeight: '500'
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
              color: '#667eea',
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
