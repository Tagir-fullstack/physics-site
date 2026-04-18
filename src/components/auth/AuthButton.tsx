import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AuthModal from './AuthModal';
import UserMenu from './UserMenu';

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
  const { user, profile, isLoading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isLoading) {
    return <div className="auth-btn-skeleton" />;
  }

  if (user) {
    return (
      <div
        className="auth-user-wrapper"
        onMouseLeave={onCloseWithDelay}
      >
        <button
          className="auth-user-btn"
          onClick={() => isOpen ? onClose?.() : onOpen?.()}
          onMouseEnter={onOpen}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="user-avatar" />
          ) : (
            <div className="user-avatar-placeholder">
              {profile?.full_name?.[0] || user.email?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </button>
        <UserMenu
          isOpen={isOpen}
          onClose={() => onClose?.()}
          onMouseEnter={onKeepOpen}
          onMouseLeave={onCloseWithDelay}
        />
      </div>
    );
  }

  return (
    <>
      <button
        className="auth-login-btn"
        onClick={() => setIsModalOpen(true)}
      >
        Войти
      </button>
      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
