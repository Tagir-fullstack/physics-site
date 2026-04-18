import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import GoogleSignInButton from './GoogleSignInButton';
import EmailAuthForm from './EmailAuthForm';
import type { RegistrationData } from '../../types/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'login' | 'register' | 'reset';

// Перевод ошибок Supabase на русский
function translateError(error: string): string {
  const translations: Record<string, string> = {
    'Invalid login credentials': 'Неверный email или пароль',
    'Email not confirmed': 'Email не подтверждён. Проверьте почту',
    'User already registered': 'Пользователь с таким email уже зарегистрирован',
    'Password should be at least 6 characters': 'Пароль должен быть не менее 6 символов',
    'Unable to validate email address: invalid format': 'Неверный формат email',
    'Email rate limit exceeded': 'Слишком много попыток. Попробуйте позже',
    'For security purposes, you can only request this once every 60 seconds': 'Подождите 60 секунд перед повторной попыткой',
    'New password should be different from the old password': 'Новый пароль должен отличаться от старого',
    'Auth session missing!': 'Сессия истекла. Войдите снова',
    'Invalid Refresh Token: Refresh Token Not Found': 'Сессия истекла. Войдите снова',
    'load failed': 'Ошибка загрузки. Проверьте интернет-соединение',
    'Load failed': 'Ошибка загрузки. Проверьте интернет-соединение',
    'Failed to fetch': 'Ошибка сети. Проверьте интернет-соединение',
    'NetworkError': 'Ошибка сети. Проверьте интернет-соединение',
  };

  // Точное совпадение
  if (translations[error]) {
    return translations[error];
  }

  // Частичное совпадение
  for (const [key, value] of Object.entries(translations)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  return error;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка входа через Google';
      setError(translateError(message));
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      setError(null);
      setSuccess(null);
      await signInWithEmail(email, password);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка авторизации';
      setError(translateError(message));
    }
  };

  const handleRegister = async (data: RegistrationData) => {
    try {
      setError(null);
      setSuccess(null);
      await signUpWithEmail(data);
      setSuccess('Проверьте почту для подтверждения регистрации');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка регистрации';
      setError(translateError(message));
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      setError(null);
      setSuccess(null);
      await resetPassword(email);
      setSuccess('Инструкции по восстановлению отправлены на почту');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка восстановления пароля';
      setError(translateError(message));
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Вход';
      case 'register': return 'Регистрация';
      case 'reset': return 'Восстановление пароля';
    }
  };

  return createPortal(
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <h2 className="auth-modal-title">{getTitle()}</h2>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        {mode !== 'reset' && (
          <>
            <GoogleSignInButton onClick={handleGoogleSignIn} />

            <div className="auth-divider">
              <span>или</span>
            </div>
          </>
        )}

        <EmailAuthForm
          mode={mode}
          onSubmit={handleLogin}
          onRegister={handleRegister}
          onResetPassword={handleResetPassword}
        />

        <div className="auth-switch">
          {mode === 'login' && (
            <>
              <button onClick={() => setMode('reset')} className="auth-link">
                Забыли пароль?
              </button>
              <span className="auth-switch-divider">|</span>
              Нет аккаунта?{' '}
              <button onClick={() => setMode('register')} className="auth-link">
                Зарегистрироваться
              </button>
            </>
          )}
          {mode === 'register' && (
            <>
              Уже есть аккаунт?{' '}
              <button onClick={() => setMode('login')} className="auth-link">
                Войти
              </button>
            </>
          )}
          {mode === 'reset' && (
            <>
              <button onClick={() => setMode('login')} className="auth-link">
                Вернуться к входу
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
