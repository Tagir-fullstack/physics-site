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

function ToolIcon({ type }: { type: 'teacher' | 'monitoring' | 'tests' }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === 'teacher' ? <><path d="M3 4h6a4 4 0 0 1 3 2 4 4 0 0 1 3-2h6v15h-6a4 4 0 0 0-3 2 4 4 0 0 0-3-2H3V4ZM12 6v15"/><path d="M6 8h3M15 8h3"/></> : type === 'monitoring' ? <><path d="M4 4v16h16M8 15v-4M13 15V7M18 15v-6"/><path d="m7 8 5-4 6 2"/></> : <><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M9 5V3h6v2M8 11l1 1 2-2M14 11h3M8 16l1 1 2-2M14 16h3"/></>}
  </svg>;
}

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
          {access.isPremium && <section className="account-workspace-hero">
            <div className="account-hero-copy">
              <span className="account-hero-plan">{access.isPremium ? '✦ PHYSEZ PRO · ВАШЕ ПРЕИМУЩЕСТВО' : 'PHYSEZ · БАЗОВЫЙ ДОСТУП'}</span>
              <h2>{access.isPremium ? <>Ваши занятия.<br/>Новые возможности.</> : <>Физика начинается<br/>с любопытства.</>}</h2>
              <p>{access.isPremium ? 'От первого опыта до результатов класса — всё под рукой.' : 'Изучайте материалы, запускайте опыты и проверяйте знания.'}</p>
              <Link className="account-hero-link" to={access.isPremium ? access.role !== 'user' ? '/admin/assessment-monitor' : '/teacher/tests' : '/labs/oberbeck'}>{access.isPremium ? access.role !== 'user' ? 'К результатам студентов' : 'К моим тестам' : 'Открыть лабораторию'} <span aria-hidden="true">↗</span></Link>
            </div>
            <svg className="account-hero-orbit" width="230" height="230" viewBox="0 0 230 230" fill="none" aria-hidden="true"><circle cx="115" cy="115" r="88" stroke="currentColor" strokeOpacity=".12"/><circle cx="115" cy="115" r="62" stroke="currentColor" strokeOpacity=".15"/><ellipse cx="115" cy="115" rx="95" ry="34" transform="rotate(-35 115 115)" stroke="currentColor" strokeOpacity=".5"/><ellipse cx="115" cy="115" rx="95" ry="34" transform="rotate(35 115 115)" stroke="currentColor" strokeOpacity=".35"/><ellipse cx="115" cy="115" rx="95" ry="34" transform="rotate(90 115 115)" stroke="currentColor" strokeOpacity=".25"/><circle cx="115" cy="115" r="16" fill="currentColor" fillOpacity=".95"/><circle cx="185" cy="57" r="7" fill="currentColor"/><circle cx="42" cy="66" r="5" fill="currentColor" fillOpacity=".65"/><circle cx="114" cy="209" r="5" fill="currentColor" fillOpacity=".8"/></svg>
          </section>}
          <nav className="account-quick-links" aria-label="Быстрый доступ">
            <Link to="/labs"><span aria-hidden="true">⌁</span> Лаборатория <i aria-hidden="true">↗</i></Link>
            <Link to="/assessment"><span aria-hidden="true">✓</span> Контрольные срезы <i aria-hidden="true">↗</i></Link>
          </nav>
          <div className="account-tools-heading">
            <h3>Рабочие инструменты</h3><span>{access.isPremium ? 'Включено в ваш PRO' : 'Возможности платформы'}</span>
          </div>
          <div className="account-access-navigation">
            <article className={`account-tool-card teacher ${!access.isPremium ? 'account-tool-upsell' : ''}`}>
              <div className="account-tool-top"><span className="account-tool-icon"><ToolIcon type="teacher"/></span><span className="account-tool-number">01 / ПРЕПОДАВАНИЕ</span></div>
              <h3>Кабинет учителя</h3>
              <p>Планы занятий и контрольные работы.</p>
              <div className="account-tool-actions">
                {access.isPremium ? <Link to="/teacher">Открыть кабинет <span>→</span></Link> : <small>Кабинет доступен с PRO</small>}
                <Link to="/assessment" className="secondary">Контрольные срезы <span>→</span></Link>
              </div>
            </article>
            <article className={`account-tool-card monitoring ${!access.isPremium && access.role === 'user' ? 'account-tool-upsell' : ''}`}>
              <div className="account-tool-top"><span className="account-tool-icon"><ToolIcon type="monitoring"/></span><span className="account-tool-number">02 / РЕЗУЛЬТАТЫ</span></div>
              <h3>Мониторинг результатов</h3>
              <p>Прогресс, ответы и результаты студентов.</p>
              <div className="account-tool-actions">
                {access.role !== 'user' ? <Link to="/admin/assessment-monitor">Открыть мониторинг <span>→</span></Link> : access.isPremium ? <Link to="/teacher/tests">Результаты моих тестов <span>→</span></Link> : <small>Результаты своих тестов доступны с PRO</small>}
              </div>
            </article>
            <article className={`account-tool-card tests ${!access.isPremium ? 'account-tool-upsell' : ''}`}>
              <div className="account-tool-top"><span className="account-tool-icon"><ToolIcon type="tests"/></span><span className="account-tool-number">03 / КЛАССЫ</span></div>
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
          <div><span className="account-access-eyebrow">Больше возможностей</span><h3>✦ Physez PRO</h3></div>
          <span className="account-plan-badge">{access.paymentsEnabled ? 'Подписка' : 'Скоро'}</span>
        </div>
        <p>Создавайте тесты, работайте с классами и используйте инструменты преподавателя. Материалы и прохождение контрольных остаются бесплатными.</p>
        <button className="account-btn account-btn-secondary" disabled={!access.paymentsEnabled}>
          {access.paymentsEnabled ? 'Оформить PRO' : 'Оформление PRO скоро появится'}
        </button>
      </div>}
    </div>
  );
}
