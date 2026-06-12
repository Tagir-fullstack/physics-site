import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Results will not be saved.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ==========================================
// Интерфейсы
// ==========================================

export interface User {
  id?: string;
  user_code: string;
  student_name: string;
  student_class: string;
  school: string;
  is_teacher: boolean;
  created_at?: string;
}

export interface PreQuizResult {
  id?: number;
  user_id?: string;
  user_code: string;
  profile_id?: string;  // ID авторизованного пользователя
  class_id?: string | null;
  score: number;
  total_questions: number;
  percentage: number;
  answers: Record<number, number>;
  created_at?: string;
}

export interface PostQuizResult {
  id?: number;
  user_id?: string;
  user_code: string;
  profile_id?: string;  // ID авторизованного пользователя
  class_id?: string | null;
  student_name: string;
  student_class: string;
  school: string;
  score: number;
  total_questions: number;
  percentage: number;
  grade: string;
  answers: Record<number, number>;
  created_at?: string;
}

export interface TeacherSurvey {
  id?: number;
  user_id?: string;
  user_code: string;
  teacher_name: string;
  school: string;
  subject?: string;
  experience_years?: number;
  q1_overall_impression?: number;
  q2_visual_quality?: number;
  q3_scientific_accuracy?: number;
  q4_ease_of_understanding?: number;
  q5_would_use_in_class?: boolean;
  q6_helps_learning?: number;
  q7_student_engagement?: number;
  q8_want_other_topics?: boolean;
  q9_which_topics?: string;
  q10_animation_length?: number;
  q11_comparison_to_others?: number;
  q12_improvements?: string;
  q13_would_recommend?: boolean;
  q14_recommendation_score?: number;
  q15_additional_comments?: string;
  created_at?: string;
}

// Старый интерфейс для обратной совместимости
export interface QuizResult {
  id?: number;
  student_name: string;
  student_class: string;
  school: string;
  score: number;
  total_questions: number;
  percentage: number;
  grade: string;
  answers: Record<number, number>;
  created_at?: string;
}

// ==========================================
// Генерация уникального кода пользователя
// ==========================================

export function generateUserCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Без похожих символов (0, O, 1, I)
  let code = 'PHY-';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ==========================================
// Работа с localStorage для хранения user_code
// ==========================================

const USER_CODE_KEY = 'physics_user_code';
const PRE_QUIZ_COMPLETED_KEY = 'physics_pre_quiz_completed';

export function getUserCode(): string | null {
  return localStorage.getItem(USER_CODE_KEY);
}

export function setUserCode(code: string): void {
  localStorage.setItem(USER_CODE_KEY, code);
}

export function hasCompletedPreQuiz(): boolean {
  return localStorage.getItem(PRE_QUIZ_COMPLETED_KEY) === 'true';
}

export function setPreQuizCompleted(): void {
  localStorage.setItem(PRE_QUIZ_COMPLETED_KEY, 'true');
}

// ==========================================
// Функции для работы с базой данных
// ==========================================

// Создание пользователя
export async function createUser(userData: Omit<User, 'id' | 'created_at'>): Promise<User | null> {
  if (!supabase) {
    console.warn('Supabase not configured. User not saved.');
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select();

  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }

  return data?.[0] || null;
}

// Получение пользователя по коду
export async function getUserByCode(userCode: string): Promise<User | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_code', userCode)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // Not found error
      console.error('Error fetching user:', error);
    }
    return null;
  }

  return data;
}

// Сохранение результатов входного теста
export async function savePreQuizResult(result: Omit<PreQuizResult, 'id' | 'created_at'>): Promise<PreQuizResult | null> {
  if (!supabase) {
    console.warn('Supabase not configured. Pre-quiz result not saved.');
    return null;
  }

  const { data, error } = await supabase
    .from('pre_quiz_results')
    .insert([result])
    .select();

  if (error) {
    console.error('Error saving pre-quiz result:', error);
    throw error;
  }

  return data?.[0] || null;
}

