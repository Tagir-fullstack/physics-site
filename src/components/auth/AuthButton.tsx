import { SignedIn, SignedOut, useUser } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import UserMenu from './UserMenu';
import { useAuth } from '../../context/AuthContext';

interface AuthButtonProps {
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onCloseWithDelay?: () => void;
  onKeepOpen?: () => void;
}

export default function AuthButton({
  isOpen = false,
  onOpen,
  onClose,
  onCloseWithDelay,
  onKeepOpen,
}: AuthButtonProps) {
  const { isLoaded, user } = useUser();
  const { isBasicPreview, isPremium } = useAuth();

  if (!isLoaded) {
    return <div className="auth-btn-skeleton" />;
  }

  return (
    <>
      <SignedIn>
        <div className="auth-user-wrapper" onMouseLeave={onCloseWithDelay}>
          <button
            className="auth-user-btn"
            aria-label={isBasicPreview ? 'Меню аккаунта · просмотр без PRO' : 'Меню аккаунта'}
            aria-expanded={isOpen}
            onClick={() => (isOpen ? onClose?.() : onOpen?.())}
            onMouseEnter={onOpen}
          >
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="" className="user-avatar" />
            ) : (
              <div className="user-avatar-placeholder">
                {user?.fullName?.[0] ||
                  user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() ||
                  '?'}
              </div>
            )}
          </button>
          <span className={`auth-tier-indicator auth-tier-indicator--${isPremium ? 'pro' : 'basic'}`} aria-label={isBasicPreview ? 'Basic · просмотр без PRO' : isPremium ? 'Подписка Pro' : 'Базовый доступ'}>{isPremium ? 'Pro' : 'Basic'}</span>
          <UserMenu
            isOpen={isOpen}
            onClose={() => onClose?.()}
            onMouseEnter={onKeepOpen}
            onMouseLeave={onCloseWithDelay}
          />
        </div>
      </SignedIn>
      <SignedOut>
        <Link className="auth-login-btn" to="/sign-in">Войти</Link>
      </SignedOut>
    </>
  );
}
