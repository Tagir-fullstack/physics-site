import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { Profile, Subscription, PremiumFeature, AuthContextType, AuthState, RegistrationData } from '../types/auth';

const AuthContext = createContext<AuthContextType | null>(null);

const PREMIUM_PLANS = ['premium', 'teacher'];

const FEATURE_REQUIREMENTS: Record<PremiumFeature, string[]> = {
  video_download: ['premium', 'teacher'],
  ktp_ksp_access: ['teacher'],
  ai_generation: ['premium', 'teacher'],
  early_access: ['premium', 'teacher'],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    subscription: null,
    isLoading: true,
    isPremium: false,
    showProfileCompletion: false,
  });

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  }, []);

  const fetchSubscription = useCallback(async (userId: string): Promise<Subscription | null> => {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Error fetching subscription:', error);
    }

    return data;
  }, []);

  const handleAuthChange = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setState({
        user: null,
        session: null,
        profile: null,
        subscription: null,
        isLoading: false,
        isPremium: false,
        showProfileCompletion: false,
      });
      return;
    }

    const [profile, subscription] = await Promise.all([
      fetchProfile(session.user.id),
      fetchSubscription(session.user.id),
    ]);

    const needsProfileCompletion = Boolean(profile && !profile.profile_completed);

    setState({
      user: session.user,
      session,
      profile,
      subscription,
      isLoading: false,
      isPremium: subscription ? PREMIUM_PLANS.includes(subscription.plan) : false,
      showProfileCompletion: needsProfileCompletion,
    });
  }, [fetchProfile, fetchSubscription]);

  useEffect(() => {
    if (!supabase) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        handleAuthChange(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [handleAuthChange]);

  const signInWithGoogle = async () => {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signUpWithEmail = async (data: RegistrationData) => {
    if (!supabase) throw new Error('Supabase not configured');

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          role: data.role,
          grade: data.grade,
          course: data.course,
          institution: data.institution,
          city: data.city,
          subject: data.subject,
          experience: data.experience,
          profile_completed: true,
        },
      },
    });

    if (error) throw error;

    // Update profile with additional data after signup
    if (authData.user) {
      const profileData: Record<string, unknown> = {
        full_name: data.fullName,
        role: data.role,
        profile_completed: true,
      };

      if (data.grade) profileData.grade = data.grade;
      if (data.course) profileData.course = data.course;
      if (data.institution) profileData.institution = data.institution;
      if (data.city) profileData.city = data.city;
      if (data.subject) profileData.subject = data.subject;
      if (data.experience) profileData.experience = data.experience;

      await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', authData.user.id);
    }
  };

  const resetPassword = async (email: string) => {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });

    if (error) throw error;
  };

  const signOut = async () => {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const hasFeature = (feature: PremiumFeature): boolean => {
    if (!state.subscription) return false;
    const allowedPlans = FEATURE_REQUIREMENTS[feature];
    return allowedPlans.includes(state.subscription.plan);
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!supabase || !state.user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', state.user.id);

    if (error) throw error;

    // Refresh profile
    const updatedProfile = await fetchProfile(state.user.id);
    setState(prev => ({
      ...prev,
      profile: updatedProfile,
      showProfileCompletion: updatedProfile ? !updatedProfile.profile_completed : false,
    }));
  };

  const closeProfileCompletion = () => {
    setState(prev => ({ ...prev, showProfileCompletion: false }));
  };

  const contextValue: AuthContextType = {
    ...state,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
    hasFeature,
    updateProfile,
    closeProfileCompletion,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