// Сохранение результатов итогового теста
export async function savePostQuizResult(result: Omit<PostQuizResult, 'id' | 'created_at'>): Promise<PostQuizResult | null> {
  if (!supabase) {
    console.warn('Supabase not configured. Post-quiz result not saved.');
    return null;
  }

  const { data, error } = await supabase
    .from('post_quiz_results')
    .insert([result])
    .select();

  if (error) {
    console.error('Error saving post-quiz result:', error);
    throw error;
  }

  return data?.[0] || null;
}

// Старая функция для обратной совместимости
export async function saveQuizResult(result: Omit<QuizResult, 'id' | 'created_at'>) {
  if (!supabase) {
    console.warn('Supabase not configured. Result not saved.');
    return null;
  }

  const { data, error } = await supabase
    .from('quiz_results')
    .insert([result])
    .select();

  if (error) {
    console.error('Error saving quiz result:', error);
    throw error;
  }

  return data?.[0];
}

// Сохранение анкеты учителя
export async function saveTeacherSurvey(survey: Omit<TeacherSurvey, 'id' | 'created_at'>): Promise<TeacherSurvey | null> {
  if (!supabase) {
    console.warn('Supabase not configured. Teacher survey not saved.');
    return null;
  }

  const { data, error } = await supabase
    .from('teacher_survey')
    .insert([survey])
    .select();

  if (error) {
    console.error('Error saving teacher survey:', error);
    throw error;
  }

  return data?.[0] || null;
}

// Проверка, прошёл ли пользователь входной тест (по базе данных)
export async function hasUserCompletedPreQuiz(userCode: string): Promise<boolean> {
  if (!supabase) {
    return hasCompletedPreQuiz(); // Fallback to localStorage
  }

  const { data, error } = await supabase
    .from('pre_quiz_results')
    .select('id')
    .eq('user_code', userCode)
    .limit(1);

  if (error) {
    console.error('Error checking pre-quiz completion:', error);
    return hasCompletedPreQuiz(); // Fallback to localStorage
  }

  return data && data.length > 0;
}

// Получение результатов пользователя
export async function getUserResults(userCode: string): Promise<{
  preQuiz: PreQuizResult | null;
  postQuiz: PostQuizResult | null;
}> {
  if (!supabase) {
    return { preQuiz: null, postQuiz: null };
  }

  const [preQuizResult, postQuizResult] = await Promise.all([
    supabase
      .from('pre_quiz_results')
      .select('*')
      .eq('user_code', userCode)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('post_quiz_results')
      .select('*')
      .eq('user_code', userCode)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
  ]);

  return {
    preQuiz: preQuizResult.data || null,
    postQuiz: postQuizResult.data || null
  };
}

// ==========================================
// Функции для авторизованных пользователей
// ==========================================

export interface QuizHistoryItem {
  id: string;
  quiz_type: 'pre_quiz' | 'post_quiz' | 'topic_quiz';
  topic_path?: string;
  topic_name?: string;
  score: number;
  total_questions: number;
  percentage: number;
  grade?: string;
  created_at: string;
}

// Маппинг путей тем к названиям
const TOPIC_NAMES: Record<string, string> = {
  '/nuclear/rutherford': 'Опыт Резерфорда',
  '/nuclear/droplet': 'Капельная модель',
  '/nuclear/alpha': 'Альфа-распад',
  '/nuclear/beta': 'Бета-распад',
  '/nuclear/gamma': 'Гамма-излучение',
  '/nuclear/halflife': 'Период полураспада',
  '/nuclear/interactions': 'Ядерные взаимодействия',
  '/nuclear/decay': 'Деление ядра',
  '/nuclear/chain': 'Цепная реакция',
};

