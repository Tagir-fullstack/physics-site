import { hasPremiumAccess, isAdmin, type ClerkUser } from './auth.js'

// The user must come from verified server authentication, never the request body.
export function canRestartAssessment(testId: 'mechanics' | 'midterm', user: ClerkUser | null) {
  return testId === 'midterm' ? isAdmin(user) : hasPremiumAccess(user)
}
