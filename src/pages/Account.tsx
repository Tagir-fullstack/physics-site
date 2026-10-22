import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/auth';
import '../styles/account.css';
import AccountAccess, { type AccountAccessState } from '../components/AccountAccess';
import { useApiClient } from '../lib/apiClient';
import AccountStudentIdentity, { type ProfileIdentity } from '../components/AccountStudentIdentity';
import { studentRequest, useStudentProfile } from '../lib/studentProfile';
import '../styles/account-dashboard.css';

const ACCOUNT_THEMES = [
  { id: 'simple', name: 'Простая' },
  { id: 'aurora', name: 'Аврора' },
  { id: 'cosmos', name: 'Космос' },
  { id: 'sunset', name: 'Закат' },
] as const;
type AccountTheme = typeof ACCOUNT_THEMES[number]['id'];
function storedTheme(userId: string): AccountTheme {
  try {
    const saved = localStorage.getItem(`physez-account-theme:${userId}`);
    return ACCOUNT_THEMES.find(theme => theme.id === saved)?.id ?? 'aurora';
  } catch { return 'aurora'; }
}

interface QuizHistoryItem {
  id: string;
  quiz_type: 'pre_quiz' | 'post_quiz' | 'topic_quiz';
  topic_name?: string;
  score: number;
  total_questions: number;
  percentage: number;
  created_at: string;
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'pupil', label: 'Школьник' },
  { value: 'student', label: 'Студент' },
  { value: 'tutor', label: 'Репетитор' },
  { value: 'teacher', label: 'Учитель' },
  { value: 'lab_assistant', label: 'Лаборант' },
  { value: 'assistant', label: 'Ассистент' },
  { value: 'lecturer', label: 'Преподаватель' },
  { value: 'associate_professor', label: 'Ассоциированный профессор' },
  { value: 'professor', label: 'Профессор' },
];

const UNIVERSITY_ROLES: UserRole[] = [
  'lecturer',
  'assistant',
  'professor',
  'associate_professor',
  'lab_assistant',
];

const isUniversityRole = (role: UserRole) => UNIVERSITY_ROLES.includes(role);
const isEducatorRole = (role: UserRole) => role === 'teacher' || isUniversityRole(role);

const EXPERIENCE_OPTIONS = [
  { value: '0', label: 'До 1 года' },
  { value: '1', label: '1–3 года' },
  { value: '3', label: '3–5 лет' },
  { value: '5', label: '5–10 лет' },
  { value: '10', label: '10–20 лет' },
  { value: '20', label: 'Более 20 лет' },
];

const getExperienceLabel = (experience: number) =>
  EXPERIENCE_OPTIONS.find(option => Number(option.value) === experience)?.label || `${experience} лет`;

