import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'pupil' | 'student' | 'teacher' | 'tutor';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  grade?: number;           // 1-11 для школьников
  course?: number;          // 1-6 для студентов
  institution?: string;     // школа/университет
  city?: string;
  subject?: string;         // для учителей/репетиторов
  experience?: number;      // стаж в годах
  profile_completed: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'premium' | 'teacher';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  starts_at: string;
  ends_at: string | null;
}

export type PremiumFeature =
  | 'video_download'
  | 'ktp_ksp_access'
  | 'ai_generation'
  | 'early_access';

export interface RegistrationData {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  grade?: number;
  course?: number;
  institution?: string;
  city?: string;
  subject?: string;
  experience?: number;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  subscription: Subscription | null;
  isLoading: boolean;
  isPremium: boolean;
  showProfileCompletion: boolean;
}

export interface AuthContextType extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (data: RegistrationData) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasFeature: (feature: PremiumFeature) => boolean;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  closeProfileCompletion: () => void;
}

// Типы для истории тестов
export interface QuizHistoryItem {
  id: string;
  profile_id: string;
  quiz_type: 'pre_quiz' | 'post_quiz' | 'topic_quiz';
  topic_path?: string;
  score: number;
  total_questions: number;
  percentage: number;
  grade?: string;
  created_at: string;
}

export interface UserProgress {
  id: string;
  profile_id: string;
  topic_path: string;
  viewed_at: string;
  completed: boolean;
}
