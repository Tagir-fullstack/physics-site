export type UserRole = 'pupil' | 'student' | 'teacher' | 'tutor';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  grade?: number;
  course?: number;
  institution?: string;
  city?: string;
  subject?: string;
  experience?: number;
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

export interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  subscription: Subscription | null;
  isLoading: boolean;
  isPremium: boolean;
}

export interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  hasFeature: (feature: PremiumFeature) => boolean;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

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