export default function Account() {
  const { user, profile, isLoading, signOut, updateProfile } = useAuth();
  const { user: clerkUser } = useUser();
  const { authFetch } = useApiClient();
  const { profile: workProfile, loading: identityLoading, error: identityError, refresh: refreshIdentity, setProfile: setWorkProfile } = useStudentProfile();
  const [identityDraft, setIdentityDraft] = useState<ProfileIdentity>({ lastName: '', firstName: '', group: '' });
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [accountAccess, setAccountAccess] = useState<AccountAccessState | null>(null);
  const [accessError, setAccessError] = useState<{ userId: string; attempt: number; message: string } | null>(null);
  const [accessAttempt, setAccessAttempt] = useState(0);
  const userId = user?.id;
  const identity: ProfileIdentity = { lastName: workProfile?.lastName ?? profile?.last_name ?? clerkUser?.lastName ?? '', firstName: workProfile?.firstName ?? profile?.first_name ?? clerkUser?.firstName ?? '', group: workProfile?.group ?? '' };
  const [copiedId, setCopiedId] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [themes, setThemes] = useState<Record<string, AccountTheme>>({});

  // Quiz history state (пока не подключено к БД после миграции на Clerk/Neon)
  const [quizHistory] = useState<QuizHistoryItem[]>([]);
  const [isLoadingHistory] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    role: 'pupil' as UserRole,
    grade: '',
    course: '',
    institution: '',
    city: '',
    subject: '',
    experience: '',
  });

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (isLoading || !userId) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    void authFetch('/api/account', { signal: controller.signal }).then(async response => {
      const body = await response.json() as AccountAccessState & { error?: string };
      if (!response.ok) throw new Error(body.error || 'Не удалось проверить права доступа.');
      if (body.userId !== userId) throw new Error('Сессия изменилась. Повторите загрузку.');
      if (!cancelled) setAccountAccess(body);
    }).catch(reason => {
      if (!cancelled) setAccessError({ userId, attempt: accessAttempt, message: controller.signal.aborted ? 'Загрузка заняла слишком много времени. Попробуйте ещё раз.' : reason instanceof Error ? reason.message : 'Не удалось загрузить кабинет.' });
    }).finally(() => window.clearTimeout(timeout));
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timeout); };
  }, [authFetch, isLoading, userId, accessAttempt]);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        role: profile.role || 'pupil',
        grade: profile.grade?.toString() || '',
        course: profile.course?.toString() || '',
        institution: profile.institution || '',
        city: profile.city || '',
        subject: profile.subject || '',
        experience: profile.experience?.toString() || '',
      });
    }
  }, [profile]);

  if (isLoading || !user || accountAccess?.userId !== user.id) {
    const error = accessError && accessError.userId === userId && accessError.attempt === accessAttempt ? accessError.message : '';
    return <main className="account-page account-loading-page" aria-busy={!error}>
      <div className="account-loading-card">
        <div className={`account-loading-orbit${error ? ' stopped' : ''}`} aria-hidden="true"><span>✦</span></div>
        <span className="account-loading-eyebrow">PHYSEZ</span>
        <h1>{error ? 'Не удалось открыть кабинет' : 'Готовим ваш кабинет'}</h1>
        <p role={error ? 'alert' : 'status'}>{error || 'Загружаем профиль и ваши инструменты…'}</p>
        {error && <button className="account-btn account-btn-secondary" onClick={() => setAccessAttempt(value => value + 1)}>Попробовать снова</button>}
      </div>
    </main>;
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData(prev => ({
      ...prev,
      role,
      grade: '',
      course: '',
      institution: role === 'pupil' || role === 'student' || isEducatorRole(role) ? prev.institution : '',
      city: isEducatorRole(role) || role === 'tutor' ? prev.city : '',
      subject: isEducatorRole(role) || role === 'tutor' ? prev.subject : '',
      experience: isEducatorRole(role) || role === 'tutor' ? prev.experience : '',
    }));
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (identityLoading || identityError) { setMessage({ type: 'error', text: 'Сначала дождитесь загрузки данных профиля или повторите её.' }); return; }
    const clean = { lastName: identityDraft.lastName.trim(), firstName: identityDraft.firstName.trim(), group: identityDraft.group.trim() };
    const namePattern = /^[\p{L}\p{M} '’.-]+$/u;
    if (![clean.lastName, clean.firstName].every(name => name.length >= 2 && name.length <= 60 && namePattern.test(name))) { setMessage({ type: 'error', text: 'Укажите корректные фамилию и имя (от 2 до 60 символов).' }); return; }
    if (workProfile && !clean.group) { setMessage({ type: 'error', text: 'Укажите ОП для своего варианта.' }); return; }
    setIsSaving(true);
    setMessage(null);
    let identitySaved = false;
    try {
      const updateData: Record<string, unknown> = {
        full_name: `${clean.firstName} ${clean.lastName}`,
        first_name: clean.firstName,
        last_name: clean.lastName,
        role: formData.role,
      };

      if (formData.role === 'pupil') {
        if (formData.grade) updateData.grade = parseInt(formData.grade, 10);
        if (formData.institution) updateData.institution = formData.institution;
      }

      if (formData.role === 'student') {
        if (formData.course) updateData.course = parseInt(formData.course, 10);
        if (formData.institution) updateData.institution = formData.institution;
      }

      if (isEducatorRole(formData.role)) {
        if (formData.experience !== '') updateData.experience = parseInt(formData.experience, 10);
        if (formData.subject) updateData.subject = formData.subject;
        if (formData.institution) updateData.institution = formData.institution;
        if (formData.city) updateData.city = formData.city;
      }

      if (formData.role === 'tutor') {
        if (formData.experience !== '') updateData.experience = parseInt(formData.experience, 10);
        if (formData.subject) updateData.subject = formData.subject;
        if (formData.city) updateData.city = formData.city;
      }

      if (workProfile || clean.group) {
        let saved = (await studentRequest<{ profile: NonNullable<typeof workProfile> }>('/api/student-profile', { action: workProfile ? 'update' : 'create', student: clean }, authFetch)).profile;
        setWorkProfile(saved);
        identitySaved = true;
        if (!saved.accountLinked) {
          saved = (await studentRequest<{ profile: NonNullable<typeof workProfile> }>('/api/student-profile', { action: 'linkAccount' }, authFetch)).profile;
          setWorkProfile(saved);
        }
      }
      await updateProfile(updateData);
      setMessage({ type: 'success', text: 'Профиль сохранён' });
      setIsEditing(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: identitySaved ? 'ФИО и ОП сохранены. Остальные данные аккаунта сохранить не удалось — повторите сохранение.' : err instanceof Error ? err.message : 'Ошибка сохранения' });
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIdentityDraft(identity);
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        role: profile.role || 'pupil',
        grade: profile.grade?.toString() || '',
        course: profile.course?.toString() || '',
        institution: profile.institution || '',
        city: profile.city || '',
        subject: profile.subject || '',
        experience: profile.experience?.toString() || '',
      });
    }
    setIsEditing(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clerkUser) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Выберите изображение' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Максимальный размер 2MB' });
      return;
    }

    setIsUploadingAvatar(true);
    setMessage(null);

    try {
      await clerkUser.setProfileImage({ file });
      await clerkUser.reload();
      setMessage({ type: 'success', text: 'Фото обновлено' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Avatar upload error:', err);
      setMessage({ type: 'error', text: 'Ошибка загрузки фото' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const accessRoleLabel = accountAccess?.role === 'owner'
    ? 'Главный администратор'
    : accountAccess?.role === 'admin' ? 'Администратор' : 'Пользователь';
  const getRoleLabel = (role: UserRole) => {
    return ROLES.find(r => r.value === role)?.label || role;
  };

  // Get role-specific fields for display
  const getRoleFields = () => {
    const fields: { label: string; value: string }[] = [];

    if (formData.role === 'pupil') {
      if (profile?.grade) fields.push({ label: 'Класс', value: `${profile.grade} класс` });
      if (profile?.institution) fields.push({ label: 'Школа', value: profile.institution });
    }

    if (formData.role === 'student') {
      if (profile?.course) fields.push({ label: 'Курс', value: `${profile.course} курс` });
      if (profile?.institution) fields.push({ label: 'Учебное заведение', value: profile.institution });
    }

    if (formData.role === 'teacher') {
      if (profile?.experience !== undefined) fields.push({ label: 'Стаж', value: getExperienceLabel(profile.experience) });
      if (profile?.subject) fields.push({ label: 'Предмет', value: profile.subject });
      if (profile?.institution) fields.push({ label: 'Школа', value: profile.institution });
      if (profile?.city) fields.push({ label: 'Город', value: profile.city });
    }

    if (isUniversityRole(formData.role)) {
      if (profile?.experience !== undefined) fields.push({ label: 'Стаж', value: getExperienceLabel(profile.experience) });
      if (profile?.subject) fields.push({ label: 'Предмет', value: profile.subject });
      if (profile?.institution) fields.push({ label: 'ВУЗ', value: profile.institution });
      if (profile?.city) fields.push({ label: 'Город', value: profile.city });
    }

    if (formData.role === 'tutor') {
      if (profile?.experience !== undefined) fields.push({ label: 'Стаж', value: getExperienceLabel(profile.experience) });
      if (profile?.subject) fields.push({ label: 'Предмет', value: profile.subject });
      if (profile?.city) fields.push({ label: 'Город', value: profile.city });
    }

    return fields;
  };

  const renderEditFields = () => {
    switch (formData.role) {
      case 'pupil':
        return (
          <>
            <div className="account-field">
              <label className="account-label">Класс</label>
              <select
                className="account-select"
                value={formData.grade}
                onChange={(e) => handleInputChange('grade', e.target.value)}
              >
                <option value="">Выберите</option>
                {Array.from({ length: 6 }, (_, i) => i + 7).map(grade => (
                  <option key={grade} value={grade}>{grade} класс</option>
                ))}
              </select>
            </div>
            <div className="account-field">
              <label className="account-label">Школа</label>
              <input
                type="text"
                className="account-input"
                value={formData.institution}
                onChange={(e) => handleInputChange('institution', e.target.value)}
                placeholder="Название школы"
              />
            </div>
          </>
        );

      case 'student':
        return (
          <>
            <div className="account-field">
              <label className="account-label">Курс</label>
              <select
                className="account-select"
                value={formData.course}
                onChange={(e) => handleInputChange('course', e.target.value)}
              >
                <option value="">Выберите</option>
                {Array.from({ length: 6 }, (_, i) => i + 1).map(course => (
                  <option key={course} value={course}>{course} курс</option>
                ))}
              </select>
            </div>
            <div className="account-field">
              <label className="account-label">Учебное заведение</label>
              <input
                type="text"
                className="account-input"
                value={formData.institution}
                onChange={(e) => handleInputChange('institution', e.target.value)}
                placeholder="Университет/колледж"
              />
            </div>
          </>
        );

      case 'teacher':
      case 'lecturer':
      case 'assistant':
      case 'professor':
      case 'associate_professor':
      case 'lab_assistant':
        return (
          <>
            <div className="account-field">
              <label className="account-label">Стаж (лет)</label>
              <select
                className="account-select"
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
              >
                <option value="">Выберите</option>
                {EXPERIENCE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="account-field">
              <label className="account-label">Предмет</label>
              <input
                type="text"
                className="account-input"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
              />
            </div>
            <div className="account-field">
              <label className="account-label">
                {isUniversityRole(formData.role) ? 'ВУЗ' : 'Школа'}
              </label>
              <input
                type="text"
                className="account-input"
                value={formData.institution}
                onChange={(e) => handleInputChange('institution', e.target.value)}
              />
            </div>
            <div className="account-field">
              <label className="account-label">Город</label>
              <input
                type="text"
                className="account-input"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
              />
            </div>
          </>
        );

      case 'tutor':
        return (
          <>
            <div className="account-field">
              <label className="account-label">Стаж (лет)</label>
              <select
                className="account-select"
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
              >
                <option value="">Выберите</option>
                {EXPERIENCE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="account-field">
              <label className="account-label">Предмет</label>
              <input
                type="text"
                className="account-input"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
              />
            </div>
            <div className="account-field">
              <label className="account-label">Город</label>
              <input
                type="text"
                className="account-input"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const roleFields = getRoleFields();

  // Calculate stats
  const totalTests = quizHistory.length;
  const avgScore = totalTests > 0
    ? Math.round(quizHistory.reduce((sum, q) => sum + q.percentage, 0) / totalTests)
    : 0;
  const excellentTests = quizHistory.filter(q => q.percentage >= 80).length;

  // Profile completeness
  const getProfileCompleteness = () => {
    let filled = 0;
    let total = 2; // name, role

    if (profile?.full_name) filled++;
    if (profile?.role) filled++;

    if (profile?.role === 'pupil') {
      total += 2;
      if (profile.grade) filled++;
      if (profile.institution) filled++;
    } else if (profile?.role === 'student') {
      total += 2;
      if (profile.course) filled++;
      if (profile.institution) filled++;
    } else if (profile?.role && isEducatorRole(profile.role)) {
      total += 4;
      if (profile.experience !== undefined) filled++;
      if (profile.subject) filled++;
      if (profile.institution) filled++;
      if (profile.city) filled++;
    } else if (profile?.role === 'tutor') {
      total += 3;
      if (profile.experience !== undefined) filled++;
      if (profile.subject) filled++;
      if (profile.city) filled++;
    }

    return Math.round((filled / total) * 100);
  };

  const profileCompleteness = getProfileCompleteness();
  const accountTheme = accountAccess.isPremium ? themes[user.id] ?? storedTheme(user.id) : 'neutral';
  const chooseTheme = (theme: AccountTheme) => {
    if (!accountAccess.isPremium && theme !== 'simple') return;
    setThemes(current => ({ ...current, [user.id]: theme }));
    try { localStorage.setItem(`physez-account-theme:${user.id}`, theme); }
    catch { /* The theme remains usable when browser storage is unavailable. */ }
  };

  return (
    <motion.div
      className={`account-page account-dashboard ${accountAccess.isPremium ? 'account-tier-pro' : 'account-tier-basic'}`}
      data-account-theme={accountTheme}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="account-container">
        <header className="account-dashboard-heading">
          <div><span className="account-dashboard-eyebrow">ВАШЕ ПРОСТРАНСТВО</span><h1 className="account-title">Личный кабинет</h1></div>
          <div className="account-theme-picker" role="group" aria-label="Цветовая тема кабинета">
            <span>{accountAccess.isPremium ? 'Цвет настроения' : 'Цветные темы · PRO'}</span>
            <div>{ACCOUNT_THEMES.map(theme => { const selected = accountTheme === theme.id || (!accountAccess.isPremium && theme.id === 'simple'); return <button key={theme.id} type="button" className={`account-theme-choice account-theme-choice--${theme.id}`} disabled={!accountAccess.isPremium && theme.id !== 'simple'} aria-pressed={selected} title={accountAccess.isPremium || theme.id === 'simple' ? theme.name : `${theme.name} — доступно с PRO`} onClick={() => chooseTheme(theme.id)}><i aria-hidden="true"/>{theme.name}<b aria-hidden="true">✓</b></button>; })}</div>
          </div>
        </header>

        {message && (
          <div className={`account-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="account-grid">
          {/* Profile Section - Top Left */}
          <section className="account-section account-profile-section">
            <div className="account-section-heading">
              <div><span>Учетная запись</span><h2 className="account-section-title">Профиль</h2></div>
              {!isEditing && <button className="account-edit-trigger" disabled={identityLoading || !!identityError} onClick={() => { setIdentityDraft(identity); setIsEditing(true); }}>Редактировать</button>}
            </div>

            <div className="account-profile-header">
              <div className="account-avatar-wrapper" role="button" tabIndex={0} aria-label="Изменить фотографию профиля" onClick={handleAvatarClick} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleAvatarClick(); } }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="account-avatar" />
                ) : (
                  <div className="account-avatar-placeholder">
                    {profile?.full_name?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="account-avatar-overlay">
                  {isUploadingAvatar ? (
                    <span style={{ color: 'white', fontSize: '0.75rem' }}>...</span>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="account-avatar-input"
                  onChange={handleAvatarChange}
                />
              </div>
              <div>
                {accountAccess && <span className="account-membership-badge">{accountAccess.isPremium ? '✦ PHYSEZ PRO' : 'БАЗОВЫЙ ДОСТУП'}</span>}
                <div className="account-profile-name-row">
                  <div className="account-profile-name">{[identity.firstName, identity.lastName].filter(Boolean).join(' ') || profile?.full_name || 'Не указано'}</div>
                </div>
                <div className="account-profile-email">{user.email}</div>
              </div>
            </div>

            <div className={`account-profile-info ${isEditing ? 'editing' : 'readonly'}`}>
              <AccountStudentIdentity editing={isEditing} value={isEditing ? identityDraft : identity} onChange={setIdentityDraft} variantNumber={workProfile?.variantNumber} loading={identityLoading} error={identityError} onRetry={() => void refreshIdentity()} />
              {isEditing ? (
                <>
                  <div className="account-field">
                    <label className="account-label">Роль в образовании</label>
                    <select
                      className="account-select"
                      value={formData.role}
                      onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    >
                      {ROLES.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>
                  {renderEditFields()}
                </>
              ) : (
                <>
                  <div className="account-field">
                    <label className="account-label">Роль в образовании</label>
                    <div className="account-value">{getRoleLabel(profile?.role || 'pupil')}</div>
                  </div>
                  {roleFields.map((field, i) => (
                    <div key={i} className="account-field">
                      <label className="account-label">{field.label}</label>
                      <div className="account-value">{field.value}</div>
                    </div>
                  ))}
                </>
              )}
            </div>


            <div className="account-profile-access">
              <div>
                <span>Доступ к платформе</span>
                <strong>{accountAccess ? accessRoleLabel : 'Проверяем права…'}</strong>
                <small>
                  {accountAccess?.role === 'owner'
                    ? 'Управление платформой, администраторами и всеми инструментами.'
                    : accountAccess?.role === 'admin'
                      ? 'Мониторинг контрольных и инструменты преподавателя.'
                      : accountAccess?.isPremium
                        ? 'Инструменты преподавателя и возможности PRO.'
                        : 'Бесплатные материалы платформы.'}
                </small>
              </div>
              {accountAccess && <em className={accountAccess.isPremium ? 'pro' : ''}>{accountAccess.isPremium ? 'PRO' : 'FREE'}</em>}
            </div>

            {accountAccess && (
              <details className="account-technical-details account-profile-details">
                <summary>Данные аккаунта</summary>
                <button type="button" className="account-access-id" onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(accountAccess.userId);
                    setCopiedId(true);
                    window.setTimeout(() => setCopiedId(false), 1600);
                  } catch {
                    setMessage({ type: 'error', text: 'Не удалось скопировать ID. Выделите его вручную.' });
                  }
                }}>
                  <span>Clerk ID</span><code>{accountAccess.userId}</code><em>{copiedId ? 'Скопировано' : 'Копировать'}</em>
                </button>
              </details>
            )}

            {/* Stats */}
            {quizHistory.length > 0 && <div className="account-stats">
              <div className="account-stat">
                <div className="account-stat-value">{totalTests}</div>
                <div className="account-stat-label">Тестов пройдено</div>
              </div>
              <div className="account-stat">
                <div className="account-stat-value">{avgScore}%</div>
                <div className="account-stat-label">Средний балл</div>
              </div>
              <div className="account-stat">
                <div className="account-stat-value">{excellentTests}</div>
                <div className="account-stat-label">Отличных</div>
              </div>
            </div>}

            {/* Profile completeness */}
            {profileCompleteness < 100 && (
              <div className="account-completeness">
                <div className="account-completeness-header">
                  <span>Профиль заполнен</span>
                  <span>{profileCompleteness}%</span>
                </div>
                <div className="account-completeness-bar">
                  <div
                    className="account-completeness-progress"
                    style={{ width: `${profileCompleteness}%` }}
                  />
                </div>
              </div>
            )}

            <div className="account-actions">
              {isEditing ? (
                <>
                  <button
                    className="account-btn account-btn-primary"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button
                    className="account-btn account-btn-secondary"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    Отмена
                  </button>
                </>
              ) : null}
            </div>
          </section>

          {/* Subscription */}
          <section className="account-section account-subscription">
            <AccountAccess access={accountAccess} />
          </section>

          {/* Quiz History */}
          <section className="account-section account-history-section" hidden={!isLoadingHistory && quizHistory.length === 0}>
            <div className="account-section-heading"><div><span>Активность</span><h2 className="account-section-title">История тестов</h2></div></div>

            {isLoadingHistory ? (
              <div className="account-history-loading">Загрузка...</div>
            ) : quizHistory.length === 0 ? (
              <div className="account-history-empty">
                <p>История тестов в кабинете пока не подключена</p>
                <p className="account-history-hint">Результаты контрольного среза доступны на странице работы, а преподавателю — в мониторинге.</p>
              </div>
            ) : (
              <div className="account-history-list">
                {quizHistory.map((item) => (
                  <div key={item.id} className="account-history-item">
                    <div className="account-history-info">
                      <span className="account-history-type">
                        {item.quiz_type === 'pre_quiz' ? 'Входной тест' :
                         item.quiz_type === 'post_quiz' ? 'Итоговый тест' :
                         item.topic_name || 'Тест по теме'}
                      </span>
                      <span className="account-history-date">
                        {new Date(item.created_at).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="account-history-result">
                      <span className="account-history-score">
                        {item.score}/{item.total_questions}
                      </span>
                      <span className={`account-history-percentage ${
                        item.percentage >= 80 ? 'excellent' :
                        item.percentage >= 60 ? 'good' :
                        item.percentage >= 40 ? 'satisfactory' : 'poor'
                      }`}>
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Logout - spans remaining space or new row on mobile */}
          <section className="account-section account-section-danger">
            <button className="account-btn account-btn-danger" onClick={handleSignOut}>
              Выйти из аккаунта
            </button>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