// Получение истории тестов по profile_id
export async function getQuizHistory(profileId: string): Promise<QuizHistoryItem[]> {
  if (!supabase) {
    return [];
  }

  // Получаем результаты из всех таблиц
  const [preQuizResults, postQuizResults, topicQuizResults] = await Promise.all([
    supabase
      .from('pre_quiz_results')
      .select('id, score, total_questions, percentage, created_at')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false }),
    supabase
      .from('post_quiz_results')
      .select('id, score, total_questions, percentage, grade, created_at')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false }),
    supabase
      .from('topic_quiz_results')
      .select('id, topic_path, score, total_questions, created_at')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
  ]);

  const history: QuizHistoryItem[] = [];

  // Добавляем pre_quiz результаты
  if (preQuizResults.data) {
    preQuizResults.data.forEach(item => {
      history.push({
        id: item.id,
        quiz_type: 'pre_quiz',
        score: item.score,
        total_questions: item.total_questions,
        percentage: item.percentage,
        created_at: item.created_at
      });
    });
  }

  // Добавляем post_quiz результаты
  if (postQuizResults.data) {
    postQuizResults.data.forEach(item => {
      history.push({
        id: item.id,
        quiz_type: 'post_quiz',
        score: item.score,
        total_questions: item.total_questions,
        percentage: item.percentage,
        grade: item.grade,
        created_at: item.created_at
      });
    });
  }

  // Добавляем topic_quiz результаты
  if (topicQuizResults.data) {
    topicQuizResults.data.forEach(item => {
      const percentage = Math.round((item.score / item.total_questions) * 100);
      history.push({
        id: item.id,
        quiz_type: 'topic_quiz',
        topic_path: item.topic_path,
        topic_name: TOPIC_NAMES[item.topic_path] || item.topic_path,
        score: item.score,
        total_questions: item.total_questions,
        percentage: percentage,
        created_at: item.created_at
      });
    });
  }

  // Сортируем по дате (новые первые)
  history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return history;
}

// Получение текущего profile_id
export function getCurrentProfileId(): string | null {
  // Это будет использоваться в компонентах через AuthContext
  return null;
}

// ==========================================
// Функции для коротких тестов по темам
// ==========================================

export interface TopicQuizResult {
  id?: string;
  profile_id: string;
  topic_path: string;
  score: number;
  total_questions: number;
  answers: Record<number, number>;
  created_at?: string;
}

// Сохранение результата теста по теме
export async function saveTopicQuizResult(
  result: Omit<TopicQuizResult, 'id' | 'created_at'>
): Promise<TopicQuizResult | null> {
  if (!supabase) {
    console.warn('Supabase not configured. Topic quiz result not saved.');
    return null;
  }

  const { data, error } = await supabase
    .from('topic_quiz_results')
    .insert([result])
    .select();

  if (error) {
    console.error('Error saving topic quiz result:', error);
    throw error;
  }

  return data?.[0] || null;
}

// Получение результатов тестов по темам для пользователя
export async function getTopicQuizResults(profileId: string): Promise<TopicQuizResult[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('topic_quiz_results')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching topic quiz results:', error);
    return [];
  }

  return data || [];
}

// ==========================================
// Классы (кабинет учителя)
// ==========================================

export interface ClassRow {
  id: string;
  teacher_id: string;
  name: string;
  school: string | null;
  grade: string | null;
  join_code: string;
  created_at: string;
}

export interface ClassLookup {
  id: string;
  name: string;
  school: string | null;
  grade: string | null;
}

export interface ClassStudentRow {
  user_code: string;
  student_name: string;
  pre_score: number | null;
  pre_total: number | null;
  pre_percentage: number | null;
  pre_created_at: string | null;
  pre_answers: Record<number, number> | null;
  post_score: number | null;
  post_total: number | null;
  post_percentage: number | null;
  post_grade: string | null;
  post_created_at: string | null;
  post_answers: Record<number, number> | null;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateJoinCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET.charAt(Math.floor(Math.random() * CODE_ALPHABET.length));
  }
  return code;
}

