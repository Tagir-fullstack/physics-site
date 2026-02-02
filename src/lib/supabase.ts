import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Results will not be saved.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

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
