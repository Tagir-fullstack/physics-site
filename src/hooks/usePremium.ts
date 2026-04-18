import { useAuth } from '../context/AuthContext';
import type { PremiumFeature } from '../types/auth';

interface UsePremiumResult {
  isPremium: boolean;
  isLoading: boolean;
  canAccessFeature: (feature: PremiumFeature) => boolean;
  requireAuth: (feature: PremiumFeature, onAuthRequired: () => void) => boolean;
}

export function usePremium(): UsePremiumResult {
  const { isPremium, isLoading, hasFeature, user } = useAuth();

  const canAccessFeature = (feature: PremiumFeature): boolean => {
    return hasFeature(feature);
  };

  const requireAuth = (feature: PremiumFeature, onAuthRequired: () => void): boolean => {
    if (!user) {
      onAuthRequired();
      return false;
    }
    return hasFeature(feature);
  };

  return {
    isPremium,
    isLoading,
    canAccessFeature,
    requireAuth,
  };
}