export async function createClass(input: {
  teacher_id: string;
  name: string;
  school?: string;
  grade?: string;
}): Promise<ClassRow | null> {
  if (!supabase) return null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const join_code = generateJoinCode();
    const { data, error } = await supabase
      .from('classes')
      .insert([{
        teacher_id: input.teacher_id,
        name: input.name,
        school: input.school || null,
        grade: input.grade || null,
        join_code,
      }])
      .select()
      .single();

    if (!error) return data;
    if (error.code !== '23505') {
      console.error('Error creating class:', error);
      throw error;
    }
  }
  throw new Error('Не удалось сгенерировать уникальный код класса');
}

export async function getTeacherClasses(teacherId: string): Promise<ClassRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching teacher classes:', error);
    return [];
  }
  return data || [];
}

export async function deleteClass(classId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('classes').delete().eq('id', classId);
  if (error) {
    console.error('Error deleting class:', error);
    return false;
  }
  return true;
}

export async function findClassByCode(code: string): Promise<ClassLookup | null> {
  if (!supabase) return null;
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  const { data, error } = await supabase.rpc('find_class_by_code', { p_code: normalized });
  if (error) {
    console.error('Error looking up class code:', error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return { id: row.id, name: row.name, school: row.school, grade: row.grade };
}

export async function getClassStudents(classId: string): Promise<ClassStudentRow[]> {
  if (!supabase) return [];

  const [pre, post] = await Promise.all([
    supabase
      .from('pre_quiz_results')
      .select('user_code, score, total_questions, percentage, answers, created_at')
      .eq('class_id', classId)
      .order('created_at', { ascending: false }),
    supabase
      .from('post_quiz_results')
      .select('user_code, student_name, score, total_questions, percentage, grade, answers, created_at')
      .eq('class_id', classId)
      .order('created_at', { ascending: false }),
  ]);

  if (pre.error) console.error('Error fetching pre results:', pre.error);
  if (post.error) console.error('Error fetching post results:', post.error);

  const byCode = new Map<string, ClassStudentRow>();

  function ensure(code: string, name: string): ClassStudentRow {
    let row = byCode.get(code);
    if (!row) {
      row = {
        user_code: code,
        student_name: name,
        pre_score: null, pre_total: null, pre_percentage: null, pre_created_at: null, pre_answers: null,
        post_score: null, post_total: null, post_percentage: null, post_grade: null, post_created_at: null, post_answers: null,
      };
      byCode.set(code, row);
    } else if (!row.student_name && name) {
      row.student_name = name;
    }
    return row;
  }

  // Берём самый свежий pre/post для каждого user_code
  (pre.data || []).forEach((r: any) => {
    const row = ensure(r.user_code, '');
    if (row.pre_created_at === null) {
      row.pre_score = r.score;
      row.pre_total = r.total_questions;
      row.pre_percentage = Number(r.percentage);
      row.pre_created_at = r.created_at;
      row.pre_answers = r.answers || null;
    }
  });
  (post.data || []).forEach((r: any) => {
    const row = ensure(r.user_code, r.student_name || '');
    if (row.post_created_at === null) {
      row.post_score = r.score;
      row.post_total = r.total_questions;
      row.post_percentage = Number(r.percentage);
      row.post_grade = r.grade;
      row.post_created_at = r.created_at;
      row.post_answers = r.answers || null;
    }
    if (!row.student_name && r.student_name) row.student_name = r.student_name;
  });

  return Array.from(byCode.values()).sort((a, b) => a.student_name.localeCompare(b.student_name));
}

// Получение лучшего результата по теме
export async function getBestTopicQuizResult(
  profileId: string,
  topicPath: string
): Promise<TopicQuizResult | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('topic_quiz_results')
    .select('*')
    .eq('profile_id', profileId)
    .eq('topic_path', topicPath)
    .order('score', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching best topic quiz result:', error);
    }
    return null;
  }

  return data;
}
