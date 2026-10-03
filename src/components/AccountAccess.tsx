import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApiClient } from '../lib/apiClient';

export type AccountAccessState = {
  userId: string;
  role: 'owner' | 'admin' | 'user';
  isPremium: boolean;
  paymentsEnabled: boolean;
};

type Props = {
  onChange?: (access: AccountAccessState) => void;
};

export default function AccountAccess({ onChange }: Props) {
  const { authFetch } = useApiClient();
  const [access, setAccess] = useState<AccountAccessState | null>(null);
  const [error, setError] = useState('');
  const [target, setTarget] = useState('');
  const [role, setRole] = useState('admin');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let cancelled = false;
    void authFetch('/api/account')
      .then(async (response) => {
        const body = await response.json() as AccountAccessState & { error?: string };
        if (!response.ok) throw new Error(body.error || 'Не удалось проверить права.');
        if (!cancelled) {
          setAccess(body);
          onChange?.(body);
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Не удалось проверить права.');
      });
    return () => { cancelled = true; };
  }, [authFetch, onChange]);

  const submitRole = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await authFetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: target.trim(), role }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || 'Не удалось изменить права.');
      setMessage(role === 'admin' ? 'Права администратора выданы.' : 'Права администратора отозваны.');
      setTarget('');
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Не удалось изменить права.');
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = access?.role === 'owner'
    ? 'Главный администратор'
    : access?.role === 'admin' ? 'Администратор' : 'Пользователь';

  return (
    <div className="account-access-card">
      <div className="account-access-heading">
        <div>
          <span className="account-access-eyebrow">Доступ к платформе</span>
          <h3>{access ? roleLabel : 'Проверяем права…'}</h3>
        </div>
        {access && <span className={`account-access-status ${access.isPremium ? 'pro' : ''}`}>{access.isPremium ? 'PRO' : 'FREE'}</span>}
      </div>

      {error && <p className="account-access-error" role="alert">{error}</p>}
      {access && (
        <>
          <p className="account-access-description">
            {access.role === 'owner'
              ? 'Полный доступ к управлению контрольными, администраторами и возможностями PRO.'
              : access.role === 'admin'
                ? 'Доступен мониторинг контрольных и возможности PRO.'
                : access.isPremium
                  ? 'Подписка PRO активна. Доступны расширенные функции и повторные попытки.'
                  : 'Доступны бесплатные материалы платформы.'}
          </p>
          <small className="account-access-id">Clerk ID: {access.userId}</small>
          <div className="account-access-actions">
            <Link to="/assessment/mechanics" className="account-btn account-btn-admin">Контрольный срез</Link>
            {access.role !== 'user' && (
              <Link to="/admin/assessment-monitor" className="account-btn account-btn-monitor">Мониторинг результатов</Link>
            )}
          </div>
        </>
      )}

      {access?.role === 'owner' && (
        <form className="account-admin-form" onSubmit={submitRole}>
          <div>
            <span className="account-access-eyebrow">Команда</span>
            <h3>Управление администраторами</h3>
            <p>Скопируйте полный User ID со страницы пользователя в Clerk Production.</p>
          </div>
          <label>
            <span>Clerk User ID</span>
            <input
              required
              pattern="user_[A-Za-z0-9]+"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="user_…"
              autoComplete="off"
            />
          </label>
          <label>
            <span>Новые права</span>
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="admin">Администратор</option>
              <option value="user">Обычный пользователь</option>
            </select>
          </label>
          <button className="account-btn account-btn-primary" disabled={saving}>
            {saving ? 'Сохраняем…' : 'Сохранить права'}
          </button>
          {message && <p className="account-access-message" role="status">{message}</p>}
        </form>
      )}

      <div className="account-pro-preview">
        <div className="account-pro-heading">
          <div><span className="account-access-eyebrow">Подписка</span><h3>Physez PRO</h3></div>
          <span className={`account-plan-badge ${access?.isPremium ? 'active' : ''}`}>{access?.isPremium ? 'Активна' : 'Скоро'}</span>
        </div>
        <p>Расширенные лаборатории, инструменты преподавателя и повторные попытки контрольного среза.</p>
        {!access?.isPremium && <p>Оплата появится после подключения расчётного счёта и платёжного сервиса.</p>}
        <button className="account-btn account-btn-secondary" disabled={!access?.paymentsEnabled}>
          {access?.paymentsEnabled ? 'Оформить PRO' : 'Оплата пока недоступна'}
        </button>
      </div>
    </div>
  );
}
