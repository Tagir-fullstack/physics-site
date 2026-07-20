const USER_CODE_KEY = 'physics_user_code';
const PRE_QUIZ_COMPLETED_KEY = 'physics_pre_quiz_completed';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateUserCode(): string {
  let code = 'PHY-';
  for (let i = 0; i < 5; i++) {
    code += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return code;
}

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
