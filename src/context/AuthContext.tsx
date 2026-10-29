import { createContext, useContext, useMemo, useEffect, useState, type ReactNode } from 'react';
import { useUser, useClerk, useAuth as useClerkAuth } from '@clerk/clerk-react';
import type {
  AuthContextType,
  AuthUser,
  Profile,
  UserRole,
} from '../types/auth';

const AuthContext = createContext<AuthContextType | null>(null);

function toProfile(user: ReturnType<typeof useUser>['user']): Profile | null {
  if (!user) return null;
  const meta = {
    ...(user.publicMetadata ?? {}),
    ...(user.unsafeMetadata ?? {}),
  } as Record<string, unknown>;
  return {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    full_name: typeof meta.full_name === 'string' && meta.full_name.trim() ? meta.full_name.trim() : user.fullName,
    first_name: typeof meta.first_name === 'string' ? meta.first_name : user.firstName ?? '',
    last_name: typeof meta.last_name === 'string' ? meta.last_name : user.lastName ?? '',
    avatar_url: user.imageUrl,
    role: (meta.role as UserRole) ?? 'pupil',
    grade: meta.grade as number | undefined,
    course: meta.course as number | undefined,
    institution: meta.institution as string | undefined,
    city: meta.city as string | undefined,
    subject: meta.subject as string | undefined,
    experience: meta.experience as number | undefined,
    profile_completed: Boolean(meta.profile_completed),
    created_at: user.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, user } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const { getToken } = useClerkAuth();
  const [access, setAccess] = useState<{ userId: string; premium: boolean } | null>(null);
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let live = true;
    let request = 0;
    const refresh = async () => {
      const current = ++request;
      try {
        const token = await getToken();
        if (!token) throw Error('Missing session');
        const response = await fetch('/api/account', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        if (!response.ok) throw Error('Access unavailable');
        const result = await response.json();
        if (live && current === request) setAccess({ userId, premium: result.userId === userId && result.isPremium === true });
      } catch { if (live && current === request) setAccess({ userId, premium: false }); }
    };
    void refresh();
    const listener = () => { void refresh(); };
    const interval = window.setInterval(listener, 60000);
    window.addEventListener('billing-access-changed', listener);
    window.addEventListener('focus', listener);
    return () => { live = false; clearInterval(interval); window.removeEventListener('billing-access-changed', listener); window.removeEventListener('focus', listener); };
  }, [userId, getToken]);
  const premium = access?.userId === userId && access?.premium === true;

  const value = useMemo<AuthContextType>(() => {
    const authUser: AuthUser | null = user
      ? {
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress ?? '',
          fullName: user.fullName,
          avatarUrl: user.imageUrl,
        }
      : null;

    return {
      user: authUser,
      profile: toProfile(user),
      subscription: null,
      isLoading: !isLoaded,
      isPremium: premium,
      signOut: async () => {
        await clerkSignOut();
      },
      hasFeature: () => premium,
      updateProfile: async (data: Partial<Profile>) => {
        if (!user) throw new Error('Not authenticated');
        const nextMeta: Record<string, unknown> = { ...(user.unsafeMetadata ?? {}) };
        const editableFields = new Set(['full_name', 'first_name', 'last_name', 'role', 'grade', 'course', 'institution', 'city', 'subject', 'experience', 'profile_completed']);
        for (const [key, val] of Object.entries(data)) {
          if (val !== undefined && editableFields.has(key)) nextMeta[key] = val;
        }
        await user.update({ unsafeMetadata: nextMeta });
        await user.reload();
      },
    };
  }, [isLoaded, user, clerkSignOut, premium]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Context hooks intentionally live beside their provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
