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
