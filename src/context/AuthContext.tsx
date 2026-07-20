import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import type {
  AuthContextType,
  AuthUser,
  PremiumFeature,
  Profile,
  UserRole,
} from '../types/auth';

const AuthContext = createContext<AuthContextType | null>(null);

function toProfile(user: ReturnType<typeof useUser>['user']): Profile | null {
  if (!user) return null;
  const meta = (user.publicMetadata ?? {}) as Record<string, unknown>;
  return {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    full_name: user.fullName,
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
      isPremium: false,
      signOut: async () => {
        await clerkSignOut();
      },
      hasFeature: (_feature: PremiumFeature) => false,
      updateProfile: async (data: Partial<Profile>) => {
        if (!user) throw new Error('Not authenticated');
        const nextMeta: Record<string, unknown> = { ...(user.publicMetadata ?? {}) };
        for (const [key, val] of Object.entries(data)) {
          if (val !== undefined) nextMeta[key] = val;
        }
        await user.update({ unsafeMetadata: nextMeta });
        await user.reload();
      },
    };
  }, [isLoaded, user, clerkSignOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
