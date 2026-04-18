import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { getTopicQuiz, type TopicQuestion } from '../data/topicQuizzes';
import { saveTopicQuizResult } from '../lib/supabase';
import '../styles/topic-quiz.css';

interface TopicQuizProps {
  topicPath: string;
  isOpen: boolean;
  onClose: () => void;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function TopicQuiz({ topicPath, isOpen, onClose }: TopicQuizProps) {
  const { profile } = useAuth();
  const { lightTheme, enabled: a11yEnabled } = useAccessibility();
  const isLightTheme = a11yEnabled && lightTheme;

  const quizData = getTopicQuiz(topicPath);

  const [stage, setStage] = useState<'quiz' | 'result'>('quiz');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Перемешиваем вопросы и варианты ответов
  const shuffledQuestions = useMemo(() => {
    if (!quizData) return [];
    return shuffleArray(quizData.questions).map(q => ({
      ...q,
      shuffledOptions: shuffleArray(q.options.map((opt, idx) => ({ text: opt, originalIndex: idx }))),
    }));
  }, [quizData]);

  if (!isOpen || !quizData) return null;

  const handleAnswer = (questionIndex: number, answerIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: answerIndex }));
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

  const handleSubmit = async () => {
    let correctCount = 0;
    const answersRecord: Record<number, number> = {};

    shuffledQuestions.forEach((q, idx) => {
      const selectedAnswer = answers[idx];
      if (selectedAnswer !== undefined) {
        const originalIndex = q.shuffledOptions[selectedAnswer].originalIndex;
        answersRecord[q.id] = originalIndex;
        if (originalIndex === q.correctAnswer) {
          correctCount++;
        }
      }
    });

    const percentage = Math.round((correctCount / shuffledQuestions.length) * 100);
    setScore(correctCount);
    setStage('result');

    // Сохраняем результат
    if (profile?.id) {
      setIsSubmitting(true);
      try {
        await saveTopicQuizResult({
          profile_id: profile.id,
          topic_path: topicPath,
          score: correctCount,
          total_questions: shuffledQuestions.length,
          answers: answersRecord
        });
      } catch (err) {
        console.error('Error saving topic quiz result:', err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleClose = () => {
    // Сбрасываем состояние при закрытии
    setStage('quiz');
    setCurrentQuestion(0);
    setAnswers({});
    setScore(0);
    onClose();
  };

  const allAnswered = Object.keys(answers).length === shuffledQuestions.length;
  const percentage = Math.round((score / shuffledQuestions.length) * 100);

  const getResultMessage = () => {
    if (percentage >= 80) return { text: 'Отлично!', color: '#27ae60' };
    if (percentage >= 60) return { text: 'Хорошо!', color: '#4a90e2' };
    if (percentage >= 40) return { text: 'Неплохо', color: '#f39c12' };
    return { text: 'Попробуйте ещё раз', color: '#e74c3c' };
  };

  const handleRetry = () => {
    setStage('quiz');
    setCurrentQuestion(0);
    setAnswers({});
    setScore(0);
  };

  const content = (
    <div className={`topic-quiz-overlay ${isLightTheme ? 'light' : ''}`} onClick={handleClose}>
      <motion.div
        className="topic-quiz-modal"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <button className="topic-quiz-close" onClick={handleClose}>&times;</button>

        <div className="topic-quiz-header">
          <h2>{quizData.topicName}</h2>
          <p>Проверьте свои знания</p>
        </div>

        <AnimatePresence mode="wait">
          {stage === 'quiz' ? (
            <motion.div
              key="quiz"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="topic-quiz-content"
            >
              {/* Прогресс */}
              <div className="topic-quiz-progress">
                {shuffledQuestions.map((_, idx) => (
                  <button
                    key={idx}
                    className={`topic-quiz-progress-dot ${
                      idx === currentQuestion ? 'active' : ''
                    } ${answers[idx] !== undefined ? 'answered' : ''}`}
                    onClick={() => setCurrentQuestion(idx)}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              {/* Вопрос */}
              <div className="topic-quiz-question">
                <p className="topic-quiz-question-text">
                  {shuffledQuestions[currentQuestion]?.question}
                </p>

                <div className="topic-quiz-options">
                  {shuffledQuestions[currentQuestion]?.shuffledOptions.map((option, idx) => (
                    <button
                      key={idx}
                      className={`topic-quiz-option ${answers[currentQuestion] === idx ? 'selected' : ''}`}
                      onClick={() => handleAnswer(currentQuestion, idx)}
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
              </div>

              {/* Навигация */}
              <div className="topic-quiz-navigation">
                <button
                  className="topic-quiz-nav-btn"
                  onClick={handlePrev}
                  disabled={currentQuestion === 0}
                >
                  Назад
                </button>

                {currentQuestion === shuffledQuestions.length - 1 ? (
                  <button
                    className="topic-quiz-submit-btn"
                    onClick={handleSubmit}
                    disabled={!allAnswered || isSubmitting}
                  >
                    {isSubmitting ? 'Сохранение...' : 'Завершить'}
                  </button>
                ) : (
                  <button
                    className="topic-quiz-nav-btn primary"
                    onClick={handleNext}
                  >
                    Далее
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="topic-quiz-result"
            >
              <h3 style={{ color: getResultMessage().color }}>
                {getResultMessage().text}
              </h3>
              <div className="topic-quiz-result-score">
                <span className="score-value">{score}</span>
                <span className="score-divider">/</span>
                <span className="score-total">{shuffledQuestions.length}</span>
              </div>
              <div className="topic-quiz-result-percentage">
                {percentage}%
              </div>

              {!profile && (
                <p className="topic-quiz-result-hint">
                  Войдите в аккаунт, чтобы сохранять результаты
                </p>
              )}

              <div className="topic-quiz-result-buttons">
                {score <= 4 && (
                  <button className="topic-quiz-retry-btn" onClick={handleRetry}>
                    Пройти заново
                  </button>
                )}
                <button className="topic-quiz-close-btn" onClick={handleClose}>
                  Закрыть
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );

  return createPortal(content, document.body);
}
