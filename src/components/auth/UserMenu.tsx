import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';

interface UserMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function UserMenu({ isOpen, onClose, onMouseEnter, onMouseLeave }: UserMenuProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  if (!user) return null;

  const handleSignOut = () => {
    setShowConfirm(true);
  };

  const confirmSignOut = async () => {
    await signOut();
    setShowConfirm(false);
    onClose();
  };

  const handleAccountClick = () => {
    onClose();
    navigate('/account');
  };

  return (
    <>
      <div
        className={`user-menu ${isOpen ? 'user-menu--open' : ''}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="user-menu-header">
          <span className="user-name">{user.fullName || 'Пользователь'}</span>
          <span className="user-email">{user.primaryEmailAddress?.emailAddress}</span>
        </div>
        <div className="user-menu-divider" />
        <button className="user-menu-item" onClick={handleAccountClick}>
          Личный кабинет
        </button>
        <button className="user-menu-item" onClick={handleSignOut}>
          Выйти
        </button>
      </div>

      {showConfirm &&
        createPortal(
          <div
            className="signout-confirm-overlay"
            onClick={() => setShowConfirm(false)}
          >
            <div
              className="signout-confirm-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Выход из аккаунта</h3>
              <p>Вы уверены, что хотите выйти?</p>
              <div className="signout-confirm-buttons">
                <button
                  className="signout-confirm-cancel"
                  onClick={() => setShowConfirm(false)}
                >
                  Отмена
                </button>
                <button
                  className="signout-confirm-submit"
                  onClick={confirmSignOut}
                >
                  Выйти
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
