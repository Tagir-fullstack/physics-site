-- ===========================================
-- SQL скрипт для создания таблиц в Supabase
-- Физика: входное/итоговое тестирование + анкета учителей
-- ===========================================

-- 1. Таблица пользователей (для отслеживания уникальных пользователей)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_code VARCHAR(10) UNIQUE NOT NULL, -- Уникальный код пользователя (например: "PHY-A1B2C")
  student_name VARCHAR(255) NOT NULL,
  student_class VARCHAR(50) NOT NULL,
  school VARCHAR(255) NOT NULL,
  is_teacher BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для быстрого поиска по коду
CREATE INDEX IF NOT EXISTS idx_users_user_code ON users(user_code);

-- 2. Таблица результатов входного теста (pre-quiz)
CREATE TABLE IF NOT EXISTS pre_quiz_results (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_code VARCHAR(10) NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  answers JSONB NOT NULL, -- Ответы пользователя
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для поиска по коду пользователя
CREATE INDEX IF NOT EXISTS idx_pre_quiz_user_code ON pre_quiz_results(user_code);

-- 3. Таблица результатов итогового теста (post-quiz)
-- Расширяем существующую таблицу quiz_results или создаём новую
CREATE TABLE IF NOT EXISTS post_quiz_results (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_code VARCHAR(10) NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  student_class VARCHAR(50) NOT NULL,
  school VARCHAR(255) NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  grade VARCHAR(50) NOT NULL,
  answers JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для поиска по коду пользователя
CREATE INDEX IF NOT EXISTS idx_post_quiz_user_code ON post_quiz_results(user_code);

-- 4. Таблица анкетирования учителей
CREATE TABLE IF NOT EXISTS teacher_survey (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_code VARCHAR(10) NOT NULL,
  teacher_name VARCHAR(255) NOT NULL,
  school VARCHAR(255) NOT NULL,
  subject VARCHAR(100), -- Предмет преподавания
  experience_years INTEGER, -- Стаж работы

  -- Ответы на вопросы анкеты (1-5 шкала или текст)
  -- Общее впечатление
  q1_overall_impression INTEGER CHECK (q1_overall_impression BETWEEN 1 AND 5), -- Общее впечатление от анимаций
  q2_visual_quality INTEGER CHECK (q2_visual_quality BETWEEN 1 AND 5), -- Качество визуализации
  q3_scientific_accuracy INTEGER CHECK (q3_scientific_accuracy BETWEEN 1 AND 5), -- Научная точность
  q4_ease_of_understanding INTEGER CHECK (q4_ease_of_understanding BETWEEN 1 AND 5), -- Понятность для учеников

  -- Применение в обучении
  q5_would_use_in_class BOOLEAN, -- Использовали бы на уроках
  q6_helps_learning INTEGER CHECK (q6_helps_learning BETWEEN 1 AND 5), -- Помогают ли в обучении
  q7_student_engagement INTEGER CHECK (q7_student_engagement BETWEEN 1 AND 5), -- Вовлечённость учеников

  -- Контент и разделы
  q8_want_other_topics BOOLEAN, -- Хотели бы анимации по другим разделам
  q9_which_topics TEXT, -- Какие разделы физики (свободный ответ)
  q10_animation_length INTEGER CHECK (q10_animation_length BETWEEN 1 AND 3), -- Длина анимаций: 1-короткие, 2-оптимально, 3-длинные

  -- Сравнение и улучшения
  q11_comparison_to_others INTEGER CHECK (q11_comparison_to_others BETWEEN 1 AND 5), -- Сравнение с другими ресурсами
  q12_improvements TEXT, -- Что улучшить (свободный ответ)

  -- Рекомендации
  q13_would_recommend BOOLEAN, -- Рекомендовали бы коллегам
  q14_recommendation_score INTEGER CHECK (q14_recommendation_score BETWEEN 1 AND 10), -- NPS оценка 1-10
  q15_additional_comments TEXT, -- Дополнительные комментарии

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для поиска по коду пользователя
CREATE INDEX IF NOT EXISTS idx_teacher_survey_user_code ON teacher_survey(user_code);

-- 5. Row Level Security (RLS) политики
-- Включаем RLS для всех таблиц
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_survey ENABLE ROW LEVEL SECURITY;

-- Политики для анонимного доступа (INSERT только)
CREATE POLICY "Allow anonymous insert" ON users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous insert" ON pre_quiz_results FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous insert" ON post_quiz_results FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous insert" ON teacher_survey FOR INSERT TO anon WITH CHECK (true);

-- Политики для чтения своих данных по user_code
CREATE POLICY "Allow read own data" ON users FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read own data" ON pre_quiz_results FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read own data" ON post_quiz_results FOR SELECT TO anon USING (true);
CREATE POLICY "Allow read own data" ON teacher_survey FOR SELECT TO anon USING (true);

-- ===========================================
-- Примечания:
-- 1. Выполните этот скрипт в SQL Editor Supabase
-- 2. user_code генерируется на клиенте в формате "PHY-XXXX"
-- 3. Все таблицы связаны через user_code для отслеживания пользователя
-- 4. Анкета учителей содержит 15 вопросов разного типа
-- ===========================================
