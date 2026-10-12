import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApiClient } from '../lib/apiClient';

export type AccountAccessState = {
  userId: string;
  role: 'owner' | 'admin' | 'user';
  isPremium: boolean;
  paymentsEnabled: boolean;
};

type Props = {
  access: AccountAccessState;
};

export default function AccountAccess({ access }: Props) {
  const { authFetch } = useApiClient();
  const [target, setTarget] = useState('');
  const [role, setRole] = useState('admin');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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

  return (
    <div className="account-access-card">
      {access && (
        <>
          <div className="account-tools-heading">
            <h3>Основные инструменты</h3>
          </div>
          <div className="account-access-navigation">
            <article className="account-tool-card teacher">
              <span className="account-tool-number">01</span>
              <h3>Кабинет учителя</h3>
              <p>Планы занятий и контрольные работы.</p>
              <div className="account-tool-actions">
                {access.isPremium ? <Link to="/teacher">Открыть кабинет <span>→</span></Link> : <small>Кабинет доступен с PRO</small>}
                <Link to="/assessment/mechanics" className="secondary">Контрольный срез <span>→</span></Link>
              </div>
            </article>
            <article className="account-tool-card monitoring">
              <span className="account-tool-number">02</span>
              <h3>Мониторинг результатов</h3>
              <p>Прогресс, ответы и результаты студентов.</p>
              <div className="account-tool-actions">
                {access.role !== 'user' ? <Link to="/admin/assessment-monitor">Открыть мониторинг <span>→</span></Link> : access.isPremium ? <Link to="/teacher/tests">Результаты моих тестов <span>→</span></Link> : <small>Результаты своих тестов доступны с PRO</small>}
              </div>
            </article>
            <article className="account-tool-card tests">
              <span className="account-tool-number">03</span>
              <h3>Тесты и классы</h3>
              <p>Свои тесты и группы учеников.</p>
              <div className="account-tool-actions">
                {access.isPremium ? <Link to="/teacher/tests">Тесты и классы <span>→</span></Link> : <small>Создание тестов доступно с PRO</small>}
              </div>
            </article>
          </div>
        </>
      )}

      {access?.role === 'owner' && (
        <details className="account-admin-panel">
          <summary>
            <span><b>Управление администраторами</b><small>Выдать или отозвать права по Clerk User ID</small></span>
            <i>+</i>
          </summary>
          <form className="account-admin-form" onSubmit={submitRole}>
            <p>Полный User ID находится на странице пользователя в Clerk Production.</p>
            <div className="account-admin-fields">
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
            </div>
            <button className="account-btn account-btn-primary" disabled={saving}>
              {saving ? 'Сохраняем…' : 'Сохранить права'}
            </button>
            {message && <p className="account-access-message" role="status">{message}</p>}
          </form>
        </details>
      )}

      {!access.isPremium && <div className="account-pro-preview basic">
        <div className="account-pro-heading">
          <div><span className="account-access-eyebrow">{access?.isPremium ? 'Все возможности открыты' : 'Ваш тариф'}</span><h3>{access?.isPremium ? '✦ Physez PRO' : 'Базовый доступ'}</h3></div>
          <span className={`account-plan-badge ${access?.isPremium ? 'active' : ''}`}>{access?.isPremium ? 'Активна' : 'Скоро'}</span>
        </div>
        <p>{access?.isPremium ? 'Все инструменты преподавателя доступны.' : 'Материалы и прохождение контрольных бесплатно.'}</p>
        {access?.isPremium ? (
          <div className="account-pro-included"><i>✓</i><span>PRO включён для этого аккаунта</span></div>
        ) : (
          <button className="account-btn account-btn-secondary" disabled={!access?.paymentsEnabled}>
            {access?.paymentsEnabled ? 'Оформить PRO' : 'Оплата пока недоступна'}
          </button>
        )}
      </div>}
    </div>
  );
}
