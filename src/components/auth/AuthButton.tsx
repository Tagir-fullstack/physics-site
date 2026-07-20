import { SignedIn, SignedOut, SignInButton, useUser } from '@clerk/clerk-react';
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
  const { isLoaded, user } = useUser();

  if (!isLoaded) {
    return <div className="auth-btn-skeleton" />;
  }

  return (
    <>
      <SignedIn>
        <div className="auth-user-wrapper" onMouseLeave={onCloseWithDelay}>
          <button
            className="auth-user-btn"
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
          <UserMenu
            isOpen={isOpen}
            onClose={() => onClose?.()}
            onMouseEnter={onKeepOpen}
            onMouseLeave={onCloseWithDelay}
          />
        </div>
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="auth-login-btn">Войти</button>
        </SignInButton>
      </SignedOut>
    </>
  );
}
