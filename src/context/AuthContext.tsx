import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
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

function hasPremiumMetadata(user: ReturnType<typeof useUser>['user']): boolean {
  if (!user) return false;
  const metadata = {
    ...(user.publicMetadata ?? {}),
  } as Record<string, unknown>;
  const subscription = metadata.subscription && typeof metadata.subscription === 'object'
    ? metadata.subscription as Record<string, unknown>
    : null;
  const plan = String(metadata.plan ?? subscription?.plan ?? '').toLowerCase();
  const status = String(metadata.subscriptionStatus ?? subscription?.status ?? 'active').toLowerCase();
  return ['pro', 'premium', 'teacher'].includes(plan) && !['cancelled', 'expired', 'inactive'].includes(status);
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
      isPremium: hasPremiumMetadata(user),
      signOut: async () => {
        await clerkSignOut();
      },
      hasFeature: () => hasPremiumMetadata(user),
      updateProfile: async (data: Partial<Profile>) => {
        if (!user) throw new Error('Not authenticated');
        const nextMeta: Record<string, unknown> = { ...(user.unsafeMetadata ?? {}) };
        const editableFields = new Set(['full_name', 'role', 'grade', 'course', 'institution', 'city', 'subject', 'experience', 'profile_completed']);
        for (const [key, val] of Object.entries(data)) {
          if (val !== undefined && editableFields.has(key)) nextMeta[key] = val;
        }
        await user.update({ unsafeMetadata: nextMeta });
        await user.reload();
      },
    };
  }, [isLoaded, user, clerkSignOut]);

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
