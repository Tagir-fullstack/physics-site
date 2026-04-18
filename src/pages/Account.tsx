import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getQuizHistory, type QuizHistoryItem, supabase } from '../lib/supabase';
import type { UserRole } from '../types/auth';
import '../styles/account.css';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'pupil', label: 'Школьник' },
  { value: 'student', label: 'Студент' },
  { value: 'teacher', label: 'Учитель' },
  { value: 'tutor', label: 'Репетитор' },
];

export default function Account() {
  const { user, profile, subscription, isPremium, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Quiz history state
  const [quizHistory, setQuizHistory] = useState<QuizHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

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
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

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

  // Загрузка истории тестов
  useEffect(() => {
    async function loadQuizHistory() {
      if (!profile?.id) {
        setIsLoadingHistory(false);
        return;
      }

      try {
        const history = await getQuizHistory(profile.id);
        setQuizHistory(history);
      } catch (err) {
        console.error('Error loading quiz history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadQuizHistory();
  }, [profile?.id]);

  if (!user) {
    return null;
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
      institution: role === 'pupil' || role === 'student' || role === 'teacher' ? prev.institution : '',
      city: role === 'teacher' || role === 'tutor' ? prev.city : '',
      subject: role === 'teacher' || role === 'tutor' ? prev.subject : '',
      experience: role === 'teacher' || role === 'tutor' ? prev.experience : '',
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const updateData: Record<string, unknown> = {
        full_name: formData.full_name,
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

      if (formData.role === 'teacher') {
        if (formData.experience) updateData.experience = parseInt(formData.experience, 10);
        if (formData.subject) updateData.subject = formData.subject;
        if (formData.institution) updateData.institution = formData.institution;
        if (formData.city) updateData.city = formData.city;
      }

      if (formData.role === 'tutor') {
        if (formData.experience) updateData.experience = parseInt(formData.experience, 10);
        if (formData.subject) updateData.subject = formData.subject;
        if (formData.city) updateData.city = formData.city;
      }

      await updateProfile(updateData);
      setMessage({ type: 'success', text: 'Профиль сохранён' });
      setIsEditing(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка сохранения' });
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
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
    if (!file || !user || !supabase) return;

    // Validate file
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      await updateProfile({ avatar_url: publicUrl });
      setMessage({ type: 'success', text: 'Фото обновлено' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Avatar upload error:', err);
      setMessage({ type: 'error', text: 'Ошибка загрузки фото' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const getPlanInfo = () => {
    if (!subscription) {
      return { name: 'Бесплатный', description: 'Базовый доступ к анимациям' };
    }
    switch (subscription.plan) {
      case 'teacher':
        return { name: 'Учитель', description: 'Полный доступ + КТП/КСП документы' };
      case 'premium':
        return { name: 'Premium', description: 'Расширенный доступ ко всем функциям' };
      default:
        return { name: 'Бесплатный', description: 'Базовый доступ к анимациям' };
    }
  };

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
      if (profile?.experience) fields.push({ label: 'Стаж', value: `${profile.experience} лет` });
      if (profile?.subject) fields.push({ label: 'Предмет', value: profile.subject });
      if (profile?.institution) fields.push({ label: 'Школа', value: profile.institution });
      if (profile?.city) fields.push({ label: 'Город', value: profile.city });
    }

    if (formData.role === 'tutor') {
      if (profile?.experience) fields.push({ label: 'Стаж', value: `${profile.experience} лет` });
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
        return (
          <>
            <div className="account-field">
              <label className="account-label">Стаж (лет)</label>
              <input
                type="number"
                min="0"
                max="50"
                className="account-input"
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
              />
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
              <label className="account-label">Школа</label>
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
              <input
                type="number"
                min="0"
                max="50"
                className="account-input"
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
              />
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

  const planInfo = getPlanInfo();
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
    } else if (profile?.role === 'teacher') {
      total += 4;
      if (profile.experience) filled++;
      if (profile.subject) filled++;
      if (profile.institution) filled++;
      if (profile.city) filled++;
    } else if (profile?.role === 'tutor') {
      total += 3;
      if (profile.experience) filled++;
      if (profile.subject) filled++;
      if (profile.city) filled++;
    }

    return Math.round((filled / total) * 100);
  };

  const profileCompleteness = getProfileCompleteness();

  return (
    <motion.div
      className="account-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="account-container">
        <h1 className="account-title">Личный кабинет</h1>

        {message && (
          <div className={`account-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="account-grid">
          {/* Profile Section - Top Left */}
          <section className="account-section account-profile-section">
            <h2 className="account-section-title">Профиль</h2>

            <div className="account-profile-header">
              <div className="account-avatar-wrapper" onClick={handleAvatarClick}>
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
                <div className="account-profile-name">{profile?.full_name || 'Не указано'}</div>
                <div className="account-profile-email">{user.email}</div>
              </div>
            </div>

            <div className="account-profile-info">
              {isEditing ? (
                <>
                  <div className="account-field">
                    <label className="account-label">Имя</label>
                    <input
                      type="text"
                      className="account-input"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      placeholder="Введите имя"
                    />
                  </div>
                  <div className="account-field">
                    <label className="account-label">Роль</label>
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
                    <label className="account-label">Роль</label>
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

            {/* Stats */}
            <div className="account-stats">
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
            </div>

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
                  >
                    Отмена
                  </button>
                </>
              ) : (
                <button
                  className="account-btn account-btn-secondary"
                  onClick={() => setIsEditing(true)}
                >
                  Редактировать
                </button>
              )}
            </div>
          </section>

          {/* Subscription */}
          <section className="account-section account-subscription">
            <h2 className="account-section-title">Подписка</h2>

            <div className="account-plan">
              <div className="account-plan-header">
                <span className="account-plan-name">{planInfo.name}</span>
                {isPremium && <span className="account-plan-badge">Активна</span>}
              </div>
              <p className="account-plan-description">{planInfo.description}</p>
            </div>

            {!isPremium && (
              <div className="account-upgrade">
                <p className="account-upgrade-text">
                  Хотите получить доступ к дополнительным функциям?
                </p>
                <button className="account-btn account-btn-premium" disabled>
                  Скоро
                </button>
              </div>
            )}
          </section>

          {/* Quiz History */}
          <section className="account-section account-history-section">
            <h2 className="account-section-title">История тестов</h2>

            {isLoadingHistory ? (
              <div className="account-history-loading">Загрузка...</div>
            ) : quizHistory.length === 0 ? (
              <div className="account-history-empty">
                <p>Вы ещё не проходили тесты</p>
                <p className="account-history-hint">После прохождения тестов здесь появится история</p>
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
