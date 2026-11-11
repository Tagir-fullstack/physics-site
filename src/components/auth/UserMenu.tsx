import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUser, useClerk, useSessionList } from '@clerk/clerk-react';
import { useAuth } from '../../context/AuthContext';
import { isEmailAdmin } from '../../lib/apiClient';

interface UserMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function UserMenu({ isOpen, onClose, onMouseEnter, onMouseLeave }: UserMenuProps) {
  const { user } = useUser();
  const { signOut, session, openSignIn } = useClerk();
  const { sessions, setActive, isLoaded: sessionsLoaded } = useSessionList();
  const { canPreviewBasic, isBasicPreview, setBasicPreview } = useAuth();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState('');
  const [needsSessionSetup, setNeedsSessionSetup] = useState(false);
  const returnUrl = /^\/(admin|teacher)(\/|$)/.test(window.location.pathname) ? '/account' : window.location.pathname + window.location.search + window.location.hash;
  const switchAccount = async (id: string) => {
    if (!setActive || switching) return;
    setSwitching(true); setSwitchError('');
    try { await setActive({ session: id }); window.location.assign(returnUrl); }
    catch { setSwitchError('Не удалось переключить аккаунт. Повторите попытку.'); setSwitching(false); }
  };

  const addAccount = async () => {
    if (switching) return;
    setSwitching(true); setSwitchError(''); setNeedsSessionSetup(false);
    try {
      const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;
      const host = atob(key.replace(/^pk_(test|live)_/, '')).replace(/\$+$/, '');
      const response = await fetch(`https://${host}/v1/environment`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Error('Unavailable');
      const environment = await response.json();
      if (environment.auth_config?.single_session_mode !== false) {
        setNeedsSessionSetup(true);
        return;
      }
      onClose();
      openSignIn({ forceRedirectUrl: returnUrl, signUpForceRedirectUrl: returnUrl });
    } catch { setSwitchError('Не удалось проверить вход в несколько аккаунтов. Повторите попытку.'); }
    finally { setSwitching(false); }
  };

  if (!user) return null;
  const canMonitor = user.publicMetadata.role === 'owner' || user.publicMetadata.role === 'admin' || isEmailAdmin(user.primaryEmailAddress?.emailAddress);

  const handleSignOut = () => {
    setShowConfirm(true);
  };

  const confirmSignOut = async () => {
    if (session) await signOut({ sessionId: session.id });
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
          {isBasicPreview && <span className="user-preview-label">Просмотр без PRO</span>}
        </div>
        <div className="user-menu-divider" />
        <button className="user-menu-item" onClick={handleAccountClick}>
          Личный кабинет
        </button>
        {canMonitor && <button className="user-menu-item" onClick={() => { onClose(); navigate('/admin/assessment-monitor'); }}>
          Мониторинг
        </button>}
        {canPreviewBasic && <button className="user-menu-item" aria-pressed={isBasicPreview} onClick={() => setBasicPreview(!isBasicPreview)}>
          {isBasicPreview ? 'Вернуть PRO' : 'Посмотреть без PRO'}
        </button>}
        <details className="user-menu-accounts">
          <summary className="user-menu-item">Сменить аккаунт</summary>
          {sessionsLoaded && sessions?.filter(s => s.status === 'active').map(s => <button key={s.id} className="user-menu-item user-session-item" disabled={switching || s.id === session?.id} onClick={() => void switchAccount(s.id)}>
            <span>{s.user?.fullName || s.user?.primaryEmailAddress?.emailAddress || 'Аккаунт'}<small>{s.user?.primaryEmailAddress?.emailAddress}</small></span>{s.id === session?.id && <span aria-label="Текущий аккаунт">✓</span>}
          </button>)}
          <button className="user-menu-item" disabled={switching} onClick={() => void addAccount()}>+ Добавить аккаунт</button>
          {needsSessionSetup && <p className="user-session-error" role="status">В Clerk нужно один раз включить Multi-session handling в разделе <a href="https://dashboard.clerk.com/~/sessions" target="_blank" rel="noreferrer">Sessions</a>. Затем нажмите «Добавить аккаунт» ещё раз.</p>}
          {switchError && <p className="user-session-error" role="alert">{switchError}</p>}
        </details>
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
              <p>Выйти из текущего аккаунта? Другие добавленные аккаунты останутся доступны.</p>
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
